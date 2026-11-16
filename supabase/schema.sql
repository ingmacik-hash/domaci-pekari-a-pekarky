-- =====================================================================
-- Domáci pekári a pekárky – databáza v Supabase
-- Spusti celý súbor raz v Supabase: SQL Editor → New query → vlož → Run.
-- Súbor sa dá spustiť aj opakovane (napr. po úprave), nič nezduplikuje.
--
-- Bezpečnosť stojí na pravidlách v databáze (Row Level Security),
-- nie na kóde stránky. Verejný (anon) kľúč na stránke je preto v poriadku.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Administrátori (e-maily z Google účtu). Ďalšieho admina pridáš:
--   insert into public.admins (email) values ('niekto@gmail.com');
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;  -- bez pravidiel = nikto ju nečíta zo stránky
insert into public.admins (email) values ('ing.macik@gmail.com') on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  -- admin sa musí prihlásiť cez Google (e-mail overený Googlom), nie heslom
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google';
$$;

-- ---------------------------------------------------------------------
-- Profily: verejné meno používateľa. Meno, e-mail ani fotku z Googlu
-- verejne nezobrazujeme – len public_name.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  public_name text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint public_name_format check (
    public_name is null or (
      public_name = btrim(public_name)
      and char_length(public_name) between 3 and 30
      and public_name ~ '^[A-Za-z0-9ÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýžĚŘŮŠěřůöüÖÜßąęłńśźżĄĘŁŃŚŹŻ ._-]+$'
    )
  )
);
create unique index if not exists profiles_public_name_unique on public.profiles (lower(public_name));
alter table public.profiles enable row level security;

drop policy if exists "profily čítať môže každý" on public.profiles;
create policy "profily čítať môže každý" on public.profiles for select using (true);
drop policy if exists "vlastný profil vytvoriť" on public.profiles;
create policy "vlastný profil vytvoriť" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "vlastný profil upraviť" on public.profiles;
create policy "vlastný profil upraviť" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- profil sa vytvorí automaticky pri prvom prihlásení cez Google
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Recepty od používateľov
-- ---------------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete set null,   -- po zmazaní účtu ostane schválený recept bez autora
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (char_length(reject_reason) <= 1000),
  title text not null check (char_length(title) between 3 and 120),
  category text not null check (char_length(category) between 2 and 60),
  description text not null check (char_length(description) between 10 and 600),
  ingredients jsonb not null check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) between 1 and 40),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 30),
  time_minutes int not null check (time_minutes between 1 and 10080),
  difficulty text not null check (difficulty in ('Ľahká', 'Stredná', 'Náročná')),
  servings numeric not null check (servings > 0 and servings <= 1000),
  servings_unit text not null check (char_length(servings_unit) between 1 and 30),
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists recipes_status_idx on public.recipes (status, created_at desc);
create index if not exists recipes_author_idx on public.recipes (author_id);
alter table public.recipes enable row level security;

drop policy if exists "recepty čítať" on public.recipes;
create policy "recepty čítať" on public.recipes for select
  using (status = 'approved' or author_id = auth.uid() or public.is_admin());
drop policy if exists "recept pridať" on public.recipes;
create policy "recept pridať" on public.recipes for insert
  with check (auth.uid() is not null and author_id = auth.uid());
drop policy if exists "recept upravovať môže len admin" on public.recipes;
create policy "recept upravovať môže len admin" on public.recipes for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "recept zmazať" on public.recipes;
create policy "recept zmazať" on public.recipes for delete
  using (public.is_admin() or (author_id = auth.uid() and status <> 'approved'));

-- Pri pridaní: autor = prihlásený, stav = čaká (admin = hneď schválený),
-- fotky musia byť v priečinku autora a receptu, autor musí mať verejné meno.
create or replace function public.recipes_before_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
declare p text;
begin
  if auth.uid() is null then raise exception 'Musíš byť prihlásený.'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and public_name is not null) then
    raise exception 'Najprv si vytvor verejné meno.';
  end if;
  new.author_id := auth.uid();
  new.created_at := now();
  new.updated_at := now();
  if public.is_admin() then
    new.status := 'approved';
    new.reviewed_at := now();
  else
    new.status := 'pending';
    new.reviewed_at := null;
  end if;
  new.reject_reason := null;
  foreach p in array new.photos loop
    if p not like auth.uid()::text || '/' || new.id::text || '/%' then
      raise exception 'Neplatná cesta k fotke.';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists recipes_before_insert on public.recipes;
create trigger recipes_before_insert before insert on public.recipes
  for each row execute function public.recipes_before_insert();

create or replace function public.recipes_before_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- pri mazaní účtu databáza odpojí autora od schválených receptov – to je povolené
  if current_setting('pekari.mazanie_uctu', true) = '1' then return new; end if;
  if not public.is_admin() then raise exception 'Recept môže upravovať len administrátor.'; end if;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.reviewed_at := now();
  end if;
  if new.status <> 'rejected' then new.reject_reason := null; end if;
  return new;
end;
$$;
drop trigger if exists recipes_before_update on public.recipes;
create trigger recipes_before_update before update on public.recipes
  for each row execute function public.recipes_before_update();

-- schválené recepty aj s verejným menom autora (pre stránku)
create or replace view public.recipes_public
with (security_invoker = true) as
  select r.id, r.title, r.category, r.description, r.ingredients, r.steps, r.time_minutes,
         r.difficulty, r.servings, r.servings_unit, r.photos, r.created_at, r.status,
         r.reject_reason, r.author_id, p.public_name as author_name
  from public.recipes r
  left join public.profiles p on p.id = r.author_id;

-- ---------------------------------------------------------------------
-- Obľúbené recepty prihlásených (id receptu: text zo súboru recipes.js alebo uuid z databázy)
-- ---------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id text not null check (char_length(recipe_id) between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
alter table public.favorites enable row level security;
drop policy if exists "vlastné obľúbené" on public.favorites;
create policy "vlastné obľúbené" on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Zdieľaný zoznam obľúbených: jeden odkaz (token) na používateľa
-- ---------------------------------------------------------------------
create table if not exists public.shared_lists (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  created_at timestamptz not null default now()
);
alter table public.shared_lists enable row level security;
drop policy if exists "vlastný zdieľaný odkaz" on public.shared_lists;
create policy "vlastný zdieľaný odkaz" on public.shared_lists for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and public_name is not null)
  );

-- Ktokoľvek s odkazom uvidí verejné meno a zoznam id receptov – nič viac.
create or replace function public.get_shared_list(p_token text)
returns table (public_name text, recipe_ids text[])
language sql stable security definer set search_path = public
as $$
  select p.public_name,
         coalesce(array(select f.recipe_id from public.favorites f
                        where f.user_id = s.user_id order by f.created_at), '{}')
  from public.shared_lists s
  join public.profiles p on p.id = s.user_id
  where s.token = p_token and p.public_name is not null;
$$;

-- ---------------------------------------------------------------------
-- Zmazanie vlastného účtu (GDPR). Schválené recepty ostanú bez autora,
-- neschválené sa zmažú. Fotky neschválených receptov zmaže stránka pred volaním.
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Musíš byť prihlásený.'; end if;
  perform set_config('pekari.mazanie_uctu', '1', true);   -- platí len do konca tejto transakcie
  delete from public.recipes where author_id = uid and status <> 'approved';
  delete from auth.users where id = uid;   -- profil, obľúbené a zdieľaný odkaz sa zmažú s ním
end;
$$;

-- prístup k funkciám zo stránky
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.get_shared_list(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant select on public.recipes_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- Úložisko fotiek: verejne čitateľné, nahrávať môže prihlásený len do
-- svojho priečinka <id používateľa>/<id receptu>/..., admin kamkoľvek.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png'];

drop policy if exists "fotky nahrať do svojho priečinka" on storage.objects;
create policy "fotky nahrať do svojho priečinka" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
drop policy if exists "fotky zmazať vo svojom priečinku" on storage.objects;
create policy "fotky zmazať vo svojom priečinku" on storage.objects for delete to authenticated
  using (
    bucket_id = 'recipe-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
drop policy if exists "fotky vidieť vo svojom priečinku" on storage.objects;
create policy "fotky vidieť vo svojom priečinku" on storage.objects for select to authenticated
  using (
    bucket_id = 'recipe-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
