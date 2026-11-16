// Texty právnych stránok. Údaje v [HRANATÝCH ZÁTVORKÁCH] treba pred spustením doplniť.
// Text pripravil asistent ako podklad – pred zverejnením ho odporúčame dať skontrolovať právnikovi.
window.PRAVNE = {
  prevadzkovatel: {
    meno: "[MENO A PRIEZVISKO / NÁZOV FIRMY]",
    ico: "[IČO – ak ide o firmu alebo živnosť]",
    adresa: "[ADRESA / SÍDLO]",
    email: "[KONTAKTNÝ E-MAIL]",
    ucinnost: "[DÁTUM ÚČINNOSTI]"
  }
};

window.PRAVNE.stranky = {
  "ochrana-osobnych-udajov": {
    title: "Ochrana osobných údajov",
    html: (p) => `
<p class="legal-note">Platné od ${p.ucinnost}</p>

<h2>1. Kto spracúva tvoje údaje</h2>
<p>Prevádzkovateľom webu <strong>Domáci pekári a pekárky</strong> a správcom tvojich osobných údajov je:</p>
<p>${p.meno}<br>${p.ico}<br>${p.adresa}<br>E-mail: ${p.email}</p>
<p>S otázkami k osobným údajom sa obráť na uvedený e-mail.</p>

<h2>2. Aké údaje spracúvame a prečo</h2>
<table class="legal-table">
  <thead><tr><th>Údaje</th><th>Účel</th><th>Právny základ</th></tr></thead>
  <tbody>
    <tr><td>E-mail a identifikátor účtu Google (pri prihlásení cez Google)</td><td>Vytvorenie a vedenie používateľského účtu, prihlásenie</td><td>Plnenie zmluvy – podmienok používania webu (čl. 6 ods. 1 písm. b GDPR)</td></tr>
    <tr><td>Verejné meno, ktoré si zvolíš</td><td>Zobrazenie pri tvojich receptoch a zdieľanom zozname obľúbených</td><td>Plnenie zmluvy (čl. 6 ods. 1 písm. b GDPR)</td></tr>
    <tr><td>Recepty a fotografie, ktoré pridáš</td><td>Schválenie a zverejnenie receptu na webe</td><td>Plnenie zmluvy (čl. 6 ods. 1 písm. b GDPR)</td></tr>
    <tr><td>Zoznam obľúbených receptov a odkaz na jeho zdieľanie</td><td>Uloženie obľúbených v účte a ich zdieľanie, ak o to požiadaš</td><td>Plnenie zmluvy (čl. 6 ods. 1 písm. b GDPR)</td></tr>
    <tr><td>Technické záznamy (IP adresa, čas prístupu) u poskytovateľov hostingu</td><td>Bezpečnosť a prevádzka webu</td><td>Oprávnený záujem (čl. 6 ods. 1 písm. f GDPR)</td></tr>
  </tbody>
</table>
<p>Meno, priezvisko ani profilovú fotku z tvojho účtu Google <strong>verejne nezobrazujeme</strong>. Verejne je viditeľné len verejné meno, ktoré si sám zvolíš.</p>
<p>Bez prihlásenia sa žiadne osobné údaje na našom serveri neukladajú. Obľúbené recepty sa vtedy ukladajú len v tvojom prehliadači.</p>

<h2>3. Kto ďalší má k údajom prístup</h2>
<p>Údaje nepredávame ani neposkytujeme na marketing. Využívame týchto sprostredkovateľov:</p>
<ul>
  <li><strong>Supabase Inc.</strong> – databáza, prihlásenie a úložisko fotografií. Údaje sú uložené v dátovom centre v Európskej únii (Frankfurt).</li>
  <li><strong>Vercel Inc.</strong> – hosting webu.</li>
  <li><strong>Google Ireland Limited / Google LLC</strong> – overenie totožnosti pri prihlásení cez Google.</li>
</ul>
<p>Niektorí sprostredkovatelia sídlia v USA. Prenos údajov sa riadi rámcom EÚ – USA na ochranu osobných údajov (Data Privacy Framework) alebo štandardnými zmluvnými doložkami schválenými Európskou komisiou.</p>

<h2>4. Ako dlho údaje uchovávame</h2>
<ul>
  <li>Údaje účtu, obľúbené a zdieľaný odkaz – kým účet nezmažeš.</li>
  <li>Neschválené a zamietnuté recepty – kým účet nezmažeš alebo kým recept nezmažeš.</li>
  <li>Schválené (zverejnené) recepty – ostávajú na webe aj po zmazaní účtu, ale už bez tvojho mena. Ak chceš zmazať aj zverejnený recept, napíš nám.</li>
  <li>Technické záznamy u poskytovateľov hostingu – podľa ich pravidiel, spravidla niekoľko týždňov.</li>
</ul>

<h2>5. Tvoje práva</h2>
<p>Máš právo:</p>
<ul>
  <li>na <strong>prístup</strong> k svojim údajom – v časti <a href="#/ucet">Môj účet</a> si ich môžeš stiahnuť,</li>
  <li>na <strong>opravu</strong> – verejné meno zmeníš v časti Môj účet,</li>
  <li>na <strong>vymazanie</strong> – účet zmažeš v časti Môj účet,</li>
  <li>na <strong>prenosnosť</strong> – stiahnuté údaje sú v strojovo čitateľnom formáte JSON,</li>
  <li>na <strong>obmedzenie spracúvania</strong> a <strong>námietku</strong> proti spracúvaniu na základe oprávneného záujmu,</li>
  <li>podať <strong>sťažnosť</strong> na Úrad na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava, <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener">dataprotection.gov.sk</a>.</li>
</ul>
<p>Ostatné práva uplatníš e-mailom na ${p.email}. Odpovieme najneskôr do jedného mesiaca.</p>

<h2>6. Vek</h2>
<p>Účet si môžu vytvoriť osoby staršie ako 16 rokov. Mladší používatelia potrebujú súhlas rodiča alebo zákonného zástupcu.</p>

<h2>7. Zmeny</h2>
<p>Tieto zásady môžeme aktualizovať. Aktuálna verzia je vždy na tejto stránke spolu s dátumom účinnosti.</p>`
  },

  "cookies": {
    title: "Používanie cookies",
    html: (p) => `
<p class="legal-note">Platné od ${p.ucinnost}</p>
<p>Web <strong>nepoužíva reklamné ani analytické cookies</strong> a nesleduje ťa naprieč inými webmi.
Ukladáme do tvojho prehliadača len to, čo je nevyhnutné na fungovanie webu, preto na to nepotrebujeme tvoj súhlas.</p>

<table class="legal-table">
  <thead><tr><th>Čo sa ukladá</th><th>Na čo slúži</th><th>Ako dlho</th></tr></thead>
  <tbody>
    <tr><td>Prihlásenie (Supabase)</td><td>Aby si ostal prihlásený</td><td>Kým sa neodhlásiš</td></tr>
    <tr><td>Obľúbené recepty (bez prihlásenia)</td><td>Uloženie najviac 3 obľúbených receptov v prehliadači</td><td>Kým ich nevymažeš</td></tr>
    <tr><td>Voľba zobrazenia (mobilná / počítačová verzia)</td><td>Zapamätanie tvojej voľby</td><td>Kým ju nezmeníš</td></tr>
    <tr><td>Uložené súbory aplikácie (service worker)</td><td>Rýchlejšie načítanie a čítanie receptov bez internetu</td><td>Kým ich prehliadač nevymaže</td></tr>
  </tbody>
</table>

<p>Písma máme uložené na vlastnom serveri, takže sa pri návšteve nenačítavajú zo serverov tretích strán.</p>
<p>Uložené údaje môžeš kedykoľvek vymazať v nastaveniach prehliadača (vymazanie údajov stránok).</p>
<p>Ak v budúcnosti pridáme reklamy alebo meranie návštevnosti, najprv ťa požiadame o súhlas.</p>`
  },

  "pravidla": {
    title: "Pravidlá komunity",
    html: (p) => `
<p class="legal-note">Platné od ${p.ucinnost}</p>
<ol class="legal-list">
  <li>Pridávaj len recepty a fotografie, ktoré sú <strong>tvoje vlastné</strong> alebo na ktoré máš právo. Nekopíruj texty ani fotky z iných webov, kníh či časopisov.</li>
  <li>Pridaním receptu nám udeľuješ bezplatné, nevýhradné a časovo neobmedzené právo zverejniť ho na tomto webe a v jeho aplikácii, upraviť ho (napr. opraviť preklepy, zjednotiť formát) a uviesť pri ňom tvoje verejné meno.</li>
  <li>Každý recept pred zverejnením skontroluje administrátor. Môže ho upraviť, zverejniť alebo zamietnuť s uvedením dôvodu.</li>
  <li>Na fotografiách nesmú byť rozpoznateľné osoby bez ich súhlasu, logá ani nevhodný obsah.</li>
  <li>Verejné meno nesmie byť urážlivé, zavádzajúce ani vydávať sa za inú osobu či firmu.</li>
  <li>Účet, ktorý porušuje pravidlá, môžeme zablokovať alebo zmazať.</li>
  <li>Otázky a podnety posielaj na ${p.email}.</li>
</ol>`
  }
};
