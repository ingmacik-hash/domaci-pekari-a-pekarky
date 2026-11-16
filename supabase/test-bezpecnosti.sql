-- =====================================================================
-- Test bezpečnostných pravidiel. Spusti v Supabase: SQL Editor → vlož celý súbor → Run.
-- Vytvorí dočasných testovacích používateľov, všetko overí a na konci
-- všetky zmeny VRÁTI – v databáze nič neostane.
-- Výsledok sa zobrazí ako červená „chybová“ správa: prvý riadok má byť
-- „VŠETKY TESTY PREŠLI ✅“. (Správa je zámerná – vďaka nej sa všetko vráti späť.)
-- =====================================================================
begin;

create table public._test_vysledky (poradie serial primary key, test text, ok boolean);
grant all on public._test_vysledky to anon, authenticated;
grant all on sequence public._test_vysledky_poradie_seq to anon, authenticated;

-- testovací používatelia: A = admin (Google), B = Peťka, C = nový bez mena, D = falošný admin (heslo, nie Google)
insert into auth.users (id, email, aud, role, raw_app_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ing.macik@gmail.com', 'authenticated', 'authenticated', '{"provider":"google"}'),
  ('00000000-0000-0000-0000-00000000000b', 'peta@test.sk',        'authenticated', 'authenticated', '{"provider":"google"}'),
  ('00000000-0000-0000-0000-00000000000c', 'jano@test.sk',        'authenticated', 'authenticated', '{"provider":"google"}'),
  ('00000000-0000-0000-0000-00000000000d', 'ing.macik+x@gmail.com', 'authenticated', 'authenticated', '{"provider":"email"}');
update public.profiles set public_name = 'Test Admin' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set public_name = 'Test Peťka' where id = '00000000-0000-0000-0000-00000000000b';

insert into public._test_vysledky (test, ok) select 'profil sa vytvoril automaticky pri registrácii',
  (select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-00000000000%') = 4;

-- ---------- používateľ B ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","email":"peta@test.sk","role":"authenticated","app_metadata":{"provider":"google"}}';

insert into public.favorites (recipe_id) values ('kvaskovy-chlieb'), ('rozky');
insert into public._test_vysledky (test, ok) select 'B vidí svoje 2 obľúbené', (select count(*) from public.favorites) = 2;
insert into public._test_vysledky (test, ok) select 'B nie je admin', not public.is_admin();

-- B sa pokúsi pridať recept rovno ako schválený -> musí ostať "pending"
insert into public.recipes (id, title, category, description, ingredients, steps, time_minutes, difficulty, servings, servings_unit, status, photos)
values ('00000000-0000-0000-0000-0000000000b1', 'Test chlieb B', 'Chlieb', 'Testovací recept používateľa B.',
        '[{"amount":500,"unit":"g","name":"múka"}]', '["Krok"]', 60, 'Ľahká', 1, 'bochník', 'approved',
        array['00000000-0000-0000-0000-00000000000b/00000000-0000-0000-0000-0000000000b1/1.jpg']);
insert into public._test_vysledky (test, ok) select 'recept od B čaká na schválenie (nedá sa obísť)',
  (select status from public.recipes where id = '00000000-0000-0000-0000-0000000000b1') = 'pending';

-- B sa pokúsi recept schváliť sám
update public.recipes set status = 'approved' where id = '00000000-0000-0000-0000-0000000000b1';
insert into public._test_vysledky (test, ok) select 'B si nemôže recept sám schváliť',
  (select status from public.recipes where id = '00000000-0000-0000-0000-0000000000b1') = 'pending';

-- B nesmie dať fotku do cudzieho priečinka
do $$ begin
  insert into public.recipes (title, category, description, ingredients, steps, time_minutes, difficulty, servings, servings_unit, photos)
  values ('Zlá fotka', 'Chlieb', 'Fotka v cudzom priečinku.', '[{"name":"x"}]', '["x"]', 5, 'Ľahká', 1, 'ks',
          array['00000000-0000-0000-0000-00000000000c/cudzie/1.jpg']);
  insert into public._test_vysledky (test, ok) values ('fotka v cudzom priečinku je zakázaná', false);
exception when others then
  insert into public._test_vysledky (test, ok) values ('fotka v cudzom priečinku je zakázaná', true);
end $$;

-- zdieľaný odkaz B
insert into public.shared_lists default values;
insert into public._test_vysledky (test, ok) select 'B má zdieľaný odkaz', (select count(*) from public.shared_lists) = 1;

-- ---------- používateľ C (bez verejného mena) ----------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","email":"jano@test.sk","role":"authenticated","app_metadata":{"provider":"google"}}';

insert into public._test_vysledky (test, ok) select 'C nevidí obľúbené používateľa B', (select count(*) from public.favorites) = 0;
insert into public._test_vysledky (test, ok) select 'C nevidí čakajúci recept používateľa B',
  (select count(*) from public.recipes where id = '00000000-0000-0000-0000-0000000000b1') = 0;
insert into public._test_vysledky (test, ok) select 'C nevidí zdieľaný odkaz (token) používateľa B', (select count(*) from public.shared_lists) = 0;

do $$ begin
  insert into public.recipes (title, category, description, ingredients, steps, time_minutes, difficulty, servings, servings_unit)
  values ('Recept C', 'Chlieb', 'Recept bez verejného mena.', '[{"name":"x"}]', '["x"]', 5, 'Ľahká', 1, 'ks');
  insert into public._test_vysledky (test, ok) values ('bez verejného mena sa recept pridať nedá', false);
exception when others then
  insert into public._test_vysledky (test, ok) values ('bez verejného mena sa recept pridať nedá', true);
end $$;

do $$ begin
  update public.profiles set public_name = 'test peťka' where id = auth.uid();   -- rovnaké meno ako B (iné veľké/malé písmená)
  insert into public._test_vysledky (test, ok) values ('verejné meno musí byť jedinečné', false);
exception when unique_violation then
  insert into public._test_vysledky (test, ok) values ('verejné meno musí byť jedinečné', true);
end $$;

update public.favorites set user_id = auth.uid() where recipe_id = 'kvaskovy-chlieb';   -- pokus ukradnúť cudzie obľúbené
delete from public.favorites;                                                            -- pokus zmazať cudzie obľúbené

-- ---------- falošný admin D (e-mail/heslo, nie Google) ----------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","email":"ing.macik@gmail.com","role":"authenticated","app_metadata":{"provider":"email"}}';
insert into public._test_vysledky (test, ok) select 'admin e-mail bez prihlásenia cez Google NIE JE admin', not public.is_admin();

-- ---------- návštevník bez prihlásenia ----------
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into public._test_vysledky (test, ok) select 'návštevník nevidí čakajúce recepty',
  (select count(*) from public.recipes where status <> 'approved') = 0;
insert into public._test_vysledky (test, ok) select 'návštevník nevidí žiadne obľúbené', (select count(*) from public.favorites) = 0;
insert into public._test_vysledky (test, ok) select 'zdieľaný zoznam B otvorí ktokoľvek s odkazom',
  (select cardinality(recipe_ids) from public.get_shared_list(
     (select token from public.shared_lists where user_id = '00000000-0000-0000-0000-00000000000b'))) = 2;

-- ---------- admin A ----------
reset role;
insert into public._test_vysledky (test, ok) select 'obľúbené B ostali nedotknuté (C ich nemohol zmeniť)',
  (select count(*) from public.favorites where user_id = '00000000-0000-0000-0000-00000000000b') = 2;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","email":"ing.macik@gmail.com","role":"authenticated","app_metadata":{"provider":"google"}}';

insert into public._test_vysledky (test, ok) select 'A je admin', public.is_admin();
insert into public._test_vysledky (test, ok) select 'admin vidí čakajúci recept',
  (select count(*) from public.recipes where id = '00000000-0000-0000-0000-0000000000b1') = 1;
update public.recipes set title = 'Test chlieb B (upravený adminom)' where id = '00000000-0000-0000-0000-0000000000b1';
insert into public._test_vysledky (test, ok) select 'admin môže recept upraviť pred zverejnením',
  (select title from public.recipes where id = '00000000-0000-0000-0000-0000000000b1') like '%upravený adminom%';
update public.recipes set status = 'approved' where id = '00000000-0000-0000-0000-0000000000b1';
insert into public._test_vysledky (test, ok) select 'admin môže recept schváliť',
  (select status from public.recipes where id = '00000000-0000-0000-0000-0000000000b1') = 'approved';

insert into public.recipes (title, category, description, ingredients, steps, time_minutes, difficulty, servings, servings_unit)
values ('Recept admina', 'Chlieb', 'Recept administrátora sa zverejní hneď.', '[{"name":"x"}]', '["x"]', 5, 'Ľahká', 1, 'ks');
insert into public._test_vysledky (test, ok) select 'recept admina je zverejnený hneď',
  (select status from public.recipes where title = 'Recept admina') = 'approved';

-- ---------- návštevník vidí schválený recept aj s menom autora ----------
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into public._test_vysledky (test, ok) select 'po schválení recept vidí každý (aj meno autora)',
  (select author_name from public.recipes_public where id = '00000000-0000-0000-0000-0000000000b1') = 'Test Peťka';

-- ---------- B zmaže účet (GDPR) ----------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","email":"peta@test.sk","role":"authenticated","app_metadata":{"provider":"google"}}';
select public.delete_my_account();
reset role;
insert into public._test_vysledky (test, ok) select 'po zmazaní účtu B: účet, profil, obľúbené a odkaz sú preč',
  not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000b')
  and not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000b')
  and not exists (select 1 from public.favorites where user_id = '00000000-0000-0000-0000-00000000000b')
  and not exists (select 1 from public.shared_lists where user_id = '00000000-0000-0000-0000-00000000000b');
insert into public._test_vysledky (test, ok) select 'zverejnený recept B ostal, ale bez autora',
  (select author_id is null from public.recipes where id = '00000000-0000-0000-0000-0000000000b1');

-- Výsledky sa vypíšu ako „chybová“ správa – tá zároveň vráti VŠETKY zmeny späť.
do $$
declare zle int; zoznam text;
begin
  select count(*) filter (where ok is not true),
         string_agg(case when ok then '✅ ' else '❌ ' end || test, E'\n' order by poradie)
    into zle, zoznam
  from public._test_vysledky;
  raise exception E'%\n\n%\n\n(Toto nie je chyba – test schválne skončí touto správou, aby sa všetky testovacie údaje vrátili späť.)',
    case when zle = 0 then 'VŠETKY TESTY PREŠLI ✅' else 'POZOR: ZLYHALO TESTOV: ' || zle end, zoznam;
end $$;
