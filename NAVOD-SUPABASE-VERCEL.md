# Návod: prihlasovanie cez Google, Supabase a Vercel

Tento návod zapne používateľskú sekciu, teda prihlásenie cez Google, obľúbené v účte, pridávanie receptov a schvaľovanie.
Celé nastavenie trvá asi 30 minút. Kým ho nedokončíš, web funguje ako doteraz, len prihlásenie ukazuje „pripravujeme“.

V návode nahraď:
- `TVOJ-WEB.vercel.app` adresou webu na Verceli (alebo vlastnou doménou),
- `XXXX.supabase.co` adresou projektu Supabase (nájdeš ju v kroku 2).

---

## 1. Vytvor Supabase cez Vercel

1. Otvor [vercel.com](https://vercel.com) → svoj projekt **domaci-pekari-a-pekarky**.
2. Hore klikni na záložku **Storage** → **Create Database** (alebo **Connect Store**) → vyber **Supabase** → **Continue**.
3. Názov: napr. `domaci-pekari`. **Región: Frankfurt (eu-central-1)**. Je to dôležité kvôli GDPR, údaje tak ostanú v EÚ.
4. Plán **Free** → **Create**.
5. Prepoj databázu s projektom pre všetky prostredia (Production, Preview, Development) → **Connect**.

Vercel tým sám nastaví premenné prostredia, napríklad `PUBLIC_SUPABASE_URL` a `PUBLIC_SUPABASE_ANON_KEY`.
Predpona môže byť aj iná (`NEXT_PUBLIC_` alebo žiadna), web si ich nájde v každom prípade.
Pri každom nasadení si ich web prečíta (súbor `scripts/vytvor-config.js`) a kľúče netreba nikam kopírovať.

> Tajný kľúč `SUPABASE_SERVICE_ROLE_KEY` sa na stránku nikdy nedostane. Skript to stráži a nasadenie by radšej zastavil.

## 2. Vytvor tabuľky v databáze

1. Vo Verceli v záložke **Storage** klikni na databázu → **Open in Supabase**.
2. Vľavo **SQL Editor** → **New query**.
3. Otvor súbor [`supabase/schema.sql`](supabase/schema.sql), skopíruj **celý obsah**, vlož ho a klikni **Run**. Má sa zobraziť „Success. No rows returned“.
4. **Kontrola bezpečnosti:** znova **New query**, vlož celý súbor [`supabase/test-bezpecnosti.sql`](supabase/test-bezpecnosti.sql) a daj **Run**.
   Zobrazí sa červená správa. **Je to v poriadku**: prvý riadok má byť **„VŠETKY TESTY PREŠLI ✅“**.
   Test schválne skončí touto správou, aby sa všetky testovacie údaje vrátili späť. Ak niektorý riadok začína ❌, pošli mi celú správu.
5. Poznač si adresu projektu: **Project Settings → Data API → Project URL**, napr. `https://XXXX.supabase.co`.

## 3. Prihlasovanie cez Google (Google Cloud)

1. Otvor [console.cloud.google.com](https://console.cloud.google.com) a prihlás sa účtom **ing.macik@gmail.com**.
2. Hore vyber **Select a project → New project** → názov `Domaci pekari` → **Create**.
3. Menu → **APIs & Services → OAuth consent screen** (alebo **Google Auth Platform**) → **Get started**:
   - **App name:** Domáci pekári a pekárky
   - **User support email:** tvoj e-mail
   - **Audience:** **External**
   - **Contact information:** tvoj e-mail → **Create**
4. **Branding** (vzhľad):
   - **App logo:** môžeš nahrať `icons/icon-512.png`
   - **Application home page:** `https://TVOJ-WEB.vercel.app`
   - **Privacy policy link:** `https://TVOJ-WEB.vercel.app/#/ochrana-osobnych-udajov`
   - **Authorized domains:** `vercel.app` (alebo tvoja doména) a `supabase.co`
5. **Clients → Create client**:
   - **Application type:** Web application
   - **Name:** Domáci pekári web
   - **Authorized JavaScript origins:** `https://TVOJ-WEB.vercel.app`
   - **Authorized redirect URIs:** `https://XXXX.supabase.co/auth/v1/callback`
     (presnú adresu nájdeš aj v Supabase v kroku 4 pri Google, pole „Callback URL“)
   - **Create** → skopíruj **Client ID** a **Client secret**.
6. **Audience → Publish app → Confirm.** Aplikácia prejde do stavu „In production“.
   Pri e-maile a mene (základné údaje) to Google nemusí schvaľovať.
   Bez zverejnenia by sa mohli prihlásiť len ľudia pridaní ako „test users“.

## 4. Zapni Google v Supabase

1. V Supabase vľavo **Authentication → Sign In / Providers** (alebo **Providers**).
2. **Google** → zapni **Enable Sign in with Google** → vlož **Client ID** a **Client Secret** → **Save**.
3. **Email** → **vypni** (Disable). Web používa len prihlásenie cez Google a nikto si tak nevytvorí účet heslom.
4. **Authentication → URL Configuration:**
   - **Site URL:** `https://TVOJ-WEB.vercel.app`
   - **Redirect URLs** → **Add URL:** `https://TVOJ-WEB.vercel.app/**`
     (ak máš aj vlastnú doménu, pridaj aj tú)

## 5. Nasaď web znova

Zmeny z GitHubu sa nasadia samy. Ak si Supabase pridal až po poslednom nasadení:
**Vercel → Deployments → posledné nasadenie → ⋯ → Redeploy.**

V zázname nasadenia (Build Logs) majú byť riadky **„Použitá premenná: PUBLIC_SUPABASE_URL“** a
**„Supabase nastavený: https://XXXX.supabase.co“**. Ak je tam „Supabase nie je nastavený“, pošli mi
zoznam názvov premenných z **Vercel → Settings → Environment Variables** (stačia názvy, nie hodnoty).

## 6. Vyskúšaj (najlepšie v mobile)

1. Otvor web → **Registrácia** → **Pokračovať cez Google** → vyber účet **ing.macik@gmail.com**.
2. Zvoľ si verejné meno a potvrď súhlas → v hlavičke uvidíš svoje meno a **Schvaľovanie**.
3. Druhým Google účtom (alebo v anonymnom okne s iným účtom):
   - ulož 4+ obľúbené recepty (bez obmedzenia),
   - **Moje obľúbené → Zdieľať zoznam** → odkaz otvor v inom prehliadači bez prihlásenia,
   - **+ Pridať recept** s 2 fotkami → v **Moje recepty** má byť „Čaká na schválenie“.
4. Ako admin: **Schvaľovanie** → otvor recept → oprav napr. názov → **Uložiť a zverejniť** → recept je na webe.
5. Skús aj **Zamietnuť** s dôvodom → autor ho uvidí v **Moje recepty**.
6. Odhlásený: pri 4. obľúbenom recepte sa má zobraziť výzva na registráciu, rovnako pri **+ Pridať recept** a **Zdieľať**.

## 7. Pred spustením pre verejnosť

- **GDPR:** v súbore [`js/pravne.js`](js/pravne.js) doplň údaje v `[HRANATÝCH ZÁTVORKÁCH]`
  (meno alebo firma, IČO, adresa, kontaktný e-mail, dátum účinnosti). Prípadne mi ich pošli a doplním ich ja.
  Text je podklad pripravený asistentom, odporúčame ho dať skontrolovať právnikovi.
- **GitHub Pages vypni** (GitHub → repozitár → Settings → Pages → Source: *None*), aby nebežali dve verzie webu.
  Stará verzia na GitHub Pages by mala prihlasovanie vypnuté.
- **Ďalší administrátor:** v Supabase SQL Editor spusti
  `insert into public.admins (email) values ('niekto@gmail.com');` Musí sa prihlasovať cez Google.

## Dobré vedieť

- **Bezplatný plán Supabase:** 500 MB databáza a 1 GB fotiek. Na začiatok to bohato stačí, fotky pred nahraním zmenšujeme.
  Ak na web týždeň nikto nepríde, Supabase projekt uspí. Prebudíš ho v Supabase jedným kliknutím (**Restore project**).
- **Kľúč `anon` na stránke je verejný schválne.** Prístup k údajom strážia pravidlá v databáze (`schema.sql`),
  čo overuje `test-bezpecnosti.sql`.
- **Náhľad `domaci-pekari-nahlad.html`** je vždy bez prihlasovania. Google prihlásenie zo súboru na disku nefunguje.
