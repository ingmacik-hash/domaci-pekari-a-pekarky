// Service worker – stránka funguje ako aplikácia a recepty sa dajú čítať aj bez internetu.
//
// Stratégia:
//  - stránka, štýly, skripty (aj recepty v recipes.js): najprv internet, bez internetu z pamäte.
//    Vďaka tomu sa zmeny na webe prejavia hneď a netreba meniť verziu pri každej úprave.
//  - fotky a písma: najprv z pamäte (rýchle, šetrí dáta), uložia sa pri prvom zobrazení.
// Verziu CACHE zmeň len vtedy, keď treba vymazať všetko uložené (napr. po premenovaní súborov).
// Prihlásenie a databáza (Supabase) idú vždy priamo na internet – nikdy sa neukladajú.
const CACHE = "pekari-v2";
const CORE = [
  "./",
  "index.html",
  "css/fonts.css",
  "css/styles.css",
  "fonts/inter-latin.woff2",
  "fonts/inter-latin-ext.woff2",
  "fonts/outfit-latin.woff2",
  "fonts/outfit-latin-ext.woff2",
  "js/supabase-config.js",
  "js/vendor/supabase.min.js",
  "js/backend.js",
  "js/pravne.js",
  "js/recipes.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-48.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAsset(url) {
  return /\.(jpe?g|png|webp|gif|svg|woff2?)$/i.test(url.pathname) ||
    url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !isAsset(url)) return; // napr. YouTube videá nechávame tak

  if (isAsset(url)) {
    // fotky a písma: z pamäte, inak stiahnuť a uložiť
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // stránka a skripty: z internetu, uložiť kópiu; bez internetu z pamäte
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then((hit) =>
        hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error())
      )
    )
  );
});
