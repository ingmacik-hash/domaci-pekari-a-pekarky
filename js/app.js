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

  // --- obľúbené (localStorage) ---
  function loadFavs() {
    try {
      return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []);
    } catch (e) {
      return new Set();
    }
  }
  let favs = loadFavs();

  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
    } catch (e) { /* bez úložiska sa obľúbené len neuložia */ }
    updateFavCount();
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

  function author() {
    return `<span class="author"><span class="avatar">DP</span>${AUTHOR}</span>`;
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
    const quick = [...RECIPES].sort((a, b) => a.time - b.time).slice(0, 5);
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
            <h2>Najrýchlejšie recepty</h2>
            <ol>
              ${quick.map((r) => `
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
        <div class="section-head"><h2>Najnovšie recepty</h2><a href="#/recepty">Ďalšie recepty ›</a></div>
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
        <button class="btn btn-light" data-soon>+ Pridať recept</button>
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

  function renderList(title, list, emptyText) {
    app.innerHTML = `
      ${crumbs([esc(title)])}
      <h1 class="page-title">${esc(title)}</h1>
      <p class="page-sub">${pluralRecept(list.length)}</p>
      ${ad("leaderboard")}
      ${grid(list, emptyText)}`;
  }

  function renderRecipe(id) {
    const r = RECIPES.find((x) => x.id === id);
    if (!r) {
      app.innerHTML = `<p class="empty">Recept sa nenašiel. <a href="#/">Späť na úvod</a></p>`;
      return;
    }
    let servings = r.servings;
    const related = RECIPES.filter((x) => x.category === r.category && x.id !== r.id);
    const more = related.length ? related : RECIPES.filter((x) => x.id !== r.id).slice(0, 3);

    app.innerHTML = `
      ${crumbs([`<a href="#/kategoria/${slug(r.category)}">${esc(r.category)}</a>`])}
      <article class="recipe">
        <header class="recipe-title">
          <span class="kicker">${esc(r.category)}</span>
          <h1>${esc(r.title)}</h1>
          <div class="byline">${author()}</div>
          <p class="lead">${esc(r.description)}</p>
          <div class="actions">
            ${favButton(r.id, true)}
            <button class="btn-outline" data-print>🖨 Vytlačiť recept</button>
          </div>
        </header>

        <figure class="recipe-figure">
          ${media(r, "recipe-img")}
          ${r.credit ? `<figcaption>Foto: <a href="${esc(r.credit.url)}" target="_blank" rel="noopener">${esc(r.credit.author)}</a>, ${esc(r.credit.license)}, Wikimedia Commons</figcaption>` : ""}
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
            <button class="btn" data-soon>Prihlás sa a pridaj komentár</button>
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
        .map((i) => `<li><label><input type="checkbox"> <strong>${formatAmount(i.amount * k)} ${esc(i.unit)}</strong> ${esc(i.name)}</label></li>`)
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

  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    renderNav(hash);
    if (hash.startsWith("recept/")) renderRecipe(hash.slice(7));
    else if (hash.startsWith("kategoria/")) {
      const c = categories().find((x) => slug(x) === hash.slice(10));
      renderList(c || "Kategória", RECIPES.filter((r) => r.category === c),
        "V tejto kategórii zatiaľ nie sú recepty. Buď prvý, kto sem pridá svoj recept!");
    }
    else if (hash === "recepty") renderList("Všetky recepty", RECIPES, "");
    else if (hash === "videorecepty") renderList("Videorecepty", RECIPES.filter((r) => r.video),
      "Prvé videorecepty pripravujeme. Čoskoro tu nájdeš postupy pečenia aj na videu.");
    else if (hash === "oblubene") renderList("Moje obľúbené", RECIPES.filter((r) => favs.has(r.id)),
      "Zatiaľ nemáš žiadne obľúbené. Klikni na ♡ pri recepte.");
    else renderHome();
    window.scrollTo(0, 0);
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
      return toast("Pripravujeme – registrácia, pridávanie receptov a komentáre budú čoskoro.");
    }
    if (e.target.closest("[data-print]")) return window.print();

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
    toggleFav(btn.dataset.fav);
    if (location.hash === "#/oblubene") return route();
    btn.outerHTML = favButton(btn.dataset.fav, btn.classList.contains("big"));
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
  updateFavCount();
  route();
})();
