(function () {
  const app = document.getElementById("app");
  const favCountEl = document.getElementById("fav-count");
  const FAV_KEY = "pekari-oblubene";

  const state = { query: "", category: "Všetko" };

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

  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function favButton(id) {
    const on = favs.has(id);
    return `<button class="fav-btn${on ? " on" : ""}" data-fav="${id}"
      aria-pressed="${on}" title="${on ? "Odobrať z obľúbených" : "Pridať do obľúbených"}">${on ? "♥" : "♡"}</button>`;
  }

  // Fotka receptu, ak je zadaná (pole image), inak emoji na farebnom pozadí.
  function media(r, cls) {
    const inner = r.image ? `<img src="${esc(r.image)}" alt="${esc(r.title)}" loading="lazy">` : r.emoji;
    return `<div class="${cls} cat-${normalize(r.category)}">${inner}</div>`;
  }

  function card(r) {
    return `
      <article class="card">
        <a href="#/recept/${r.id}" class="card-link">
          ${media(r, "card-img")}
          <div class="card-body">
            <span class="tag">${esc(r.category)}</span>
            <h3>${esc(r.title)}</h3>
            <p>${esc(r.description)}</p>
            <div class="meta">⏱ ${formatTime(r.time)} · ${esc(r.difficulty)}</div>
          </div>
        </a>
        ${favButton(r.id)}
      </article>`;
  }

  // --- stránky ---
  function renderHome() {
    const categories = ["Všetko", ...new Set(RECIPES.map((r) => r.category))];
    const f = RECIPES[0]; // recept týždňa
    app.innerHTML = `
      <section class="hero hero-split">
        <div class="hero-text">
          <p class="eyebrow">Receptár domácich pekárov a pekárok</p>
          <h1>Pečieme doma, <em>s&nbsp;láskou</em> a&nbsp;bez&nbsp;zhonu.</h1>
          <p>Chlieb, pečivo, koláče aj kvások – overené v domácich kuchyniach.</p>
          <input type="search" id="search" placeholder="Hľadaj recept alebo surovinu…"
            value="${esc(state.query)}" aria-label="Hľadať recept">
        </div>
        <a class="featured" href="#/recept/${f.id}">
          ${media(f, "featured-img")}
          <div class="featured-label">
            <span class="tag">Recept týždňa</span>
            <h2>${esc(f.title)}</h2>
            <span class="meta">${formatTime(f.time)} · ${esc(f.difficulty)}</span>
          </div>
        </a>
      </section>
      <div class="filters" role="tablist">
        ${categories.map((c) => `
          <button class="chip${c === state.category ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}
      </div>
      <div id="grid" class="grid"></div>`;

    const search = document.getElementById("search");
    search.addEventListener("input", () => {
      state.query = search.value;
      renderGrid();
    });
    app.querySelectorAll("[data-cat]").forEach((b) =>
      b.addEventListener("click", () => {
        state.category = b.dataset.cat;
        app.querySelectorAll("[data-cat]").forEach((x) => x.classList.toggle("active", x === b));
        renderGrid();
      })
    );
    renderGrid();
  }

  function renderGrid() {
    const q = normalize(state.query.trim());
    const list = RECIPES.filter((r) => {
      if (state.category !== "Všetko" && r.category !== state.category) return false;
      if (!q) return true;
      const hay = normalize([r.title, r.description, r.category, ...r.ingredients.map((i) => i.name)].join(" "));
      return hay.includes(q);
    });
    document.getElementById("grid").innerHTML = list.length
      ? list.map(card).join("")
      : `<p class="empty">Nenašli sa žiadne recepty. Skús iné hľadanie.</p>`;
  }

  function renderFavorites() {
    const list = RECIPES.filter((r) => favs.has(r.id));
    app.innerHTML = `
      <section class="hero small"><h1>Obľúbené recepty</h1></section>
      <div class="grid">
        ${list.length ? list.map(card).join("")
          : `<p class="empty">Zatiaľ nemáš žiadne obľúbené. Klikni na ♡ pri recepte.</p>`}
      </div>`;
  }

  function renderRecipe(id) {
    const r = RECIPES.find((x) => x.id === id);
    if (!r) {
      app.innerHTML = `<p class="empty">Recept sa nenašiel. <a href="#/">Späť na recepty</a></p>`;
      return;
    }
    let servings = r.servings;

    app.innerHTML = `
      <a href="#/" class="back">← Späť na recepty</a>
      <article class="recipe">
        <header class="recipe-head">
          <figure class="recipe-figure">
            ${media(r, "recipe-img")}
            ${r.credit ? `<figcaption>Foto: <a href="${esc(r.credit.url)}" target="_blank" rel="noopener">${esc(r.credit.author)}</a>, ${esc(r.credit.license)}, Wikimedia Commons</figcaption>` : ""}
          </figure>
          <div>
            <span class="tag">${esc(r.category)}</span>
            <h1>${esc(r.title)}</h1>
            <p>${esc(r.description)}</p>
            <div class="facts">
              <div><strong>${formatTime(r.time)}</strong><span>čas</span></div>
              <div><strong>${esc(r.difficulty)}</strong><span>náročnosť</span></div>
            </div>
            ${favButton(r.id)}
          </div>
        </header>
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
      </article>`;

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
    window.scrollTo(0, 0);
  }

  // --- smerovanie ---
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    if (hash.startsWith("recept/")) renderRecipe(hash.slice(7));
    else if (hash === "oblubene") renderFavorites();
    else renderHome();
  }

  app.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fav]");
    if (!btn) return;
    e.preventDefault();
    toggleFav(btn.dataset.fav);
    if (location.hash === "#/oblubene") return renderFavorites();
    const on = favs.has(btn.dataset.fav);
    btn.classList.toggle("on", on);
    btn.textContent = on ? "♥" : "♡";
    btn.setAttribute("aria-pressed", on);
    btn.title = on ? "Odobrať z obľúbených" : "Pridať do obľúbených";
  });

  document.getElementById("year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", route);
  updateFavCount();
  route();
})();
