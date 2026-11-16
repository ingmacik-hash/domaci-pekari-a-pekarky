// Spúšťa sa pri nasadení na Vercel (vercel.json → buildCommand).
// Z premenných prostredia, ktoré nastaví integrácia Supabase vo Verceli,
// vytvorí js/supabase-config.js s adresou projektu a VEREJNÝM kľúčom.
// Tajný kľúč (service_role / secret) sa na stránku nikdy nesmie dostať – skript to stráži.
const fs = require("fs");
const path = require("path");

// Integrácia môže premenné pomenovať s rôznou predponou: PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL… Hľadáme preto podľa konca názvu.
function pick(...suffixes) {
  for (const suffix of suffixes) {
    const name = Object.keys(process.env)
      .filter((n) => n === suffix || n.endsWith("_" + suffix))
      .sort((a, b) => a.length - b.length)[0];   // pri viacerých vyhrá najkratší názov
    if (name && process.env[name].trim()) {
      console.log("Použitá premenná:", name);
      return process.env[name];
    }
  }
  return null;
}

const url = pick("SUPABASE_URL");
const key = pick("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY");

function isSecretKey(k) {
  if (k.startsWith("sb_secret_")) return true;
  const parts = k.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
      return payload.role === "service_role";
    } catch (e) { /* nie je JWT */ }
  }
  return false;
}

const out = path.join(__dirname, "..", "js", "supabase-config.js");
let config = {};

if (url && key) {
  if (isSecretKey(key)) {
    console.error("CHYBA: nájdený kľúč je TAJNÝ (service_role/secret). Na stránku patrí len verejný anon/publishable kľúč.");
    process.exit(1);
  }
  config = { supabaseUrl: url.trim().replace(/\/+$/, ""), supabaseKey: key.trim() };
  console.log("Supabase nastavený:", config.supabaseUrl);
} else {
  console.log("Supabase nie je nastavený (chýbajú premenné prostredia) – web pobeží bez prihlasovania.");
}

fs.writeFileSync(
  out,
  "// Vytvorené automaticky pri nasadení (scripts/vytvor-config.js). Needituj ručne.\n" +
    "window.PEKARI_CONFIG = " + JSON.stringify(config) + ";\n"
);
