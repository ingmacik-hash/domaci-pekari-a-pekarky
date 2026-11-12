// Dáta receptov. Nový recept pridáš ako ďalší objekt do poľa.
// Množstvá ingrediencií (amount) sa prepočítavajú podľa počtu porcií.
// Fotka: ulož ju do priečinka img/ a pridaj k receptu napr. image: "../../img/kvaskovy-chlieb.jpg".
// Bez fotky sa zobrazí emoji.
const RECIPES = [
  {
    id: "kvaskovy-chlieb",
    image: "../../img/kvaskovy-chlieb.jpg",
    credit: { author: "Nutrition, Food Safety & Health", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Loaf_of_sourdough_bread_cooling.jpg" },
    title: "Kváskový pšenično-ražný chlieb",
    category: "Chlieb",
    emoji: "🍞",
    time: 1440,
    difficulty: "Stredná",
    servings: 1,
    servingsUnit: "bochník",
    description: "Klasický domáci chlieb s chrumkavou kôrkou a vláčnou striedkou. Základ každého domáceho pekára.",
    ingredients: [
      { amount: 100, unit: "g", name: "aktívny kvások" },
      { amount: 400, unit: "g", name: "pšeničná chlebová múka T650" },
      { amount: 100, unit: "g", name: "ražná múka T960" },
      { amount: 350, unit: "ml", name: "vlažná voda" },
      { amount: 10, unit: "g", name: "soľ" },
      { amount: 1, unit: "ČL", name: "rasca (podľa chuti)" }
    ],
    steps: [
      "Zmiešaj múky s 320 ml vody a nechaj 30–60 minút odpočívať (autolýza).",
      "Pridaj kvások, soľ, rascu a zvyšnú vodu. Dôkladne zapracuj.",
      "Počas 3 hodín urob 4 série prekladov s odstupom 30 minút.",
      "Cesto nechaj kysnúť, kým nezväčší objem asi o polovicu.",
      "Vytvaruj bochník, vlož do ošatky a nechaj cez noc v chladničke.",
      "Rúru s hrncom rozohrej na 250 °C. Bochník narež a pečie 20 minút s pokrievkou.",
      "Odkry, zníž na 220 °C a dopeč 20–25 minút do tmavozlatej farby.",
      "Nechaj úplne vychladnúť na mriežke, až potom krájaj."
    ]
  },
  {
    id: "rozky",
    image: "../../img/rozky.jpg",
    credit: { author: "Petar Milošević", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Kifli_made_with_spelt_flour_(Serbian_cuisine).jpg" },
    title: "Domáce maslové rožky",
    category: "Pečivo",
    emoji: "🥐",
    time: 150,
    difficulty: "Ľahká",
    servings: 12,
    servingsUnit: "ks",
    description: "Mäkké rožky na raňajky, ktoré zvládne aj úplný začiatočník.",
    ingredients: [
      { amount: 500, unit: "g", name: "polohrubá múka" },
      { amount: 20, unit: "g", name: "čerstvé droždie" },
      { amount: 300, unit: "ml", name: "vlažné mlieko" },
      { amount: 60, unit: "g", name: "maslo" },
      { amount: 1, unit: "ČL", name: "cukor" },
      { amount: 10, unit: "g", name: "soľ" },
      { amount: 1, unit: "ks", name: "vajce na potretie" }
    ],
    steps: [
      "Droždie rozmiešaj v časti mlieka s cukrom a nechaj vzísť kvások.",
      "Pridaj múku, soľ, zvyšné mlieko a rozpustené maslo. Vymiesi hladké cesto.",
      "Nechaj kysnúť na teplom mieste asi hodinu.",
      "Rozdeľ na 12 dielov, vyval trojuholníky a zroluj rožky.",
      "Nechaj 20 minút dokysnúť, potri vajcom, posyp soľou alebo rascou.",
      "Pečie pri 200 °C 15–18 minút do zlatista."
    ]
  },
  {
    id: "babovka",
    image: "../../img/babovka.jpg",
    credit: { author: "Thomas a Maximilian Högner", license: "voľné dielo", url: "https://commons.wikimedia.org/wiki/File:Marmorkuchen.jpg" },
    title: "Mramorová bábovka",
    category: "Koláče",
    emoji: "🍰",
    time: 75,
    difficulty: "Ľahká",
    servings: 10,
    servingsUnit: "porcií",
    description: "Babičkina nedeľná klasika so svetlým a kakaovým cestom.",
    ingredients: [
      { amount: 250, unit: "g", name: "zmäknuté maslo" },
      { amount: 200, unit: "g", name: "práškový cukor" },
      { amount: 4, unit: "ks", name: "vajcia" },
      { amount: 300, unit: "g", name: "hladká múka" },
      { amount: 1, unit: "bal.", name: "prášok do pečiva" },
      { amount: 150, unit: "ml", name: "mlieko" },
      { amount: 2, unit: "PL", name: "kakao" }
    ],
    steps: [
      "Maslo vymiešaj s cukrom do peny, postupne pridávaj vajcia.",
      "Múku zmiešaj s práškom do pečiva a striedavo s mliekom vmiešaj do masy.",
      "Tretinu cesta zafarbi kakaom.",
      "Do vymastenej formy nalej svetlé cesto, na vrch kakaové a vidličkou premiešaj vlnky.",
      "Pečie pri 170 °C asi 50 minút (skúška špajdľou).",
      "Po vychladnutí vyklop a posyp cukrom."
    ]
  },
  {
    id: "kvasok",
    image: "../../img/kvasok.jpg",
    credit: { author: "Jeuwre", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Sourdough_starter_001.jpg" },
    title: "Založenie kvásku od nuly",
    category: "Kvások",
    emoji: "🫙",
    time: 10080,
    difficulty: "Ľahká",
    servings: 1,
    servingsUnit: "pohár",
    description: "Za týždeň si vypestuješ vlastný ražný kvások, ktorý ti vydrží roky.",
    ingredients: [
      { amount: 50, unit: "g", name: "celozrnná ražná múka (denne)" },
      { amount: 50, unit: "ml", name: "vlažná voda (denne)" }
    ],
    steps: [
      "Deň 1: v čistom pohári zmiešaj múku s vodou, prikry utierkou.",
      "Deň 2–3: každý deň pridaj rovnakú dávku múky a vody, premiešaj.",
      "Deň 4: odober polovicu a znova nakŕm. Mali by sa objaviť bublinky.",
      "Deň 5–7: opakuj odoberanie a kŕmenie raz až dvakrát denne.",
      "Kvások je pripravený, keď do 4–8 hodín po nakŕmení zdvojnásobí objem.",
      "Skladuj v chladničke a kŕm raz týždenne."
    ]
  },
  {
    id: "kysnuty-kolac-tvaroh-slivky",
    image: "../../img/kysnuty-kolac-tvaroh-slivky.jpg",
    credit: { author: "Silar", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Baskidische_Pflaumenkuchen..JPG" },
    title: "Kysnutý koláč s tvarohom a slivkami",
    category: "Koláče",
    emoji: "🥧",
    time: 120,
    difficulty: "Stredná",
    servings: 20,
    servingsUnit: "kúskov",
    description: "Plech voňavého kysnutého koláča s tvarohom, slivkami a mrveničkou.",
    ingredients: [
      { amount: 500, unit: "g", name: "polohrubá múka" },
      { amount: 25, unit: "g", name: "čerstvé droždie" },
      { amount: 250, unit: "ml", name: "mlieko" },
      { amount: 80, unit: "g", name: "cukor" },
      { amount: 80, unit: "g", name: "maslo" },
      { amount: 2, unit: "ks", name: "žĺtky" },
      { amount: 500, unit: "g", name: "tvaroh" },
      { amount: 600, unit: "g", name: "slivky" }
    ],
    steps: [
      "Priprav kvások z droždia, časti mlieka a lyžičky cukru.",
      "Zamiesi cesto z múky, kvásku, mlieka, cukru, masla a žĺtkov. Nechaj vykysnúť.",
      "Tvaroh vymiešaj s cukrom a vanilkovým cukrom podľa chuti.",
      "Cesto rozvaľkaj na plech, natri tvarohom a poukladaj polené slivky.",
      "Posyp mrveničkou (maslo, múka, cukor) a nechaj 15 minút dokysnúť.",
      "Pečie pri 180 °C 35–40 minút."
    ]
  },
  {
    id: "pizza",
    image: "../../img/pizza.jpg",
    credit: { author: "N i c o l a", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Pizza_(17449082012).jpg" },
    title: "Pizza cesto na celú noc",
    category: "Slané",
    emoji: "🍕",
    time: 1080,
    difficulty: "Ľahká",
    servings: 4,
    servingsUnit: "pizze",
    description: "Ľahké, vzdušné cesto s minimom droždia, ktoré dozrieva v chladničke.",
    ingredients: [
      { amount: 600, unit: "g", name: "múka typ 00" },
      { amount: 390, unit: "ml", name: "studená voda" },
      { amount: 3, unit: "g", name: "čerstvé droždie" },
      { amount: 15, unit: "g", name: "soľ" },
      { amount: 1, unit: "PL", name: "olivový olej" }
    ],
    steps: [
      "Droždie rozpusť vo vode, pridaj múku a premiešaj.",
      "Po 20 minútach pridaj soľ a olej, miesi 10 minút do hladka.",
      "Prikry a nechaj 2 hodiny pri izbovej teplote.",
      "Rozdeľ na 4 guľky a daj na 12–24 hodín do chladničky.",
      "2 hodiny pred pečením vyber, potom rukami roztiahni placky.",
      "Pečie na rozpálenom kameni alebo plechu pri maximálnej teplote 6–8 minút."
    ]
  },
  {
    id: "pagace",
    image: "../../img/pagace.jpg",
    credit: { author: "robot-girl", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Hungarian_Pogácsa.jpg" },
    title: "Oškvarkové pagáče",
    category: "Slané",
    emoji: "🥯",
    time: 180,
    difficulty: "Náročná",
    servings: 30,
    servingsUnit: "ks",
    description: "Lístkové pagáče s oškvarkami, ktoré sa trhajú na vrstvy.",
    ingredients: [
      { amount: 500, unit: "g", name: "hladká múka" },
      { amount: 20, unit: "g", name: "čerstvé droždie" },
      { amount: 200, unit: "ml", name: "mlieko" },
      { amount: 100, unit: "ml", name: "kyslá smotana" },
      { amount: 300, unit: "g", name: "mleté oškvarky" },
      { amount: 1, unit: "ks", name: "vajce" },
      { amount: 12, unit: "g", name: "soľ" }
    ],
    steps: [
      "Zamiesi cesto z múky, droždia, mlieka, smotany, soli a nechaj 30 minút odpočívať.",
      "Rozvaľkaj, natri tretinou oškvarkov a prelož na tretiny.",
      "Nechaj 20 minút v chlade a postup zopakuj ešte dvakrát.",
      "Rozvaľkaj na hrúbku 2 cm, vrch nožom nakresli mriežku a vykrajuj pagáče.",
      "Potri vajcom a nechaj 20 minút dokysnúť.",
      "Pečie pri 200 °C asi 20 minút."
    ]
  },
  {
    id: "celozrnny-toast",
    image: "../../img/celozrnny-toast.jpg",
    credit: { author: "muffinn", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Wholemeal_tin_loaf_(8371640548).jpg" },
    title: "Celozrnný toastový chlieb",
    category: "Chlieb",
    emoji: "🍞",
    time: 180,
    difficulty: "Ľahká",
    servings: 1,
    servingsUnit: "forma",
    description: "Mäkký chlieb vo forme, ideálny na sendviče a do hriankovača.",
    ingredients: [
      { amount: 250, unit: "g", name: "celozrnná pšeničná múka" },
      { amount: 250, unit: "g", name: "chlebová múka" },
      { amount: 7, unit: "g", name: "sušené droždie" },
      { amount: 320, unit: "ml", name: "vlažné mlieko" },
      { amount: 30, unit: "g", name: "maslo" },
      { amount: 1, unit: "PL", name: "med" },
      { amount: 9, unit: "g", name: "soľ" }
    ],
    steps: [
      "Všetky suroviny okrem masla zmiešaj, miesi 5 minút, potom zapracuj maslo.",
      "Miesi ďalších 5–8 minút, kým cesto nie je pružné.",
      "Nechaj kysnúť hodinu, potom vytvaruj valec a vlož do vymastenej formy.",
      "Nechaj kysnúť, kým cesto nevystúpi nad okraj formy.",
      "Pečie pri 190 °C 30–35 minút. Ihneď vyber z formy a nechaj vychladnúť."
    ]
  }
];
