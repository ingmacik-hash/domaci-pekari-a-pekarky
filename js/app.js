(function () {
  const app = document.getElementById("app");
  const favCountEl = document.getElementById("fav-count");
  const searchEl = document.getElementById("search");
  const toastEl = document.getElementById("toast");
  const FAV_KEY = "pekari-oblubene";
  const AUTHOR = "Domáci pekári";
  const CATEGORY_ICONS = Object.fromEntries(CATEGORIES);
  // Miesta na reklamu – zatiaľ len zástupné rámčeky. false = skryť.
  const SHOW_ADS = true;

  let query = "";

  // Odkaz na text licencie fotky, napr. "CC BY-SA 4.0" -> creativecommons.org/licenses/by-sa/4.0/
  function licenseUrl(license) {
    const m = /^CC (BY(?:-SA)?) (\d\.\d)$/.exec(license || "");
    if (m) return `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/deed.sk`;
    if (license === "CC0") return "https://creativecommons.org/publicdomain/zero/1.0/deed.sk";
    return ""; // voľné dielo (public domain) nemá text licencie
  }
  function licenseHtml(license) {
    const url = licenseUrl(license);
    return url ? `<a href="${url}" target="_blank" rel="noopener license">${esc(license)}</a>` : esc(license);
  }

  // --- používateľ ---
  const B = window.Backend || { configured: false };
  let currentUser = null; // { id, email, publicName, isAdmin } alebo null
  let pendingCount = 0;   // počet receptov čakajúcich na schválenie (pre admina)

  // --- obľúbené ---
  // Bez prihlásenia: v prehliadači (localStorage), najviac 3. Po prihlásení: v účte, bez obmedzenia.
  const ANON_FAV_LIMIT = 3;
  function loadFavs() {
    try {
      return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []);
    } catch (e) {
      return new Set();
    }
  }
  function saveLocalFavs() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
    } catch (e) { /* bez úložiska sa obľúbené len neuložia */ }
  }
  let favs = loadFavs();

  // vráti false, ak sa recept nepridal (limit bez prihlásenia)
  function toggleFav(id) {
    const adding = !favs.has(id);
    if (adding && !currentUser && favs.size >= ANON_FAV_LIMIT) {
      showAuthPrompt("favs");
      return false;
    }
    adding ? favs.add(id) : favs.delete(id);
    if (currentUser) {
      (adding ? B.addFavorites([id]) : B.removeFavorite(id)).catch(() => {
        adding ? favs.delete(id) : favs.add(id); // vrátiť späť
        updateFavCount();
        refreshFavButtons(id);
        toast("Obľúbené sa nepodarilo uložiť. Skontroluj pripojenie na internet.");
      });
    } else {
      saveLocalFavs();
    }
    updateFavCount();
    return true;
  }

  function refreshFavButtons(id) {
    document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => {
      b.outerHTML = favButton(id, b.classList.contains("big"));
    });
  }

  function updateFavCount() {
    favCountEl.textContent = favs.size;
  }

  // --- pomocné funkcie ---
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatTime(min) {
    if (min >= 1440) {
      const d = Math.round(min / 1440);
      return d === 1 ? "1 deň" : d < 5 ? d + " dni" : d + " dní";
    }
    if (min >= 60) {
      const h = Math.floor(min / 60), m = min % 60;
      return h + " h" + (m ? " " + m + " min" : "");
    }
    return min + " min";
  }

  function formatAmount(n) {
    if (n >= 10) return String(Math.round(n));
    return String(Math.round(n * 10) / 10).replace(".", ",");
  }

  function pluralRecept(n) {
    return n + (n === 1 ? " recept" : n < 5 ? " recepty" : " receptov");
  }

  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // "Slané pečivo" -> "slane-pecivo" (do adresy stránky)
  function slug(s) {
    return normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // Kategórie z CATEGORIES a navyše tie, ktoré sú pri receptoch, no v zozname chýbajú.
  function categories() {
    const names = CATEGORIES.map(([name]) => name);
    return [...names, ...new Set(RECIPES.map((r) => r.category).filter((c) => !names.includes(c)))];
  }

  // Fotka receptu, ak je zadaná (pole image), inak emoji na farebnom pozadí.
  function media(r, cls) {
    const inner = r.image ? `<img src="${esc(r.image)}" alt="${esc(r.title)}" loading="lazy">` : r.emoji;
    return `<div class="${cls} media">${inner}</div>`;
  }

  // format: "leaderboard" (široký pruh) alebo "box" (štvorec 300 × 250)
  function ad(format) {
    return SHOW_ADS ? `<div class="ad ad-${format}" aria-hidden="true"><span>Reklama</span></div>` : "";
  }

  // Video z YouTube (odkaz v ľubovoľnom tvare) alebo vlastný súbor, napr. "videa/bageta.mp4".
  function videoEmbed(url) {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) {
      return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Videorecept"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    }
    return `<div class="video"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
  }

  function favButton(id, big) {
    const on = favs.has(id);
    const label = big ? (on ? "♥ Uložené v obľúbených" : "♡ Uložiť do obľúbených") : (on ? "♥" : "♡");
    return `<button class="fav-btn${big ? " big" : ""}${on ? " on" : ""}" data-fav="${id}"
      aria-pressed="${on}" title="${on ? "Odobrať z obľúbených" : "Pridať do obľúbených"}">${label}</button>`;
  }

  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    return ((parts[0] || "")[0] || "?").toUpperCase() + ((parts[1] || "")[0] || "").toUpperCase();
  }

  // autor: pri receptoch od používateľov ich verejné meno, inak „Domáci pekári“
  function author(r) {
    const name = (r && r.fromDb) ? (r.authorName || "Domáci pekár") : AUTHOR;
    return `<span class="author"><span class="avatar">${esc(initials(name))}</span>${esc(name)}</span>`;
  }

  function card(r) {
    return `
      <article class="card">
        <a href="#/recept/${r.id}" class="card-link">
          ${media(r, "card-img")}
          ${r.video ? `<span class="video-badge">▶ Video</span>` : ""}
          <div class="card-body">
            <span class="kicker">${esc(r.category)}</span>
            <h3>${esc(r.title)}</h3>
            <div class="meta"><span>⏱ ${formatTime(r.time)}</span><span>📊 ${esc(r.difficulty)}</span></div>
          </div>
        </a>
        ${favButton(r.id)}
      </article>`;
  }

  function grid(list, emptyText) {
    return list.length
      ? `<div class="grid">${list.map(card).join("")}</div>`
      : `<p class="empty">${emptyText}</p>`;
  }

  function crumbs(items) {
    return `<nav class="crumbs"><a href="#/">Domov</a>${items.map((i) => ` <span>›</span> ${i}`).join("")}</nav>`;
  }

  // --- stránky ---
  function renderHome() {
    if (query.trim()) return renderSearch();
    const [f, ...rest] = RECIPES; // prvý recept = recept týždňa
    // najnovšie = naposledy pridané (na konci zoznamu v recipes.js)
    const newest = RECIPES.slice(-5).reverse();
    const videos = RECIPES.filter((r) => r.video);

    app.innerHTML = `
      <section class="top">
        <a class="feature" href="#/recept/${f.id}">
          ${media(f, "feature-img")}
          <div class="feature-text">
            <span class="kicker light">Recept týždňa</span>
            <h1>${esc(f.title)}</h1>
            <p>${esc(f.description)}</p>
            <span class="btn">Zobraziť recept</span>
          </div>
        </a>
        <div class="side-col">
          <aside class="side-list">
            <h2>Najnovšie recepty</h2>
            <ol>
              ${newest.map((r) => `
                <li><a href="#/recept/${r.id}">
                  ${media(r, "thumb")}
                  <span><strong>${esc(r.title)}</strong><small>⏱ ${formatTime(r.time)}</small></span>
                </a></li>`).join("")}
            </ol>
          </aside>
          ${ad("box")}
        </div>
      </section>

      ${ad("leaderboard")}

      <section class="section">
        <div class="section-head"><h2>Kategórie</h2><a href="#/recepty">Všetky recepty ›</a></div>
        <div class="cat-tiles">
          ${categories().map((c) => `
            <a class="cat-tile" href="#/kategoria/${slug(c)}">
              <span class="cat-icon">${CATEGORY_ICONS[c] || "🍽"}</span>
              <strong>${esc(c)}</strong>
              <small>${pluralRecept(RECIPES.filter((r) => r.category === c).length)}</small>
            </a>`).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Obľúbené recepty</h2><a href="#/recepty">Ďalšie recepty ›</a></div>
        ${grid(rest, "")}
      </section>

      ${videos.length ? `
      <section class="section">
        <div class="section-head"><h2>▶ Videorecepty</h2><a href="#/videorecepty">Všetky videá ›</a></div>
        ${grid(videos.slice(0, 4), "")}
      </section>` : ""}

      ${ad("leaderboard")}

      <section class="cta">
        <div>
          <h2>Pečieš doma? Podeľ sa o svoj recept.</h2>
          <p>Pridaj recept aj s fotkami. Po schválení ho uvidia všetci domáci pekári a pekárky.</p>
        </div>
        <a class="btn btn-light" href="#/pridat">+ Pridať recept</a>
      </section>`;
  }

  function renderSearch() {
    const q = normalize(query.trim());
    const list = RECIPES.filter((r) =>
      normalize([r.title, r.description, r.category, ...r.ingredients.map((i) => i.name)].join(" ")).includes(q)
    );
    app.innerHTML = `
      ${crumbs(["Vyhľadávanie"])}
      <h1 class="page-title">Výsledky pre „${esc(query.trim())}“</h1>
      <p class="page-sub">${pluralRecept(list.length)}</p>
      ${grid(list, "Nenašli sa žiadne recepty. Skús iné slovo alebo surovinu.")}`;
  }

  function renderList(title, list, emptyText, extra) {
    app.innerHTML = `
      ${crumbs([esc(title)])}
      <h1 class="page-title">${esc(title)}</h1>
      <p class="page-sub">${pluralRecept(list.length)}</p>
      ${extra || ""}
      ${ad("leaderboard")}
      ${grid(list, emptyText)}`;
  }

  function renderFavorites() {
    const list = RECIPES.filter((r) => favs.has(r.id));
    const note = !currentUser
      ? `<p class="note">Bez registrácie si môžeš uložiť ${ANON_FAV_LIMIT} recepty (${favs.size}/${ANON_FAV_LIMIT}).
           <a href="#/registracia">Zaregistruj sa</a> a ukladaj si neobmedzene – v mobile aj v počítači.</p>`
      : "";
    const share = list.length ? `<div class="actions"><button class="btn" data-share>🔗 Zdieľať zoznam obľúbených</button></div>` : "";
    renderList("Moje obľúbené", list, "Zatiaľ nemáš žiadne obľúbené. Klikni na ♡ pri recepte.", note + share);
  }

  function renderRecipe(id, seq) {
    const r = RECIPES.find((x) => x.id === id);
    if (r) return renderRecipeView(r);
    if (!B.configured) {
      app.innerHTML = `<p class="empty">Recept sa nenašiel. <a href="#/">Späť na úvod</a></p>`;
      return;
    }
    // recept z databázy, ktorý nie je medzi schválenými (napr. vlastný čakajúci alebo pre admina)
    app.innerHTML = loading();
    B.getRecipe(id).then((x) => {
      if (seq !== routeSeq) return;
      if (!x) {
        app.innerHTML = `<p class="empty">Recept sa nenašiel. Možno ešte čaká na schválenie alebo bol odstránený. <a href="#/">Späť na úvod</a></p>`;
        return;
      }
      renderRecipeView(prepareDbRecipe(x));
    }).catch(() => { if (seq === routeSeq) app.innerHTML = errorBox(); });
  }

  const STATUS_TEXT = { pending: "⏳ Čaká na schválenie", approved: "✅ Zverejnený", rejected: "✖ Zamietnutý" };

  function renderRecipeView(r) {
    let servings = r.servings;
    const related = RECIPES.filter((x) => x.category === r.category && x.id !== r.id);
    const more = related.length ? related : RECIPES.filter((x) => x.id !== r.id).slice(0, 3);

    app.innerHTML = `
      ${crumbs([`<a href="#/kategoria/${slug(r.category)}">${esc(r.category)}</a>`])}
      ${r.fromDb && r.status !== "approved" ? `
        <div class="notice notice-${r.status}">
          <strong>${STATUS_TEXT[r.status]}</strong>
          ${r.status === "pending" ? " – zatiaľ ho vidí len autor a administrátor. Po schválení ho uvidia všetci." : ""}
          ${r.status === "rejected" && r.rejectReason ? `<br>Dôvod: ${esc(r.rejectReason)}` : ""}
          ${currentUser && currentUser.isAdmin ? ` <a class="btn btn-small" href="#/admin/${r.id}">Upraviť a schváliť</a>` : ""}
        </div>` : ""}
      <article class="recipe">
        <header class="recipe-title">
          <span class="kicker">${esc(r.category)}</span>
          <h1>${esc(r.title)}</h1>
          <div class="byline">${author(r)}</div>
          <p class="lead">${esc(r.description)}</p>
          <div class="actions">
            ${favButton(r.id, true)}
            <button class="btn-outline" data-print>🖨 Vytlačiť recept</button>
            ${"wakeLock" in navigator ? `<button class="btn-outline" data-wake aria-pressed="false">🔆 Nezhasínať obrazovku</button>` : ""}
          </div>
        </header>

        <figure class="recipe-figure">
          ${media(r, "recipe-img")}
          ${r.photos && r.photos.length > 1 ? `
            <div class="gallery">${r.photos.map((p, i) => `
              <button class="gallery-thumb${i === 0 ? " on" : ""}" data-photo="${esc(p)}" aria-label="Fotka ${i + 1}">
                <img src="${esc(p)}" alt="" loading="lazy"></button>`).join("")}
            </div>` : ""}
          ${r.fromDb ? `<figcaption>Foto: ${esc(r.authorName || "autor receptu")}</figcaption>` : ""}
          ${r.credit ? `<figcaption>Foto: <a href="${esc(r.credit.url)}" target="_blank" rel="noopener">${esc(r.credit.author)}</a>, licencia ${licenseHtml(r.credit.license)}, zdroj Wikimedia Commons</figcaption>` : ""}
        </figure>

        <div class="facts">
          <div><strong>${r.servings} ${esc(r.servingsUnit)}</strong><span>dávka</span></div>
          <div><strong>${formatTime(r.time)}</strong><span>celkový čas</span></div>
          <div><strong>${esc(r.difficulty)}</strong><span>náročnosť</span></div>
          <div><strong>${r.ingredients.length}</strong><span>surovín</span></div>
        </div>

        ${r.video ? `
        <section class="recipe-video">
          <h2>▶ Videorecept</h2>
          ${videoEmbed(r.video)}
        </section>` : ""}

        <div class="recipe-body">
          <section class="ingredients">
            <h2>Suroviny</h2>
            <div class="servings">
              <button data-step="-1" aria-label="Menej">−</button>
              <span id="serv"></span>
              <button data-step="1" aria-label="Viac">+</button>
            </div>
            <ul id="ing-list"></ul>
          </section>
          <section class="steps">
            <h2>Postup</h2>
            <ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
          </section>
        </div>

        ${ad("leaderboard")}

        <section class="comments">
          <h2>Komentáre</h2>
          <div class="comment-box">
            <p>Zatiaľ žiadne komentáre. Upiekol si tento recept? Daj vedieť, ako sa podaril.</p>
            <button class="btn" data-soon>Pridať komentár</button>
          </div>
        </section>
      </article>

      <section class="section">
        <div class="section-head"><h2>${related.length ? "Ďalšie recepty z kategórie " + esc(r.category) : "Mohlo by ťa zaujímať"}</h2></div>
        ${grid(more, "")}
      </section>`;

    function renderIngredients() {
      const k = servings / r.servings;
      document.getElementById("serv").textContent = servings + " " + r.servingsUnit;
      document.getElementById("ing-list").innerHTML = r.ingredients
        .map((i) => `<li><label><input type="checkbox"> <strong>${i.amount == null || i.amount === "" ? "" : formatAmount(i.amount * k)} ${esc(i.unit || "")}</strong> ${esc(i.name)}</label></li>`)
        .join("");
    }
    app.querySelectorAll("[data-step]").forEach((b) =>
      b.addEventListener("click", () => {
        servings = Math.max(1, servings + Number(b.dataset.step));
        renderIngredients();
      })
    );
    renderIngredients();
  }

  // =====================================================================
  // Používateľská sekcia
  // =====================================================================
  let routeSeq = 0; // číslo aktuálnej stránky – zabráni vykresleniu starej stránky po pomalej odpovedi

  function loading() {
    return `<p class="empty">Načítavam…</p>`;
  }
  function errorBox(msg) {
    return `<p class="empty">${esc(msg || "Nepodarilo sa načítať údaje. Skontroluj pripojenie na internet a skús to znova.")}</p>`;
  }
  function prepareDbRecipe(x) {
    x.emoji = CATEGORY_ICONS[x.category] || "🍽";
    return x;
  }
  function hashNow() {
    return location.hash || "#/";
  }
  function go(hash) {
    if (location.hash === hash) route(); else location.hash = hash;
  }

  const GOOGLE_ICON = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>`;

  // --- výzva na registráciu / prihlásenie (okno) ---
  const PROMPTS = {
    favs: ["Ulož si viac obľúbených", `Bez registrácie si môžeš uložiť ${ANON_FAV_LIMIT} obľúbené recepty. Zaregistruj sa a ukladaj si neobmedzene – v mobile aj v počítači.`],
    share: ["Zdieľanie pre registrovaných", "Zoznam obľúbených receptov môžu zdieľať len registrovaní používatelia. Registrácia cez Google trvá pár sekúnd."],
    add: ["Pridaj svoj recept", "Recepty môžu pridávať registrovaní používatelia. Zaregistruj sa cez Google a podeľ sa o svoj recept s ostatnými pekármi a pekárkami."],
    account: ["Môj účet", "Pre zobrazenie účtu sa prihlás. Ak ešte účet nemáš, zaregistruj sa cez Google."]
  };
  let returnAfterLogin = null; // kam sa vrátiť po prihlásení
  function showAuthPrompt(kind, returnHash) {
    returnAfterLogin = returnHash || hashNow();
    const [title, text] = PROMPTS[kind];
    let dlg = document.getElementById("auth-dialog");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "auth-dialog";
      dlg.className = "dialog";
      document.body.appendChild(dlg);
      dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
    }
    dlg.innerHTML = `
      <div class="dialog-body">
        <button class="dialog-x" data-close aria-label="Zavrieť">✕</button>
        <h2>${esc(title)}</h2>
        <p>${esc(text)}</p>
        <div class="dialog-actions">
          <a class="btn" href="#/registracia" data-close>Registrácia</a>
          <a class="btn-outline" href="#/prihlasenie" data-close>Prihlásiť sa</a>
        </div>
      </div>`;
    if (dlg.showModal) dlg.showModal(); else go("#/registracia");
  }

  // --- hlavička: prihlásený / neprihlásený ---
  function renderHeaderAccount() {
    const el = document.getElementById("account-links");
    if (!currentUser) {
      el.innerHTML = `<a class="link-btn" href="#/prihlasenie">Prihlásiť sa</a><span class="sep">·</span><a class="link-btn" href="#/registracia">Registrácia</a>`;
      return;
    }
    const name = currentUser.publicName || "Môj účet";
    el.innerHTML = `
      <a class="link-btn user-link" href="#/ucet" title="Môj účet"><span class="avatar avatar-sm">${esc(initials(name))}</span>${esc(name)}</a>
      ${currentUser.isAdmin ? `<span class="sep">·</span><a class="link-btn" href="#/admin">Schvaľovanie${pendingCount ? ` <span class="badge">${pendingCount}</span>` : ""}</a>` : ""}
      <span class="sep">·</span><button class="link-btn" data-signout>Odhlásiť</button>`;
  }
  async function refreshPendingCount() {
    if (!currentUser || !currentUser.isAdmin) return;
    try { pendingCount = await B.adminCountPending(); } catch (e) { /* nič */ }
    renderHeaderAccount();
  }

  // --- prihlásenie a registrácia (podstránky) ---
  function renderAuthPage(kind) {
    const reg = kind === "registracia";
    if (currentUser) {
      app.innerHTML = `${crumbs([reg ? "Registrácia" : "Prihlásenie"])}
        <section class="auth-box"><h1 class="page-title">Už si prihlásený</h1>
        <p>Prihlásený ako <strong>${esc(currentUser.publicName || currentUser.email)}</strong>.</p>
        <p><a class="btn" href="#/ucet">Môj účet</a></p></section>`;
      return;
    }
    app.innerHTML = `
      ${crumbs([reg ? "Registrácia" : "Prihlásenie"])}
      <section class="auth-box">
        <h1 class="page-title">${reg ? "Registrácia" : "Prihlásenie"}</h1>
        <p class="lead">${reg
          ? "Účet si vytvoríš jednoducho cez svoj Google účet – bez nového hesla. Po prvom prihlásení si zvolíš verejné meno, pod ktorým ťa uvidia ostatní."
          : "Prihlás sa cez svoj Google účet."}</p>
        ${B.configured
          ? `<button class="btn-google" data-signin>${GOOGLE_ICON}<span>Pokračovať cez Google</span></button>`
          : `<p class="notice">Prihlasovanie a registráciu práve spúšťame. Skús to o pár dní.</p>`}
        ${reg ? `
          <ul class="perks">
            <li>♥ neobmedzený počet obľúbených receptov v mobile aj v počítači</li>
            <li>🔗 zdieľanie zoznamu obľúbených s rodinou a priateľmi</li>
            <li>🥖 pridávanie vlastných receptov aj s fotkami</li>
          </ul>` : `<p>Ešte nemáš účet? <a href="#/registracia">Zaregistruj sa</a> – je to rovnako jednoduché.</p>`}
        <p class="small">Pokračovaním súhlasíš s <a href="#/pravidla">Pravidlami komunity</a> a berieš na vedomie
          <a href="#/ochrana-osobnych-udajov">Ochranu osobných údajov</a>. Z Google účtu použijeme len e-mail na prihlásenie –
          meno ani fotku z Googlu verejne nezobrazujeme.</p>
      </section>`;
  }

  async function signIn(btn) {
    btn.disabled = true;
    try {
      await B.signInWithGoogle(returnAfterLogin || "#/");
    } catch (e) {
      btn.disabled = false;
      toast("Prihlásenie sa nepodarilo spustiť. Skús to znova.");
    }
  }

  // --- verejné meno (po prvom prihlásení) ---
  function renderWelcome() {
    if (!currentUser) return go("#/prihlasenie");
    const first = !currentUser.publicName;
    app.innerHTML = `
      ${crumbs([first ? "Dokončenie registrácie" : "Verejné meno"])}
      <section class="auth-box">
        <h1 class="page-title">${first ? "Vitaj medzi pekármi a pekárkami!" : "Zmena verejného mena"}</h1>
        <p class="lead">Zvoľ si verejné meno. Uvidia ho ostatní pri tvojich receptoch a pri zdieľanom zozname obľúbených.</p>
        <form id="name-form" class="form" novalidate>
          <label class="field">
            <span>Verejné meno</span>
            <input name="name" maxlength="30" autocomplete="nickname" required value="${esc(currentUser.publicName || "")}"
              placeholder="napr. Peťka z Oravy">
            <small>3 – 30 znakov: písmená, číslice, medzera, bodka, pomlčka alebo podčiarkovník.</small>
          </label>
          ${first ? `
          <label class="check">
            <input type="checkbox" name="terms" required>
            <span>Mám viac ako 16 rokov, súhlasím s <a href="#/pravidla" target="_blank">Pravidlami komunity</a>
              a beriem na vedomie <a href="#/ochrana-osobnych-udajov" target="_blank">Ochranu osobných údajov</a>.</span>
          </label>` : ""}
          <p class="form-error" id="name-error" role="alert"></p>
          <button class="btn" type="submit">${first ? "Dokončiť registráciu" : "Uložiť meno"}</button>
        </form>
      </section>`;
    const form = document.getElementById("name-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim().replace(/\s+/g, " ");
      const err = document.getElementById("name-error");
      if (!/^[\p{L}0-9 ._-]{3,30}$/u.test(name)) {
        err.textContent = "Meno môže mať 3 – 30 znakov: písmená, číslice, medzeru, bodku, pomlčku a podčiarkovník.";
        return;
      }
      if (first && !form.elements.terms.checked) {
        err.textContent = "Na dokončenie registrácie potrebujeme tvoj súhlas s pravidlami.";
        return;
      }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      err.textContent = "";
      try {
        await B.setPublicName(name, first);
        renderHeaderAccount();
        toast(first ? `Vitaj, ${name}! Registrácia je dokončená.` : "Meno je uložené.");
        const back = returnAfterLogin;
        returnAfterLogin = null;
        go(first ? (back && !/prihlasenie|registracia|vitaj/.test(back) ? back : "#/") : "#/ucet");
      } catch (ex) {
        err.textContent = ex.code === "taken" || ex.code === "format" ? ex.message : "Meno sa nepodarilo uložiť. Skús to znova.";
        btn.disabled = false;
      }
    });
  }

  // vyžaduje prihlásenie aj verejné meno; inak presmeruje / ukáže výzvu
  function requireMember(kind) {
    if (!B.configured) {
      app.innerHTML = `${crumbs(["Pripravujeme"])}<section class="auth-box"><h1 class="page-title">Pripravujeme</h1>
        <p class="lead">Registráciu a pridávanie receptov práve spúšťame. Skús to o pár dní.</p></section>`;
      return false;
    }
    if (!currentUser) {
      returnAfterLogin = hashNow();
      const [title, text] = PROMPTS[kind];
      app.innerHTML = `
        ${crumbs([esc(title)])}
        <section class="auth-box">
          <h1 class="page-title">${esc(title)}</h1>
          <p class="lead">${esc(text)}</p>
          <div class="dialog-actions">
            <a class="btn" href="#/registracia">Registrácia</a>
            <a class="btn-outline" href="#/prihlasenie">Prihlásiť sa</a>
          </div>
        </section>`;
      return false;
    }
    if (!currentUser.publicName) {
      returnAfterLogin = hashNow();
      go("#/vitaj");
      return false;
    }
    return true;
  }

  // --- formulár receptu (pridanie aj úprava adminom) ---
  const UNITS = ["g", "kg", "ml", "l", "ks", "PL", "ČL", "KL", "bal.", "štipka", "hrnček", "strúčiky"];
  const MAX_PHOTOS = 5;

  function ingredientRow(i) {
    i = i || {};
    return `<div class="row-edit ing-row">
      <input class="in-amount" type="number" step="any" min="0" placeholder="Množstvo" aria-label="Množstvo" value="${i.amount == null ? "" : esc(i.amount)}">
      <input class="in-unit" list="units" placeholder="Jednotka" aria-label="Jednotka" maxlength="20" value="${esc(i.unit || "")}">
      <input class="in-name" placeholder="Surovina, napr. hladká múka" aria-label="Surovina" maxlength="120" value="${esc(i.name || "")}">
      <button type="button" class="row-x" data-remove-row aria-label="Odstrániť">✕</button>
    </div>`;
  }
  function stepRow(s) {
    return `<div class="row-edit step-row">
      <textarea class="in-step" rows="2" maxlength="1000" placeholder="Popíš krok postupu" aria-label="Krok postupu">${esc(s || "")}</textarea>
      <button type="button" class="row-x" data-remove-row aria-label="Odstrániť">✕</button>
    </div>`;
  }

  function recipeFormHtml(r, mode) {
    r = r || {};
    const h = r.time ? Math.floor(r.time / 60) : "", m = r.time ? r.time % 60 : "";
    const opt = (v, cur) => `<option${v === cur ? " selected" : ""}>${esc(v)}</option>`;
    return `
      <form id="recipe-form" class="form recipe-form" novalidate>
        <datalist id="units">${UNITS.map((u) => `<option value="${esc(u)}">`).join("")}</datalist>
        <datalist id="serv-units">${["ks", "porcie", "bochník", "plech", "torta", "forma"].map((u) => `<option value="${u}">`).join("")}</datalist>

        <label class="field"><span>Názov receptu *</span>
          <input name="title" maxlength="120" required value="${esc(r.title || "")}" placeholder="napr. Babkine tvarohové koláče"></label>

        <div class="field-row">
          <label class="field"><span>Kategória *</span>
            <select name="category" required>${categories().map((c) => opt(c, r.category)).join("")}</select></label>
          <label class="field"><span>Náročnosť *</span>
            <select name="difficulty">${["Ľahká", "Stredná", "Náročná"].map((d) => opt(d, r.difficulty || "Stredná")).join("")}</select></label>
        </div>

        <label class="field"><span>Krátky popis *</span>
          <textarea name="description" rows="3" maxlength="600" required placeholder="Čím je recept výnimočný? (10 – 600 znakov)">${esc(r.description || "")}</textarea></label>

        <div class="field-row">
          <div class="field"><span>Celkový čas *</span>
            <div class="inline-inputs">
              <input name="hours" type="number" min="0" max="168" value="${h}" aria-label="Hodiny"> h
              <input name="minutes" type="number" min="0" max="59" value="${m}" aria-label="Minúty"> min
            </div></div>
          <div class="field"><span>Dávka *</span>
            <div class="inline-inputs">
              <input name="servings" type="number" min="1" step="any" value="${r.servings || ""}" aria-label="Počet">
              <input name="servingsUnit" list="serv-units" maxlength="30" value="${esc(r.servingsUnit || "ks")}" aria-label="Jednotka dávky">
            </div></div>
        </div>

        <fieldset class="field"><legend>Suroviny *</legend>
          <div id="ing-rows">${(r.ingredients && r.ingredients.length ? r.ingredients : [{}, {}, {}]).map(ingredientRow).join("")}</div>
          <button type="button" class="btn-outline btn-add" data-add="ing">+ Pridať surovinu</button>
        </fieldset>

        <fieldset class="field"><legend>Postup *</legend>
          <div id="step-rows">${(r.steps && r.steps.length ? r.steps : ["", ""]).map(stepRow).join("")}</div>
          <button type="button" class="btn-outline btn-add" data-add="step">+ Pridať krok</button>
        </fieldset>

        <fieldset class="field"><legend>Fotky (najviac ${MAX_PHOTOS})</legend>
          <div id="photo-list" class="photo-list"></div>
          <label class="btn-outline btn-add file-btn">📷 Pridať fotky
            <input type="file" id="photo-input" accept="image/*" multiple hidden></label>
          <small>Fotky pred odoslaním zmenšíme, aby sa rýchlo načítali. Pridávaj len vlastné fotky.</small>
        </fieldset>

        <p class="form-error" id="form-error" role="alert"></p>
        <div class="form-actions" id="form-actions">
          ${mode === "admin" ? `
            <button class="btn" type="submit" data-action="approve">✅ Uložiť a zverejniť</button>
            <button class="btn-outline" type="submit" data-action="save">💾 Len uložiť zmeny</button>
            <div class="reject-box">
              <label class="field"><span>Dôvod zamietnutia (uvidí ho autor)</span>
                <textarea name="rejectReason" rows="2" maxlength="1000">${esc(r.rejectReason || "")}</textarea></label>
              <button class="btn-outline btn-danger" type="submit" data-action="reject">✖ Zamietnuť</button>
            </div>`
          : `<button class="btn" type="submit">${currentUser && currentUser.isAdmin ? "Zverejniť recept" : "Odoslať na schválenie"}</button>`}
        </div>
      </form>`;
  }

  // Fotky vo formulári: existujúce (cesty v úložisku) + nové (súbory na nahratie)
  function setupRecipeForm(existing) {
    const form = document.getElementById("recipe-form");
    const photos = (existing || []).map((p) => ({ path: p.path, url: p.url }));
    // Enter v políčku formulár neodošle (v administrácii by inak recept rovno zverejnil)
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault();
    });
    const list = document.getElementById("photo-list");

    function drawPhotos() {
      list.innerHTML = photos.map((p, i) => `
        <div class="photo-item">
          <img src="${esc(p.url)}" alt="">
          ${i === 0 ? `<span class="photo-main">Hlavná</span>` : `<button type="button" class="photo-first" data-photo-first="${i}" title="Nastaviť ako hlavnú">★</button>`}
          <button type="button" class="row-x" data-photo-remove="${i}" aria-label="Odstrániť fotku">✕</button>
        </div>`).join("");
    }
    drawPhotos();

    document.getElementById("photo-input").addEventListener("change", async (e) => {
      const files = [...e.target.files];
      e.target.value = "";
      for (const f of files) {
        if (photos.length >= MAX_PHOTOS) { toast(`Najviac ${MAX_PHOTOS} fotiek.`); break; }
        if (!f.type.startsWith("image/")) continue;
        try {
          const blob = await resizeImage(f, 1600);
          photos.push({ blob, url: URL.createObjectURL(blob) });
          drawPhotos();
        } catch (ex) {
          toast("Túto fotku sa nepodarilo načítať. Skús inú (JPG alebo PNG).");
        }
      }
    });

    form.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) {
        const box = document.getElementById(add.dataset.add === "ing" ? "ing-rows" : "step-rows");
        box.insertAdjacentHTML("beforeend", add.dataset.add === "ing" ? ingredientRow() : stepRow());
        box.lastElementChild.querySelector("input, textarea").focus();
        return;
      }
      const rm = e.target.closest("[data-remove-row]");
      if (rm) {
        const row = rm.closest(".row-edit");
        if (row.parentElement.children.length > 1) row.remove();
        else row.querySelectorAll("input, textarea").forEach((x) => (x.value = ""));
        return;
      }
      const pr = e.target.closest("[data-photo-remove]");
      if (pr) { photos.splice(Number(pr.dataset.photoRemove), 1); drawPhotos(); return; }
      const pf = e.target.closest("[data-photo-first]");
      if (pf) { photos.unshift(...photos.splice(Number(pf.dataset.photoFirst), 1)); drawPhotos(); }
    });

    return { form, photos };
  }

  // prečíta a skontroluje formulár; vráti { data, errors }
  function readRecipeForm(form) {
    const f = form.elements;
    const num = (v) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
    const ingredients = [...form.querySelectorAll(".ing-row")].map((row) => ({
      amount: num(row.querySelector(".in-amount").value),
      unit: row.querySelector(".in-unit").value.trim(),
      name: row.querySelector(".in-name").value.trim()
    })).filter((i) => i.name);
    const steps = [...form.querySelectorAll(".in-step")].map((t) => t.value.trim()).filter(Boolean);
    const time = (num(f.hours.value) || 0) * 60 + (num(f.minutes.value) || 0);
    const data = {
      title: f.title.value.trim(),
      category: f.category.value,
      difficulty: f.difficulty.value,
      description: f.description.value.trim(),
      time: Math.round(time),
      servings: num(f.servings.value),
      servingsUnit: f.servingsUnit.value.trim(),
      ingredients,
      steps
    };
    const errors = [];
    if (data.title.length < 3) errors.push("Názov musí mať aspoň 3 znaky.");
    if (data.description.length < 10) errors.push("Popis musí mať aspoň 10 znakov.");
    if (!(data.time >= 1)) errors.push("Zadaj celkový čas prípravy.");
    if (!(data.servings > 0)) errors.push("Zadaj dávku (napr. 12 ks).");
    if (!data.servingsUnit) errors.push("Zadaj jednotku dávky (napr. ks, bochník).");
    if (!ingredients.length) errors.push("Pridaj aspoň jednu surovinu.");
    if (ingredients.some((i) => i.amount != null && !(i.amount >= 0))) errors.push("Množstvo suroviny musí byť číslo.");
    if (ingredients.length > 40) errors.push("Najviac 40 surovín.");
    if (!steps.length) errors.push("Pridaj aspoň jeden krok postupu.");
    if (steps.length > 30) errors.push("Najviac 30 krokov postupu.");
    return { data, errors };
  }

  // zmenší fotku na najviac maxSide px a uloží ako JPEG
  async function resizeImage(file, maxSide) {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close && bmp.close();
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.85));
  }

  function showFormErrors(errors) {
    const el = document.getElementById("form-error");
    el.innerHTML = errors.length ? `<strong>Skontroluj, prosím:</strong><ul>${errors.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    if (errors.length) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderAddRecipe() {
    if (!requireMember("add")) return;
    app.innerHTML = `
      ${crumbs(["Pridať recept"])}
      <h1 class="page-title">Pridať recept</h1>
      <p class="page-sub">${currentUser.isAdmin
        ? "Si administrátor – tvoj recept sa zverejní hneď."
        : "Recept po odoslaní skontroluje administrátor. Stav uvidíš v časti <a href=\"#/moje-recepty\">Moje recepty</a>."}</p>
      ${recipeFormHtml(null, "user")}`;
    const { form, photos } = setupRecipeForm([]);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { data, errors } = readRecipeForm(form);
      showFormErrors(errors);
      if (errors.length) return;
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Odosielam…";
      try {
        const res = await B.submitRecipe(data, photos.map((p) => p.blob));
        if (res.published) await loadDbRecipes();
        toast(res.published ? "Recept je zverejnený." : "Ďakujeme! Recept čaká na schválenie.");
        go(res.published ? "#/recept/" + res.id : "#/moje-recepty");
      } catch (ex) {
        showFormErrors(["Recept sa nepodarilo odoslať: " + (ex.message || "neznáma chyba") + ". Skús to znova."]);
        btn.disabled = false;
        btn.textContent = currentUser.isAdmin ? "Zverejniť recept" : "Odoslať na schválenie";
      }
    });
  }

  // --- moje recepty ---
  function statusBadge(s) {
    return `<span class="status status-${s}">${STATUS_TEXT[s]}</span>`;
  }
  function renderMyRecipes(seq) {
    if (!requireMember("add")) return;
    app.innerHTML = `${crumbs(["Moje recepty"])}<h1 class="page-title">Moje recepty</h1>${loading()}`;
    B.listMyRecipes().then((list) => {
      if (seq !== routeSeq) return;
      list.forEach(prepareDbRecipe);
      app.innerHTML = `
        ${crumbs(["Moje recepty"])}
        <h1 class="page-title">Moje recepty</h1>
        <p class="page-sub">${pluralRecept(list.length)} · <a href="#/pridat">+ Pridať ďalší recept</a></p>
        ${list.length ? `<div class="my-list">${list.map((r) => `
          <article class="my-item">
            <a href="#/recept/${r.id}" class="my-thumb">${media(r, "thumb")}</a>
            <div class="my-text">
              <a href="#/recept/${r.id}"><strong>${esc(r.title)}</strong></a>
              <div>${statusBadge(r.status)} <small>${new Date(r.createdAt).toLocaleDateString("sk-SK")}</small></div>
              ${r.status === "rejected" && r.rejectReason ? `<p class="small">Dôvod: ${esc(r.rejectReason)}</p>` : ""}
            </div>
            ${r.status !== "approved" ? `<button class="btn-outline btn-small" data-delete-my="${r.id}">Zmazať</button>` : ""}
          </article>`).join("")}</div>`
        : `<p class="empty">Zatiaľ si nepridal žiadny recept. <a href="#/pridat">Pridaj prvý!</a></p>`}`;
      app.querySelectorAll("[data-delete-my]").forEach((b) => b.addEventListener("click", async () => {
        if (!confirm("Naozaj zmazať tento recept? Zmažú sa aj jeho fotky.")) return;
        b.disabled = true;
        try {
          await B.deleteMyRecipe(list.find((r) => r.id === b.dataset.deleteMy));
          toast("Recept je zmazaný.");
          route();
        } catch (e) { b.disabled = false; toast("Recept sa nepodarilo zmazať."); }
      }));
    }).catch(() => { if (seq === routeSeq) app.innerHTML = errorBox(); });
  }

  // --- môj účet ---
  function renderAccountPage() {
    if (!B.configured || !currentUser) return requireMember("account");
    if (!currentUser.publicName) return go("#/vitaj");
    app.innerHTML = `
      ${crumbs(["Môj účet"])}
      <h1 class="page-title">Môj účet</h1>
      <div class="account-grid">
        <section class="panel">
          <h2>Profil</h2>
          <p>Verejné meno: <strong>${esc(currentUser.publicName)}</strong> · <a href="#/vitaj">zmeniť</a></p>
          <p class="small">Prihlásenie cez Google: ${esc(currentUser.email || "")} (e-mail verejne nezobrazujeme)</p>
          <p><button class="btn-outline" data-signout>Odhlásiť sa</button></p>
        </section>
        <section class="panel">
          <h2>Recepty</h2>
          <p><a class="btn" href="#/pridat">+ Pridať recept</a></p>
          <p><a href="#/moje-recepty">Moje recepty a ich stav ›</a></p>
          <p><a href="#/oblubene">Moje obľúbené (${favs.size}) ›</a></p>
          ${currentUser.isAdmin ? `<p><a href="#/admin">Schvaľovanie receptov${pendingCount ? ` (${pendingCount})` : ""} ›</a></p>` : ""}
        </section>
        <section class="panel">
          <h2>Súkromie</h2>
          <p><button class="btn-outline" data-export>⬇ Stiahnuť moje údaje</button></p>
          <p class="small">Dostaneš súbor so všetkými údajmi, ktoré o tebe máme (formát JSON).</p>
          <p><button class="btn-outline btn-danger" data-delete-account>Zmazať účet</button></p>
          <p class="small">Zmaže sa účet, obľúbené, zdieľaný odkaz a neschválené recepty. Zverejnené recepty ostanú bez tvojho mena.
            <a href="#/ochrana-osobnych-udajov">Ochrana osobných údajov</a></p>
        </section>
      </div>`;
  }

  async function exportData(btn) {
    btn.disabled = true;
    try {
      const data = await B.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "domaci-pekari-moje-udaje.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      toast("Údaje sa nepodarilo stiahnuť. Skús to znova.");
    }
    btn.disabled = false;
  }

  async function deleteAccount(btn) {
    if (!confirm("Naozaj chceš zmazať svoj účet? Zmažú sa tvoje obľúbené, zdieľaný odkaz a neschválené recepty. Túto akciu nie je možné vrátiť.")) return;
    const typed = prompt("Pre potvrdenie napíš slovo ZMAZAŤ:");
    if (!typed || typed.trim().toUpperCase() !== "ZMAZAŤ") return toast("Účet nebol zmazaný.");
    btn.disabled = true;
    try {
      await B.deleteAccount();
      await applyUser(null);
      toast("Účet je zmazaný. Ďakujeme, že si bol s nami.");
      go("#/");
    } catch (e) {
      btn.disabled = false;
      toast("Účet sa nepodarilo zmazať. Skús to znova alebo nám napíš.");
    }
  }

  // --- schvaľovanie (admin) ---
  function requireAdmin() {
    if (currentUser && currentUser.isAdmin) return true;
    app.innerHTML = `<p class="empty">Táto stránka je len pre administrátora. <a href="#/">Späť na úvod</a></p>`;
    return false;
  }
  function renderAdmin(seq) {
    if (!requireAdmin()) return;
    app.innerHTML = `${crumbs(["Schvaľovanie"])}<h1 class="page-title">Schvaľovanie receptov</h1>${loading()}`;
    B.adminListPending().then((list) => {
      if (seq !== routeSeq) return;
      list.forEach(prepareDbRecipe);
      pendingCount = list.length;
      renderHeaderAccount();
      app.innerHTML = `
        ${crumbs(["Schvaľovanie"])}
        <h1 class="page-title">Schvaľovanie receptov</h1>
        <p class="page-sub">${list.length ? `Čaká ${pluralRecept(list.length)}` : "Nič nečaká na schválenie. 🎉"}</p>
        <div class="my-list">${list.map((r) => `
          <article class="my-item">
            <a href="#/admin/${r.id}" class="my-thumb">${media(r, "thumb")}</a>
            <div class="my-text">
              <a href="#/admin/${r.id}"><strong>${esc(r.title)}</strong></a>
              <div><small>${esc(r.category)} · autor ${esc(r.authorName || "?")} · ${new Date(r.createdAt).toLocaleString("sk-SK")}</small></div>
            </div>
            <a class="btn btn-small" href="#/admin/${r.id}">Skontrolovať</a>
          </article>`).join("")}</div>`;
    }).catch(() => { if (seq === routeSeq) app.innerHTML = errorBox(); });
  }

  function renderAdminEdit(id, seq) {
    if (!requireAdmin()) return;
    app.innerHTML = loading();
    B.getRecipe(id).then((r) => {
      if (seq !== routeSeq) return;
      if (!r) { app.innerHTML = errorBox("Recept sa nenašiel."); return; }
      prepareDbRecipe(r);
      app.innerHTML = `
        ${crumbs([`<a href="#/admin">Schvaľovanie</a>`, esc(r.title)])}
        <h1 class="page-title">Kontrola receptu</h1>
        <p class="page-sub">${statusBadge(r.status)} · autor <strong>${esc(r.authorName || "?")}</strong> ·
          odoslané ${new Date(r.createdAt).toLocaleString("sk-SK")} · <a href="#/recept/${r.id}" target="_blank">náhľad ako na webe ↗</a></p>
        ${recipeFormHtml(r, "admin")}`;
      const { form, photos } = setupRecipeForm(r.photoPaths.map((p, i) => ({ path: p, url: r.photos[i] })));
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const action = (e.submitter && e.submitter.dataset.action) || "save";
        const { data, errors } = readRecipeForm(form);
        const reason = form.rejectReason.value.trim();
        if (action === "reject" && !reason) errors.push("Napíš dôvod zamietnutia – autor ho uvidí.");
        showFormErrors(errors);
        if (errors.length) return;
        const buttons = form.querySelectorAll("#form-actions button");
        buttons.forEach((b) => (b.disabled = true));
        try {
          const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : null;
          await B.adminSaveRecipe(r, data, photos.filter((p) => p.path).map((p) => p.path),
            photos.filter((p) => p.blob).map((p) => p.blob), status, reason);
          // zachovať poradie: nové fotky sa pridajú na koniec
          await loadDbRecipes();
          refreshPendingCount();
          toast(action === "approve" ? "Recept je zverejnený." : action === "reject" ? "Recept je zamietnutý." : "Zmeny sú uložené.");
          go(action === "approve" ? "#/recept/" + r.id : action === "reject" ? "#/admin" : "#/admin/" + r.id);
        } catch (ex) {
          showFormErrors(["Uloženie zlyhalo: " + (ex.message || "neznáma chyba")]);
          buttons.forEach((b) => (b.disabled = false));
        }
      });
    }).catch(() => { if (seq === routeSeq) app.innerHTML = errorBox(); });
  }

  // --- zdieľanie zoznamu obľúbených ---
  async function shareFavorites(btn) {
    if (!B.configured || !currentUser) return showAuthPrompt("share");
    if (!currentUser.publicName) { returnAfterLogin = "#/oblubene"; return go("#/vitaj"); }
    btn.disabled = true;
    try {
      const token = await B.getShareToken();
      const url = location.origin + location.pathname + "#/zoznam/" + token;
      const text = `Moje obľúbené recepty na Domáci pekári a pekárky (${currentUser.publicName})`;
      if (navigator.share) {
        try { await navigator.share({ title: "Moje obľúbené recepty", text, url }); } catch (e) { /* zrušené */ }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast("Odkaz na tvoj zoznam je skopírovaný – vlož ho do správy alebo e-mailu.");
      } else {
        prompt("Skopíruj odkaz na svoj zoznam obľúbených:", url);
      }
    } catch (e) {
      toast("Odkaz sa nepodarilo vytvoriť. Skús to znova.");
    }
    btn.disabled = false;
  }

  function renderShared(token, seq) {
    if (!B.configured) { app.innerHTML = errorBox("Zdieľané zoznamy zatiaľ nie sú dostupné."); return; }
    app.innerHTML = loading();
    B.getSharedList(token).then((s) => {
      if (seq !== routeSeq) return;
      if (!s) { app.innerHTML = errorBox("Tento zoznam neexistuje alebo ho autor zrušil."); return; }
      const list = s.recipeIds.map((id) => RECIPES.find((r) => r.id === id)).filter(Boolean);
      app.innerHTML = `
        ${crumbs(["Zdieľaný zoznam"])}
        <h1 class="page-title">Obľúbené recepty – ${esc(s.publicName)}</h1>
        <p class="page-sub">${pluralRecept(list.length)}</p>
        ${grid(list, "Zoznam je zatiaľ prázdny.")}
        ${!currentUser ? `
        <section class="cta">
          <div><h2>Ulož si aj ty svoje obľúbené</h2>
            <p>Zaregistruj sa cez Google, ukladaj si recepty bez obmedzenia a zdieľaj ich s rodinou a priateľmi.</p></div>
          <a class="btn btn-light" href="#/registracia">Registrácia</a>
        </section>` : ""}`;
    }).catch(() => { if (seq === routeSeq) app.innerHTML = errorBox(); });
  }

  // --- právne stránky ---
  function renderLegal(key) {
    const page = window.PRAVNE && window.PRAVNE.stranky[key];
    if (!page) return renderHome();
    app.innerHTML = `
      ${crumbs([esc(page.title)])}
      <article class="legal">
        <h1 class="page-title">${esc(page.title)}</h1>
        ${page.html(window.PRAVNE.prevadzkovatel)}
      </article>`;
  }

  // --- prihlásený používateľ: obľúbené, hlavička ---
  let loadedFavsFor = null;
  async function applyUser(user) {
    currentUser = user;
    if (user) {
      if (loadedFavsFor !== user.id) {
        loadedFavsFor = user.id;
        // obľúbené uložené bez prihlásenia presunieme do účtu
        const local = [...loadFavs()];
        try {
          if (local.length) await B.addFavorites(local);
          favs = new Set(await B.getFavorites());
          try { localStorage.removeItem(FAV_KEY); } catch (e) { /* nič */ }
        } catch (e) {
          favs = new Set(local);
          toast("Obľúbené sa nepodarilo načítať z účtu.");
        }
      }
    } else {
      loadedFavsFor = null;
      favs = loadFavs();
      pendingCount = 0;
    }
    updateFavCount();
    renderHeaderAccount();
    refreshPendingCount();
  }

  // --- schválené recepty z databázy (uložené aj v prehliadači pre režim bez internetu) ---
  const STATIC_COUNT = RECIPES.length;
  const DB_CACHE_KEY = "pekari-recepty-db";
  function setDbRecipes(list) {
    RECIPES.splice(STATIC_COUNT, RECIPES.length - STATIC_COUNT, ...list.map(prepareDbRecipe));
  }
  try {
    const cached = JSON.parse(localStorage.getItem(DB_CACHE_KEY) || "null");
    if (Array.isArray(cached)) setDbRecipes(cached);
  } catch (e) { /* nič */ }
  async function loadDbRecipes() {
    const list = await B.listApprovedRecipes();
    setDbRecipes(list);
    try { localStorage.setItem(DB_CACHE_KEY, JSON.stringify(list)); } catch (e) { /* nič */ }
  }

  // stránky, ktoré sa po načítaní receptov / prihlásení môžu bezpečne prekresliť (nie formuláre)
  function isRedrawable(hash) {
    return !/^(pridat|vitaj|admin\/|ucet)/.test(hash);
  }

  async function startBackend() {
    if (!B.configured) return;
    try {
      const user = await B.init(async (u, event) => {
        if (event === "INITIAL_SESSION") return;
        const before = currentUser && currentUser.id;
        await applyUser(u);
        if ((u && u.id) !== before && isRedrawable(location.hash.replace(/^#\/?/, ""))) route(true);
      });
      await applyUser(user);
      // návrat z Googlu po prihlásení
      const back = B.takeReturnHash();
      if (user && back !== null) {
        returnAfterLogin = back;
        if (!user.publicName) return go("#/vitaj");
        toast(`Vitaj späť, ${user.publicName}!`);
        returnAfterLogin = null;
        return go(/prihlasenie|registracia/.test(back) ? "#/" : back);
      }
      if (user && !user.publicName && !/^#\/(vitaj|pravidla|ochrana)/.test(location.hash)) {
        returnAfterLogin = hashNow();
        return go("#/vitaj");
      }
      route(true);
    } catch (e) {
      console.warn("Prihlásenie nie je dostupné:", e);
    }
    loadDbRecipes()
      .then(() => { if (isRedrawable(location.hash.replace(/^#\/?/, ""))) route(true); })
      .catch(() => { /* bez internetu ostanú recepty z pamäte */ });
  }

  // --- navigácia ---
  // Horné menu: hlavné sekcie + rozbaľovacie Kategórie (dlaždice kategórií sú na úvodnej stránke).
  function renderNav(hash) {
    const link = (h, label) => `<a href="#/${h}"${hash === h ? ' class="active"' : ""}>${label}</a>`;
    document.getElementById("main-nav").innerHTML = `
      ${link("recepty", "Všetky recepty")}
      <div class="nav-dd">
        <button class="nav-dd-btn${hash.startsWith("kategoria/") ? " active" : ""}" aria-expanded="false">Kategórie ▾</button>
        <div class="nav-dd-menu">
          ${categories().map((c) => `<a href="#/kategoria/${slug(c)}">${CATEGORY_ICONS[c] || "🍽"} ${esc(c)}</a>`).join("")}
        </div>
      </div>
      ${link("videorecepty", "▶ Videorecepty")}`;
  }

  // --- mobil: menu v hlavičke ---
  const headerEl = document.querySelector(".site-header");
  const menuBtn = document.getElementById("menu-btn");
  function setMenu(open) {
    headerEl.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.textContent = open ? "✕" : "☰";
  }

  // --- nezhasínať obrazovku pri pečení (Wake Lock, hlavne na mobile) ---
  let wakeLock = null;
  async function setWake(on) {
    try {
      if (on) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; updateWakeBtn(); });
        toast("Obrazovka nezhasne, kým máš otvorený tento recept.");
      } else if (wakeLock) {
        await wakeLock.release();
      }
    } catch (e) {
      toast("Tento prehliadač nedovolil nechať obrazovku zapnutú.");
    }
    updateWakeBtn();
  }
  function updateWakeBtn() {
    const b = document.querySelector("[data-wake]");
    if (!b) return;
    b.setAttribute("aria-pressed", !!wakeLock);
    b.textContent = wakeLock ? "🔆 Obrazovka nezhasne ✓" : "🔆 Nezhasínať obrazovku";
  }

  // --- prepínač mobilná / počítačová verzia ---
  const VIEW_KEY = "pekari-zobrazenie";
  function renderViewSwitch() {
    let desktop = false;
    try { desktop = localStorage.getItem(VIEW_KEY) === "pocitac"; } catch (e) { return; }
    const el = document.getElementById("view-switch");
    // Ponuka sa zobrazí len na menších zariadeniach (alebo keď je počítačová verzia zapnutá).
    if (!desktop && Math.min(screen.width, screen.height) > 820) return;
    el.hidden = false;
    el.innerHTML = desktop
      ? `<button class="link-btn" data-view="mobil">📱 Zobraziť mobilnú verziu</button>`
      : `<button class="link-btn" data-view="pocitac">🖥 Zobraziť počítačovú verziu</button>`;
  }

  // --- aplikácia (PWA): inštalácia na plochu a fungovanie bez internetu ---
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let installPrompt = null;
  function renderInstall() {
    const footer = document.getElementById("install-app");
    const btns = document.querySelectorAll("[data-install]");
    if (standalone) { footer.hidden = true; return; }
    if (installPrompt) {
      btns.forEach((b) => (b.hidden = false));
      footer.hidden = false;
      footer.innerHTML = `<button class="link-btn" data-install>📲 Nainštalovať aplikáciu na plochu</button>`;
    } else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // iPhone nemá tlačidlo inštalácie, len návod
      footer.hidden = false;
      footer.innerHTML = `📲 Aplikácia na plochu: ťukni na <strong>Zdieľať</strong> <span aria-hidden="true">⎙</span> a zvoľ <strong>Pridať na plochu</strong>.`;
    }
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    renderInstall();
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    document.querySelectorAll("[data-install]").forEach((b) => (b.hidden = true));
    document.getElementById("install-app").hidden = true;
    toast("Aplikácia je nainštalovaná – nájdeš ju na ploche.");
  });
  async function install() {
    if (!installPrompt) return;
    setMenu(false);
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    document.querySelectorAll("[data-install]").forEach((b) => (b.hidden = true));
  }
  // Service worker beží len na https (GitHub Pages) alebo localhost, nie pri otvorení súboru z disku.
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // keepScroll: prekreslenie tej istej stránky (napr. po načítaní receptov z databázy) bez skoku navrch
  function route(keepScroll) {
    const hash = location.hash.replace(/^#\/?/, "");
    const seq = ++routeSeq;
    setMenu(false);
    const dlg = document.getElementById("auth-dialog");
    if (dlg && dlg.open) dlg.close();
    if (wakeLock && keepScroll !== true) wakeLock.release();
    renderNav(hash);
    if (hash.startsWith("recept/")) renderRecipe(decodeURIComponent(hash.slice(7)), seq);
    else if (hash === "prihlasenie" || hash === "registracia") renderAuthPage(hash);
    else if (hash === "vitaj") renderWelcome();
    else if (hash === "pridat") renderAddRecipe();
    else if (hash === "moje-recepty") renderMyRecipes(seq);
    else if (hash === "ucet") renderAccountPage();
    else if (hash === "admin") renderAdmin(seq);
    else if (hash.startsWith("admin/")) renderAdminEdit(hash.slice(6), seq);
    else if (hash.startsWith("zoznam/")) renderShared(hash.slice(7), seq);
    else if (window.PRAVNE && window.PRAVNE.stranky[hash]) renderLegal(hash);
    else if (hash.startsWith("kategoria/")) {
      const c = categories().find((x) => slug(x) === hash.slice(10));
      renderList(c || "Kategória", RECIPES.filter((r) => r.category === c),
        "V tejto kategórii zatiaľ nie sú recepty. Buď prvý, kto sem pridá svoj recept!");
    }
    else if (hash === "recepty") renderList("Všetky recepty", RECIPES, "");
    else if (hash === "videorecepty") renderList("Videorecepty", RECIPES.filter((r) => r.video),
      "Prvé videorecepty pripravujeme. Čoskoro tu nájdeš postupy pečenia aj na videu.");
    else if (hash === "oblubene") renderFavorites();
    else renderHome();
    if (keepScroll !== true) window.scrollTo(0, 0);
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-soon]")) {
      e.preventDefault();
      return toast("Pripravujeme – túto funkciu spustíme čoskoro.");
    }
    const t = e.target;
    if (t.closest("[data-signin]")) return signIn(t.closest("[data-signin]"));
    if (t.closest("[data-signout]")) {
      setMenu(false);
      return B.signOut().then(() => applyUser(null)).then(() => { toast("Si odhlásený."); go("#/"); });
    }
    if (t.closest("[data-share]")) return shareFavorites(t.closest("[data-share]"));
    if (t.closest("[data-export]")) return exportData(t.closest("[data-export]"));
    if (t.closest("[data-delete-account]")) return deleteAccount(t.closest("[data-delete-account]"));
    const thumb = t.closest("[data-photo]");
    if (thumb) {
      const img = document.querySelector(".recipe-img img");
      if (img) img.src = thumb.dataset.photo;
      document.querySelectorAll(".gallery-thumb").forEach((b) => b.classList.toggle("on", b === thumb));
      return;
    }
    if (e.target.closest("[data-print]")) return window.print();
    if (e.target.closest("[data-wake]")) return setWake(!wakeLock);
    if (e.target.closest("[data-install]")) return install();
    const view = e.target.closest("[data-view]");
    if (view) {
      try { localStorage.setItem(VIEW_KEY, view.dataset.view); } catch (err) { /* nič */ }
      return location.reload();
    }
    if (e.target.closest("#menu-btn")) return setMenu(!headerEl.classList.contains("menu-open"));
    if (!e.target.closest("#header-menu")) setMenu(false);

    const dd = document.querySelector(".nav-dd");
    if (e.target.closest(".nav-dd-btn")) {
      const open = dd.classList.toggle("open");
      e.target.closest(".nav-dd-btn").setAttribute("aria-expanded", open);
      return;
    }
    if (dd) dd.classList.remove("open");

    const btn = e.target.closest("[data-fav]");
    if (!btn) return;
    e.preventDefault();
    if (!toggleFav(btn.dataset.fav)) return;
    if (location.hash === "#/oblubene") return route(true);
    refreshFavButtons(btn.dataset.fav);
  });

  searchEl.addEventListener("input", () => {
    query = searchEl.value;
    const hash = location.hash.replace(/^#\/?/, "");
    if (hash) location.hash = "#/";
    else renderHome();
  });

  document.getElementById("logo").addEventListener("click", () => {
    query = "";
    searchEl.value = "";
    if (!location.hash.replace(/^#\/?/, "")) renderHome();
  });

  document.getElementById("footer-cats").innerHTML = categories()
    .map((c) => `<a href="#/kategoria/${slug(c)}">${esc(c)}</a>`).join("");
  document.getElementById("year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", route);
  // Po návrate do prehliadača (napr. z inej aplikácie) prehliadač zámok obrazovky uvoľní.
  document.addEventListener("visibilitychange", () => updateWakeBtn());
  renderViewSwitch();
  renderInstall();
  // V nainštalovanej aplikácii nemá prepínač počítačovej verzie zmysel.
  if (standalone) document.getElementById("view-switch").hidden = true;
  window.addEventListener("offline", () => toast("Si offline – recepty, ktoré si už otvoril, sa dajú čítať aj bez internetu."));
  updateFavCount();
  renderHeaderAccount();
  route();
  startBackend();
})();
