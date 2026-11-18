(function () {
  var bar = document.getElementById("saleBar");
  var close = document.getElementById("saleBarClose");
  var buySel = "button.add-to-cart-button,button[data-testid='buttonAddToCart']";
  var sticky = null;
  var basePad = 0;

  function barH() {
    return bar && !bar.hidden && getComputedStyle(bar).display !== "none"
      ? Math.ceil(bar.getBoundingClientRect().height)
      : 0;
  }

  function layout() {
    if (!document.body) return;
    document.body.style.paddingBottom = basePad + barH() + "px";
    if (sticky) sticky.style.bottom = barH() + "px";
  }

  function vis(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0;
  }

  function up() {
    if (sticky) {
      var b = document.querySelector(buySel);
      sticky.classList.toggle(
        "sticky-atc--show",
        !!b && (scrollY || pageYOffset) > 150 && !vis(b)
      );
    }
    layout();
  }

  function unlazy() {
    document
      .querySelectorAll(".instagram-section img,.instagram-feed img,.instagram-grid img")
      .forEach(function (i) {
        var s = i.getAttribute("data-src") || i.getAttribute("data-lazy");
        var ss = i.getAttribute("data-srcset");
        if (ss && !i.srcset) i.srcset = ss.replace(/^http:\/\//, "https://");
        if (s && (!i.getAttribute("src") || i.src.indexOf("data:") === 0)) {
          i.src = s.replace(/^http:\/\//, "https://");
        }
      });
  }

  function initSticky() {
    var buy = document.querySelector(buySel);
    if (!buy || !document.querySelector(".product-detail,.p-detail,.p-detail-inner")) return;
    sticky = document.createElement("div");
    sticky.className = "sticky-atc";
    sticky.innerHTML =
      '<div class="sticky-atc__title"></div><button type="button" class="sticky-atc__btn">Přidat do košíku</button>';
    var t = document.querySelector(".product-detail h1,.p-detail__name,.p-detail-inner h1");
    sticky.querySelector(".sticky-atc__title").textContent = t
      ? t.textContent.trim()
      : "Produkt";
    sticky.querySelector("button").onclick = function () {
      var b = document.querySelector(buySel);
      if (b && !b.disabled) b.click();
    };
    document.body.appendChild(sticky);
    up();
  }

  /* recenze HP: 4 posledni, bez pruhu 4,9 */
  function hpRating() {
    if (!/in-index|id-1/.test(document.body.className)) return;
    function e(s) {
      return String(s || "").replace(/[&<>"]/g, function (ch) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
      });
    }
    function mask(n) {
      var p = String(n || "").trim().split(/\s+/);
      return p.length < 2 ? p[0] || "" : p[0] + " " + p[p.length - 1].charAt(0).toUpperCase() + ".";
    }
    fetch("/hodnoceni-obchodu/")
      .then(function (r) {
        return r.text();
      })
      .then(function (html) {
        var d = new DOMParser().parseFromString(html, "text/html");
        var a = [];
        var st = "★★★★★";
        d.querySelectorAll(".vote-wrap").forEach(function (v) {
          if (a.length >= 4 || v.closest(".admin-response")) return;
          var n = ((v.querySelector(".vote-name") || {}).innerText || "").trim();
          var t = ((v.querySelector(".vote-time") || {}).innerText || "").trim();
          var x = ((v.querySelector(".vote-content") || {}).innerText || "").trim();
          if (
            v.querySelectorAll(".vote-rating .star-on").length < 5 ||
            x.length < 24 ||
            /podvod|reklamuj|omlouvám/i.test(x) ||
            /administrátor/i.test(n)
          ) {
            return;
          }
          a.push({ n: mask(n), t: t, x: x });
        });
        if (!a.length) return;
        var b = document.createElement("div");
        b.className = "r";
        b.innerHTML =
          '<div class="r-l">' +
          a
            .map(function (i) {
              return (
                '<a class="r-c" href="/hodnoceni-obchodu/"><div class="r-nm">' +
                e(i.n) +
                '</div><div class="r-t">' +
                st +
                " · " +
                e(i.t) +
                '</div><p class="r-x">' +
                e(i.x) +
                "</p></a>"
              );
            })
            .join("") +
          "</div>";
        var after = document.querySelector(".benefitBanner.position--benefitHomepage");
        if (after && after.parentNode) after.parentNode.insertBefore(b, after.nextSibling);
      });
  }

  /* THC, Sativa, Indica z doplnkovych parametru na nahled */
  function geneBadges() {
    var KEY = "sc-genes-v1";
    var TTL = 6 * 60 * 60 * 1000;
    var MAX = 2;
    var mem = {};
    var inflight = {};
    var q = [];
    var running = 0;
    var io = null;

    try {
      mem = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) {
      mem = {};
    }

    function save() {
      var keys = Object.keys(mem);
      if (keys.length > 400) {
        keys.sort(function (a, b) {
          return (mem[a].t || 0) - (mem[b].t || 0);
        });
        keys.slice(0, keys.length - 400).forEach(function (k) {
          delete mem[k];
        });
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(mem));
      } catch (e2) {}
    }

    function fresh(id) {
      var row = mem[id];
      if (!row || Date.now() - (row.t || 0) > TTL) {
        if (row) delete mem[id];
        return null;
      }
      return row;
    }

    function labelText(th) {
      var lab = th.querySelector(".row-header-label") || th;
      var clone = lab.cloneNode(true);
      clone.querySelectorAll(".show-tooltip, .row-header-label-colon").forEach(function (n) {
        n.remove();
      });
      return clone.textContent.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function readGenes(html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var out = { thc: "", sativa: "", indica: "", t: Date.now() };
      var table = doc.querySelector(".extended-description table.detail-parameters");
      if (!table) return out;
      table.querySelectorAll("tr").forEach(function (tr) {
        var th = tr.querySelector("th");
        var td = tr.querySelector("td");
        if (!th || !td) return;
        var name = labelText(th);
        var val = td.textContent.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        if (name === "thc") out.thc = val;
        else if (name === "sativa") out.sativa = val;
        else if (name === "indica") out.indica = val;
      });
      return out;
    }

    function paint(card, genes) {
      if (!card || card.getAttribute("data-sc-genes") === "1") return;
      var img = card.querySelector("a.image");
      card.setAttribute("data-sc-genes", "1");
      if (!img) return;
      var rows = [];
      if (genes.thc) rows.push("THC " + genes.thc);
      if (genes.sativa) rows.push("Sativa " + genes.sativa);
      if (genes.indica) rows.push("Indica " + genes.indica);
      if (!rows.length || img.querySelector(".sc-genes")) return;
      var box = document.createElement("div");
      box.className = "sc-genes";
      rows.forEach(function (text) {
        var s = document.createElement("span");
        s.textContent = text;
        box.appendChild(s);
      });
      img.appendChild(box);
    }

    function finish(id, genes) {
      document.querySelectorAll('.product [data-micro-product-id="' + id + '"]').forEach(function (card) {
        paint(card, genes);
      });
      delete inflight[id];
    }

    function pump() {
      while (running < MAX && q.length) {
        running++;
        load(q.shift()).then(function () {
          running--;
          pump();
        });
      }
    }

    function load(id) {
      var card = (inflight[id] || [])[0];
      var a = card && card.querySelector("a.image, a.name");
      if (!a || !a.pathname || a.pathname === "/") {
        finish(id, { thc: "", sativa: "", indica: "" });
        return Promise.resolve();
      }
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (ctrl) ctrl.abort();
      }, 12000);
      return fetch(a.pathname, {
        credentials: "same-origin",
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (r) {
          if (!r.ok) throw new Error("status");
          return r.text();
        })
        .then(function (html) {
          var genes = readGenes(html);
          mem[id] = genes;
          save();
          finish(id, genes);
        })
        .catch(function () {
          (inflight[id] || []).forEach(function (c) {
            c.setAttribute("data-sc-genes", "e");
          });
          delete inflight[id];
        })
        .then(function () {
          clearTimeout(timer);
        });
    }

    function enqueue(card) {
      var id = card.getAttribute("data-micro-product-id");
      if (!id || card.getAttribute("data-sc-genes")) return;
      if (inflight[id]) {
        inflight[id].push(card);
        return;
      }
      inflight[id] = [card];
      q.push(id);
      pump();
    }

    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            enqueue(en.target);
          });
        },
        { rootMargin: "300px" }
      );
    }

    function scan() {
      document.querySelectorAll(".product [data-micro-product-id]").forEach(function (card) {
        if (card.getAttribute("data-sc-genes")) return;
        var id = card.getAttribute("data-micro-product-id");
        var hit = fresh(id);
        if (hit) {
          paint(card, hit);
          return;
        }
        if (io) io.observe(card);
        else enqueue(card);
      });
    }

    scan();
    if (document.body && "MutationObserver" in window) {
      var timer = 0;
      new MutationObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(scan, 200);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  function init() {
    basePad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
    bar = document.getElementById("saleBar");
    close = document.getElementById("saleBarClose");
    if (close) {
      close.onclick = function () {
        bar.hidden = true;
        layout();
      };
    }
    initSticky();
    unlazy();
    hpRating();
    geneBadges();
    layout();
    addEventListener("scroll", up, { passive: true });
    addEventListener("resize", up, { passive: true });
    addEventListener("load", function () {
      unlazy();
      layout();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* TAWK.TO – načíst až po první interakci, nejpozději 5 s po načtení stránky (T5, rychlost) */
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_API.customStyle = {
    visibility: {
      mobile: { position: "br", xOffset: 8, yOffset: 72 },
      desktop: { position: "br", xOffset: 16, yOffset: 16 }
    }
  };
  var tawkLoaded = false;
  var tawkEvents = ["pointerdown", "keydown", "scroll", "touchstart"];
  function loadTawk() {
    if (tawkLoaded) return;
    tawkLoaded = true;
    tawkEvents.forEach(function (ev) {
      window.removeEventListener(ev, loadTawk, { passive: true });
    });
    window.Tawk_LoadStart = new Date();
    var s1 = document.createElement("script");
    var s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = "https://embed.tawk.to/6adb3a17464c67347245fbf1/1k5k5lrb1";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode.insertBefore(s1, s0);
  }
  tawkEvents.forEach(function (ev) {
    window.addEventListener(ev, loadTawk, { passive: true });
  });
  function tawkTimer() { setTimeout(loadTawk, 5000); }
  if (document.readyState === "complete") {
    tawkTimer();
  } else {
    window.addEventListener("load", tawkTimer);
  }
})();

/* Oprava překlepů ve vyhledávání – SEMENACANNABIS.CZ
   Shoptet neumí synonyma ani překlepy. Skript opraví známé překlepy:
   1) při odeslání hledání (formulář s polem "string") ještě před odesláním,
   2) na stránce /vyhledavani/ (odkazy zvenku, historie) přesměruje na opravený dotaz.
   Na stránce výsledků ukáže řádek „Hledal jsi „…“, ukazujeme výsledky pro „…““.
   Slovník doplňovat podle Statistiky › Hledání na webu (dotazy s 0 výsledky).
   Navíc: slovo, které není mezi slovy našich produktů/kategorií (VOCAB), se nahradí
   nejbližším slovem (1 překlep u 5–7 písmen, 2 u 8+), např. vhite widov → white widow. */
(function () {
  "use strict";

  // [překlep (regulární výraz na celé slovo), správný tvar]
  var RULES = [
    [/\bwhitewidow\b/g, "white widow"],
    [/\bwhite (window|vidow|widdow|wido|widov)\b/g, "white widow"],
    [/\bjackherer\b/g, "jack herer"],
    [/\b(herrer|hererr|herrerr)\b/g, "herer"],
    [/\b(amnezia|amnesie|amnezie|amnezia)\b/g, "amnesia"],
    [/\bgorila\b/g, "gorilla"],
    [/\b(nothern|northen|nortern|nothen)\b/g, "northern"],
    [/\bnorthern light\b/g, "northern lights"],
    [/\b(kritikal|kritical|kritikl|critikal)\b/g, "critical"],
    [/\b(bluberry|blueberi|blubery|bluebery|bluberi)\b/g, "blueberry"],
    [/\bgelatto\b/g, "gelato"],
    [/\b(zkitlez|zkittles|skittles|skittlez|zkitles)\b/g, "zkittlez"],
    [/\btropikana\b/g, "tropicana"],
    [/\bsherbert\b/g, "sherbet"],
    [/\b(runts|rantz|rants)\b/g, "runtz"],
    [/\b(chese|chesse)\b/g, "cheese"],
    [/\bauto ?flover\b/g, "autoflower"],
    [/\bauto flower\b/g, "autoflower"],
    [/\brychlo ?kvetouci\b/g, "rychlekvetouci"],
    [/\bfast ?budz\b/g, "fastbuds"],
    [/\b(barnys|barnes)\b/g, "barneys"],
    [/\bdutch pasion\b/g, "dutch passion"]
  ];

  // Slova z adres našich produktů a kategorií (seřazená podle četnosti). Slovo, které tu je, se nikdy nemění.
  var VOCAB = "seeds semena sweet znacka royal barneys queen green house sensi passion dutch genetics kannabia white delicious vyprodej vision seedsman feminizovana konopi super purple cookies skunk blimburn critical paradise ganja samonakvetaci lemon ripper farmer buddha ethos gelato amnesia seedstockers nirvana gorilla exotic widow punch cheese diesel cannabis cream dream anesia version northern label kalashnikov candy advanced original banana research ministry zkittlez black strawberry autoflowering runtz strains tyson humboldt blueberry sativa organisation triko silent sherbet herer orange wedding poison lights doctor cherry spectrum light female rychlekvetouci philosopher mimosa genetiky flowering early berry vysokym silver mango konopny kapky feminizovane choice skywalker semen scout mintz marihuany mandarine feminized caramel bubba bruce baleni pineapple obsahem juice durban russian power peyote outdoor novinky medical indoor indica crystal collection banner ultra toxic sunset sugar somango pokus papirky hybrid hindu genetika devil crack zombie tangie tacek sorbet plant papaya ovocne mazar ksiltovka killer fruit cheesecake zapalovac tangerine shark rolovaci reserva rainbow privada prichuti odrud negra monster mamba jealousy honey express dwarf drticka domina cookie bubblegum bubble brain assorted zvirata zelena velka vaporizer tropicanna trainwreck think swiss speed special samonakvetacich rychle regular organicke oranzova odrudy neville nejvynosnejsi mandarin landrace kvetouci kosher indika guava fruity filtry fenixovy delight blaze blanca blackberry autoflower arjan apricot apple alaskan afghani afghan watermelon valley ultimate triple swami steve semenacannabis school santa ryder roses relief radical quick produkty pomer obleceni objednavce nikki monkey mexican merch melon matic lemonade kovovy konopne konopna jelly jamaican integra ideal happy great grape golosa ghost garlic fritter fotoperiodicke forbidden flowermate flash exodus eleven dosidos deangelo dayzen daddy coast clipper chunk chocolate chemdog chemdawg cerne cannaline californian california breath break boost biscotti badazz americke zweet zvlhcujici zenzation zaloha wreck world wonder wappa vyrobit vynosovou vynosne vyjimecnymi vlastnostmi vlastnosti vlastni vitezove victory velkoobchodni vaporizery unknown tulip tropicana tropical tridilna trichome train therapy surfer sunrise sunday strong strain sticky stastna stash speedy slush siberian short shiva shining sherbert sestav sensible seminka sacek rhino revoluce regulerni raspberry pumpkin pruvodce praha pound poppers plastova permanent pearl ostatni oreoz oldschool odruda night nicole nejrychlejsi nejlepsi nebula mystic muffin mother moscow moderni milky melonade medikit master marta marmalate marijuana magnum machine linie lecive kushman kushberry krush krash kovova kosmetika konec kolekci klasiky kerosene karibbean karamel kalashnikova jamaica ikonicka ikona hyperion hulkberry highcloudz hellfire harlequin gypsy gushers gummy growshop grizzly greenhouse grapefruit golden godfather goatlato gnomo glueberry genetik gelat gardens fuego frosting frosted frisian fotoperiodickych force flower florida fialova fastflower evrope euphoria euforia energy enemy dynamite dynamicky durga drizzle dreams double divine diablo desfran dedoverde darky crescendo crasher cough cotton corkscrew compassion company classics cindy church chemical cheesy charlotte cerna celorocnich celebrity caramelo burger bulldog brothers bride bodhi banger ayahuasca angel amsterdam amnesi alien zushi ztrawberry zreknuti znemanaji zmenily zluty zluta zkittelz zkittalicious zkitt zkatky zillions zensation zakaz zajimavy yummy xtreme wombat woman wizard witch whiteberry western washing warden walker wafflez vznikaji vyvazenym vyuzivani vydrzi vybrat vraci vibez vetruvzdorny vesta vertigo verime venus veneno velvet vanilla utulku usmev underground umele umami ukoncuje udaje ucinky ubijza turing truthband trucker trilogene trees touch tooth tokamak toffee toasted titan tijuana thunderfuck tezla texty terra terpyz terpeny terpenes tequila taurinem tatin tatanka tarte tanie taangie syrup sweety supreme sugarlato subcool studio stress stravy store state starfire stare stardust stardawg stale spoetnik spirit spicy spice space solomatic solfire snurka smoothie smite smashberry slurricane slovnik slevy sleepy skittlez sitkem sideral sianie shooter shogun shock shiskaberry sherblato shawty shaman serious semeny seesdman seedsv seedshttps seedbanky screwdriver satin sapphire sangre samsara sampony sagarmatha rozdily rozdil rozcestnik rostliny rostlinach rolling rodice rider resin relax reklamacni reina regularni reggae regeneraci racer quasar pyramid purps purplematic punchline punchberry pulsar prohlaseni prodigy pridej prenosny prace potraviny positronics popelnik pomaha polaris pojmu podminky pochoutky platinum platba plastovy planet pinot pilot phytogenetics phoenix philo pheno pestovat persian perfect pebbles peanut peach payton patron parametry paradox panty pandora panama pamlsky pamir painkiller osvetlenim orion originals orient opticomplex opium omylu oleje oficialni odrudami odpovednosti obchodni nurse novinek novela north nordle noise noche niagara nektere nejvetsich nejsilnejsich natural nastup narkosis narcos napad naklicit nadoba mutant multipack muffins muerte mountain mosca morpheus money molotov mokums mokum mohan modely misty mikroskop mikromachine mighty meringue mephisto mental mendocino mendo member melounovou mellow megaton medxotic medusa medicinskeho medic mazlicci mazari maximus mataro masterkush marula marker marihuane maria maracuya mangovou mandala mamiko mamacita malibu malawi malasa maker magazin luxusni lovin london lockdown lobster lizatka lithium lineage limoncello limitovana lilac lightbuds liberty level letech lemonchello lemonberry lekarsky legislativa legendary legendarni legend legalne legalizace lecebne layer laughing larry language kvety kushage kubansky kuban kterym krumble kritikal kritic kreamy kraken kontakt konopnych konopnou konopim kompletni kolagen kofeinem kocky kockam klonovat klasik khalifa katyusha katalogu karel kapsovy kapsle kandy kabul kabrales kaboom jungle juicy jorge joint johny joanne jinxproof jejich james jambo jacky italia island inzanity inteligence inspirovane indigo impact ibiza hyperborea hybridni hunters horror honeybells homocaust hollands hlinikova hippie himalayan himalaya highness hermana heavyweight headband hawaiian hawaii hammock hairy guanabana growerschoice grimm grease grandpas grandpa granddady granddaddy grandaddy grand gorila gokunk glowstarz glookies gipsy ginger giant gestapo genetix geneticke geneticka genehtik gelove gelonade gardene garden future furious fumez fullgas frutero frost frizzy friction french freeze franco fraggle fotoperiodickymi fotoperiodicka forum floater first fingers finder fever fernando fenocan fastberry farmers fantasy fanta family fairy extrakty expert exclusive evropskeho epsilon enigma emerald elite elementz ekologicky efektem edice drzet dragon dough dorado doprava doplnky donkey dominator domaci dolato dlouho djeep dinafem different diavolo diamonds devotchka detroit detem detail desert descojack depot delimed delhi delahaze deimos death darkstar dance damnesia daiquiri cultured cucaracha crunch crockett critic criminal creeper creamatic crackers cosmos copacobana cookielato connection congo compound colours colorado colombian colin cobalt cloud cleopatra citradelic cinderella chulo chronic chocolopez chocoloco chocobang choco chimera chile chempie chaos champagne cervena casket cashew carnival caramelow caramello captain cannapot calamity bylinky butter bullet bulldozer budoucnosti budmint bubblelicious bubatz brooklyn broad briska breed brains boruvkovou booberry booba bluematic bliss bitch beyond berries belladonna bella bears bazooka battle barvy barney banshee bananen bananas bananaberry balls balici bakers baikal babushka automaton autoflowery aurora atomical atlas apollo anaconda amnesika americka amajikoym altai alpine alpha aloha allkush alienz alieanz airlines agartha afrodite afrodita africa afgooey afghanica afgani admin acapulco absolute".split(" ");
  var KEEP = "vdova bila bilou levne levna darek darky zdarma hnojivo hnojiva drticka papirky substrat kvetinac semena seminka seminko konopi marihuana marihuany outdoor indoor regular regularni landrace triploid fialova zelena tricko trika mikina".split(" ");
  var INDEX = {};
  for (var vi = 0; vi < VOCAB.length; vi++) INDEX[VOCAB[vi]] = vi;
  for (var ki = 0; ki < KEEP.length; ki++) if (!(KEEP[ki] in INDEX)) INDEX[KEEP[ki]] = -1;

  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var rowMin = max + 1;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < rowMin) rowMin = d[i][j];
      }
      if (rowMin > max) return max + 1;
    }
    return d[a.length][b.length];
  }

  function plain(w) {
    return w.normalize ? w.normalize("NFD").replace(/[̀-ͯ]/g, "") : w;
  }

  function fuzzyWord(w) {
    var p = plain(w);
    if (p.length < 5 || !/^[a-z]+$/.test(p) || p in INDEX) return w;
    var max = p.length >= 8 ? 2 : 1, best = null, bestD = max + 1;
    for (var i = 0; i < VOCAB.length; i++) {
      var d = dist(p, VOCAB[i], max);
      if (d < bestD) { bestD = d; best = VOCAB[i]; if (d === 1 && max === 1) break; }
    }
    return best || w;
  }

  function fix(q) {
    if (!q) return q;
    var s = String(q).toLowerCase().replace(/\s+/g, " ").trim();
    var out = s;
    for (var i = 0; i < RULES.length; i++) out = out.replace(RULES[i][0], RULES[i][1]);
    out = out.split(" ").map(fuzzyWord).join(" ");
    return out === s ? q : out;
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { fix: fix, RULES: RULES };
  if (typeof document === "undefined") return;

  var KEY = "scSearchFix";
  function remember(from, to) {
    try { sessionStorage.setItem(KEY, JSON.stringify({ from: from, to: to })); } catch (e) {}
  }

  // 1) oprava při odeslání formuláře
  document.addEventListener("submit", function (ev) {
    var form = ev.target;
    if (!form || !form.querySelector) return;
    var input = form.querySelector('input[name="string"]');
    if (!input) return;
    var before = input.value;
    var after = fix(before);
    if (after !== before) {
      input.value = after;
      remember(before, after);
    }
  }, true);

  // 2) stránka výsledků: přesměrování + informační řádek
  function onResults() {
    if (!/^\/vyhledavani\//.test(location.pathname)) return;
    var params = new URLSearchParams(location.search);
    var q = params.get("string");
    var fixed = fix(q);
    if (q && fixed !== q) {
      remember(q, fixed);
      params.set("string", fixed);
      location.replace(location.pathname.replace(/strana-\d+\/$/, "") + "?" + params.toString());
      return;
    }
    var info = null;
    try { info = JSON.parse(sessionStorage.getItem(KEY) || "null"); sessionStorage.removeItem(KEY); } catch (e) {}
    if (!info || !q || fix(info.from) !== q.toLowerCase().replace(/\s+/g, " ").trim()) return;
    var heads = document.querySelectorAll("h1, h2");
    var h1 = null;
    for (var k = 0; k < heads.length; k++) {
      if (/Výsledky vyhledávání/i.test(heads[k].textContent)) { h1 = heads[k]; break; }
    }
    if (!h1 || document.querySelector(".sc-search-fix")) return;
    var p = document.createElement("p");
    p.className = "sc-search-fix";
    p.style.cssText = "margin:8px 0 16px;padding:10px 14px;background:#f3faf5;border:1px solid #d5ecdc;border-radius:10px;font-size:15px;color:#333";
    p.appendChild(document.createTextNode("Hledal jsi „" + info.from + "“, ukazujeme výsledky pro „" + info.to + "“."));
    h1.parentNode.insertBefore(p, h1.nextSibling);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onResults);
  else onResults();
})();

/* === 404 stránka: sklizeno + chytré hledání + linie + hra (18. 11. 2026) === */
(function(){function run(){if(!document.body||!document.body.classList.contains("id-404"))return;var c=document.getElementById("content");if(!c||document.getElementById("sc404"))return;var w=document.createElement("div");w.id="sc404";w.innerHTML="\n<style>.id-404 .discussionContainer,.id-404 #discussion-form,.id-404 .add-comment{display:none!important}\n#sc404{--g:#2a7d46;--g2:#1c5a32;--l:#f3faf5;--b:#d5ecdc;font-family:Ubuntu,Arial,sans-serif;color:#1c2b23}\n#sc404 .hero{background:linear-gradient(135deg,#123d24,#2a7d46);color:#fff;border-radius:16px;padding:28px 22px;position:relative;overflow:hidden}\n#sc404 .hero h1{margin:0 0 8px;font-size:28px;line-height:1.2;color:#fff !important}\n#sc404 .hero p{color:#fff !important;margin:0;font-size:16px;line-height:1.55;max-width:560px;opacity:.95}\n#sc404 .cta{display:inline-block;margin-top:14px;padding:10px 18px;background:#f0a500;color:#1c2b23 !important;border-radius:999px;font-weight:bold;text-decoration:none;font-size:16px;box-shadow:0 3px 0 #b26a00}\n#sc404 .cta:hover{background:#ffb81c}\n#sc404 .leaf{transform-origin:45px 30px;animation:sc404fall 4s ease-in 1s infinite}\n@keyframes sc404fall{0%{transform:translate(0,0) rotate(0);opacity:1}70%{transform:translate(-26px,48px) rotate(-70deg);opacity:1}100%{transform:translate(-30px,56px) rotate(-80deg);opacity:0}}\n#sc404 .card{background:var(--l);border:1px solid var(--b);border-left:5px solid var(--g);border-radius:12px;padding:16px 18px;margin:18px 0}\n#sc404 .card h2{margin:0 0 6px;font-size:18px;color:var(--g2)}\n#sc404 .card p{margin:0 0 12px;font-size:15px;line-height:1.5}\n#sc404 .btn{display:inline-block;padding:10px 18px;background:var(--g);color:#fff;border-radius:999px;text-decoration:none;font-weight:bold;font-size:15px;border:0;cursor:pointer}\n#sc404 .btn:hover{background:var(--g2)}\n#sc404 .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}\n#sc404 .chips a{padding:6px 12px;border:1px solid var(--b);background:#fff;border-radius:999px;color:var(--g2);text-decoration:none;font-size:14px}\n#sc404 .game{text-align:center;margin:22px 0}\n#sc404 .game h2{font-size:20px;margin:0 0 4px;color:var(--g2)}\n#sc404 .game .sub{font-size:14px;color:#555;margin:0 0 10px}\n#sc404 .board{position:relative;display:inline-block;max-width:100%}\n#sc404 canvas{display:block;width:min(420px,100%);height:auto;border-radius:12px;background:#f7fbf4;border:2px solid var(--b);touch-action:none}\n#sc404 .over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(18,61,36,.82);color:#fff;border-radius:12px;padding:12px}\n#sc404 .over b{font-size:22px;margin-bottom:6px}\n#sc404 .over span{font-size:14px;margin-bottom:12px;opacity:.9}\n#sc404 .score{font-size:14px;margin-top:8px;color:#333}\n#sc404 .goal{font-size:14px;color:#6a7a70;margin:6px 0 0}\n#sc404 .reward{text-align:left;max-width:520px;margin:14px auto 0;padding:16px 18px;border:2px solid #f0a500;border-radius:14px;background:linear-gradient(135deg,#fff8e1,#fff);animation:sc404pop .5s ease-out}\n#sc404 .reward .rw-h{display:block;font-size:18px;color:#8a5200;margin-bottom:6px}\n#sc404 .reward p{margin:6px 0;font-size:15px;line-height:1.5}\n#sc404 .reward .rw-code strong{background:#2a7d46;color:#fff;padding:2px 8px;border-radius:6px;letter-spacing:1px}\n#sc404 .reward .rw-code span{font-size:12px;color:#6a7a70}\n#sc404 .reward .rw-rules{font-size:13px;color:#6a7a70}\n@keyframes sc404pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}\n#sc404 .howto1{max-width:420px;margin:0 auto 12px;font-size:15px;line-height:1.45}\n#sc404 .howto li{margin:4px 0}#sc404 .howto span{display:inline-block;width:24px}\n#sc404 .cd{font-size:64px;line-height:1;font-weight:bold}\n#sc404 .pad{display:grid;margin:10px auto 0;gap:6px;grid-template-columns:repeat(3,52px);justify-content:center}\n#sc404 .pad button{height:44px;border-radius:10px;border:1px solid var(--b);background:var(--l);font-size:18px;color:var(--g2)}\n@media (max-width:600px){#sc404 .hero h1{font-size:23px}#sc404 .pad{display:grid}}\n</style>\n\n<div class=\"hero\">\n  <h1>Jejda… tady už je sklizeno.</h1>\n  <p>Tahle odrůda zmizela ze sbírky dřív, než jsi dorazil. Semínka se rozebrala a v květináči zůstal jen poslední lístek. Ale sbírka jde dál.</p>\n  <a class=\"cta\" href=\"#sc404-game\">🎮 Zahraj si o semínka zdarma ↓</a>\n</div>\n\n<div class=\"card\" id=\"sc404-hledam\" hidden>\n  <h2>Hledáš <span id=\"sc404-nazev\"></span>?</h2>\n  <p>Stejnou genetiku často vede víc seedbank nebo jiná verze balení. Mrkni, co z ní u nás ještě roste.</p>\n  <a class=\"btn\" id=\"sc404-hledat\" href=\"/vyhledavani/\">Ukaž, co máme →</a>\n</div>\n\n<style>#sc404 .map{margin:12px 0 4px;border:1px solid var(--b);border-radius:14px;background:#fff;overflow-x:auto;-webkit-overflow-scrolling:touch}\n#sc404 .map-hint{font-size:13px;color:#6a7a70;margin:6px 0 12px}\n#sc404 .map-b{padding:6px 12px;overflow:visible}\n#sc404 .era-row{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px dashed var(--b)}\n#sc404 .era-row:last-child{border-bottom:0}\n#sc404 .era-l{flex:0 0 92px;font:700 11px Ubuntu,sans-serif;color:#2a7d46;text-transform:uppercase;letter-spacing:.5px;padding-top:8px}\n#sc404 .dots{display:flex;flex-wrap:wrap;gap:8px}\n#sc404 .dots a{display:inline-flex;align-items:center;gap:7px;padding:6px 12px 6px 8px;border:1px solid var(--b);border-radius:999px;background:#fff;color:var(--g2);text-decoration:none;font-size:14px;transition:transform .15s,background .15s}\n#sc404 .dots a:hover{background:#e6f4ea;transform:scale(1.07)}\n#sc404 .dots i{width:10px;height:10px;border-radius:50%;background:#5cb85c;box-shadow:0 0 0 0 rgba(92,184,92,.6);animation:sc404pulse 2.4s infinite;animation-delay:var(--d)}\n@keyframes sc404pulse{0%{box-shadow:0 0 0 0 rgba(92,184,92,.6)}70%{box-shadow:0 0 0 9px rgba(92,184,92,0)}100%{box-shadow:0 0 0 0 rgba(92,184,92,0)}}\n#sc404 .era-row.hot{background:linear-gradient(90deg,#fff8e1,#fff);margin:0 -12px;padding:10px 12px;border-radius:0 0 12px 12px}\n#sc404 .era-row.hot .era-l{color:#b26a00}\n#sc404 .era-row.hot .dots a{border-color:#f3d48a}\n#sc404 .era-row.hot .dots i{background:#f0a500;animation-name:sc404pulse2}\n@keyframes sc404pulse2{0%{box-shadow:0 0 0 0 rgba(240,165,0,.6)}70%{box-shadow:0 0 0 9px rgba(240,165,0,0)}100%{box-shadow:0 0 0 0 rgba(240,165,0,0)}}\n#sc404 .era-row.pick .era-l{color:#6b3fa0}\n#sc404 .era-row.pick .dots a{border-color:#d9c6ef;color:#4b2a75}\n#sc404 .era-row.pick .dots i{background:#8e5cc9;animation-name:sc404pulse3}\n@keyframes sc404pulse3{0%{box-shadow:0 0 0 0 rgba(142,92,201,.6)}70%{box-shadow:0 0 0 9px rgba(142,92,201,0)}100%{box-shadow:0 0 0 0 rgba(142,92,201,0)}}\n#sc404 .era-row.hot{border-radius:0}\n#sc404 .tipbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0 0}\n#sc404 .btn.tip{background:#fff;color:var(--g2);border:2px solid var(--g)}\n#sc404 #sc404-tipout{font-size:15px}\n#sc404 #sc404-tipout a{color:var(--g2);font-weight:bold}\n#sc404 .mine-out{margin:10px 0 0;padding:10px 14px;background:#e6f4ea;border-radius:10px;font-size:15px}\n#sc404 .mine-out a{color:var(--g2);font-weight:bold}\n#sc404 .dots a.mine{background:#2a7d46;color:#fff;border-color:#2a7d46;transform:scale(1.08)}\n#sc404 .dots a.mine i{background:#fff;animation-duration:1.2s}\n#sc404 .dots a.chosen{background:#e6f4ea;border-color:#2a7d46;box-shadow:0 0 0 3px rgba(42,125,70,.25);font-weight:bold}\n@media (max-width:600px){#sc404 .era-row{flex-direction:column;gap:6px}#sc404 .era-l{flex:none;padding:0}}\n@media (prefers-reduced-motion:reduce){#sc404 .dots i{animation:none}}</style>\n<div class=\"card\">\n  <h2>🧬 37 genetických rodin. V jedné z nich je tvoje odrůda.</h2>\n  <p>Odrůdy se vyprodávají, genetika zůstává. Klikni na rodinu a uvidíš feminizované celoroční, samonakvétací i rychlekvetoucí verze vedle sebe.</p>\n  <p class=\"mine-out\" id=\"sc404-mine\" hidden></p>\n  <div class=\"tipbar\"><button type=\"button\" class=\"btn tip\" id=\"sc404-tip\">🎲 Poraď mi genetiku</button><span id=\"sc404-tipout\"></span></div>\n  <div class=\"map map-b\"><div class=\"era-row\"><div class=\"era-l\">Landrace</div><div class=\"dots\"><a href=\"/landrace-semena/\" class=\"ln\" data-s=\"mexiko-a-kolumbie\" style=\"--d:0s\"><i></i>Mexiko a Kolumbie</a><a href=\"/thai/\" class=\"ln\" data-s=\"thajsko\" style=\"--d:0.35s\"><i></i>Thajsko</a><a href=\"/afghani/\" class=\"ln\" data-s=\"afghan\" style=\"--d:0.7s\"><i></i>Afghan</a><a href=\"/durban-poison/\" class=\"ln\" data-s=\"durban-poison\" style=\"--d:1.0499999999999998s\"><i></i>Durban Poison</a><a href=\"/hindu-kush/\" class=\"ln\" data-s=\"hindu-kush\" style=\"--d:1.4s\"><i></i>Hindu Kush</a></div></div><div class=\"era-row\"><div class=\"era-l\">70.–80. léta</div><div class=\"dots\"><a href=\"/haze/\" class=\"ln\" data-s=\"haze\" style=\"--d:2.4499999999999997s\"><i></i>Haze</a><a href=\"/skunk/\" class=\"ln\" data-s=\"skunk\" style=\"--d:2.8s\"><i></i>Skunk</a><a href=\"/northern-lights/\" class=\"ln\" data-s=\"northern-lights\" style=\"--d:0s\"><i></i>Northern Lights</a><a href=\"/blueberry/\" class=\"ln\" data-s=\"blueberry\" style=\"--d:0.35s\"><i></i>Blueberry</a><a href=\"/kush/\" class=\"ln\" data-s=\"kush\" style=\"--d:0.7s\"><i></i>Kush</a></div></div><div class=\"era-row\"><div class=\"era-l\">90. léta</div><div class=\"dots\"><a href=\"/amnesia/\" class=\"ln\" data-s=\"amnesia\" style=\"--d:1.75s\"><i></i>Amnesia</a><a href=\"/cheese/\" class=\"ln\" data-s=\"cheese\" style=\"--d:2.0999999999999996s\"><i></i>Cheese</a><a href=\"/jack-herer/\" class=\"ln\" data-s=\"jack-herer\" style=\"--d:2.4499999999999997s\"><i></i>Jack Herer</a><a href=\"/ak-47-ak47/\" class=\"ln\" data-s=\"ak-47\" style=\"--d:2.8s\"><i></i>AK-47</a><a href=\"/critical-ikonicka-odruda-s-vyjimecnymi-vlastnostmi/\" class=\"ln\" data-s=\"critical\" style=\"--d:0s\"><i></i>Critical</a><a href=\"/sour-diesel/\" class=\"ln\" data-s=\"sour-diesel\" style=\"--d:0.35s\"><i></i>Sour Diesel</a><a href=\"/white-widow/\" class=\"ln\" data-s=\"white-widow\" style=\"--d:0.7s\"><i></i>White Widow</a><a href=\"/chemdawg/\" class=\"ln\" data-s=\"chemdawg\" style=\"--d:1.0499999999999998s\"><i></i>Chemdawg</a><a href=\"/og/\" class=\"ln\" data-s=\"og-kush\" style=\"--d:1.4s\"><i></i>OG Kush</a><a href=\"/bubba-kush/\" class=\"ln\" data-s=\"bubba-kush\" style=\"--d:1.75s\"><i></i>Bubba Kush</a></div></div><div class=\"era-row\"><div class=\"era-l\">Po roce 2000</div><div class=\"dots\"><a href=\"/lemon-haze/\" class=\"ln\" data-s=\"lemon-haze\" style=\"--d:1.0499999999999998s\"><i></i>Lemon Haze</a><a href=\"/blue-dream/\" class=\"ln\" data-s=\"blue-dream\" style=\"--d:1.4s\"><i></i>Blue Dream</a><a href=\"/diesel/\" class=\"ln\" data-s=\"diesel\" style=\"--d:1.75s\"><i></i>Diesel</a><a href=\"/purple/\" class=\"ln\" data-s=\"purple\" style=\"--d:2.0999999999999996s\"><i></i>Purple</a></div></div><div class=\"era-row\"><div class=\"era-l\">Po roce 2010</div><div class=\"dots\"><a href=\"/tangie-tropicana/\" class=\"ln\" data-s=\"tangie-a-tropicana\" style=\"--d:0.35s\"><i></i>Tangie a Tropicana</a><a href=\"/sunset-sherbet-ikona-moderni-konopne-genetiky/\" class=\"ln\" data-s=\"sherbet\" style=\"--d:0.7s\"><i></i>Sherbet</a><a href=\"/gorilla/\" class=\"ln\" data-s=\"gorilla\" style=\"--d:1.0499999999999998s\"><i></i>Gorilla</a><a href=\"/gmo/\" class=\"ln\" data-s=\"gmo\" style=\"--d:1.4s\"><i></i>GMO</a><a href=\"/bruce-banner/\" class=\"ln\" data-s=\"bruce-banner\" style=\"--d:1.75s\"><i></i>Bruce Banner</a><a href=\"/gelato/\" class=\"ln\" data-s=\"gelato\" style=\"--d:2.0999999999999996s\"><i></i>Gelato</a><a href=\"/girl-scout-cookies--gsc/\" class=\"ln\" data-s=\"girl-scout-cookies\" style=\"--d:2.4499999999999997s\"><i></i>Girl Scout Cookies</a><a href=\"/zkittlez/\" class=\"ln\" data-s=\"zkittlez\" style=\"--d:2.8s\"><i></i>Zkittlez</a></div></div><div class=\"era-row\"><div class=\"era-l\">Po roce 2015</div><div class=\"dots\"><a href=\"/mimosa/\" class=\"ln\" data-s=\"mimosa\" style=\"--d:2.8s\"><i></i>Mimosa</a><a href=\"/cookies/\" class=\"ln\" data-s=\"cookies\" style=\"--d:0s\"><i></i>Cookies</a><a href=\"/wedding-cake/\" class=\"ln\" data-s=\"wedding-cake\" style=\"--d:0.35s\"><i></i>Wedding Cake</a><a href=\"/runtz/\" class=\"ln\" data-s=\"runtz\" style=\"--d:0.7s\"><i></i>Runtz</a><a href=\"/do-si-dos/\" class=\"ln\" data-s=\"do-si-dos\" style=\"--d:1.0499999999999998s\"><i></i>Do-Si-Dos</a><a href=\"/purple-punch/\" class=\"ln\" data-s=\"purple-punch\" style=\"--d:1.4s\"><i></i>Purple Punch</a></div></div><div class=\"era-row hot\"><div class=\"era-l\">Rok 2026</div><div class=\"dots\"><a href=\"/ice-cream-cake--barneys-farm/\" style=\"--d:2.0999999999999996s\"><i></i>Ice Cream Cake</a><a href=\"/lemon-cherry-gelato-barneys-farm/\" style=\"--d:2.4499999999999997s\"><i></i>Lemon Cherry Gelato</a><a href=\"/jealousy-barneys-farm/\" style=\"--d:2.8s\"><i></i>Jealousy</a><a href=\"/permanent-marker-xl-auto---samonakvetaci-semena-sweet-seeds/\" style=\"--d:0s\"><i></i>Permanent Marker</a><a href=\"/biscotti--barneys-farm/\" style=\"--d:0.35s\"><i></i>Biscotti</a><a href=\"/blue-zushi-dutch-passion/\" style=\"--d:0.7s\"><i></i>Blue Zushi</a><a href=\"/novinky-feminizovane-semena/\" style=\"--d:1.0499999999999998s\"><i></i>Novinky feminizované</a><a href=\"/novinky-autoflowering/\" style=\"--d:1.4s\"><i></i>Novinky samonakvétací</a><a href=\"/novinky-fast-f1-rychle-kvetouci/\" style=\"--d:1.75s\"><i></i>Novinky rychlekvetoucí</a></div></div><div class=\"era-row pick\"><div class=\"era-l\">Naše výběry</div><div class=\"dots\"><a href=\"/oldschool-klasiky/\" style=\"--d:1.4s\"><i></i>Oldschool klasiky</a><a href=\"/new-school-genetika/\" style=\"--d:1.75s\"><i></i>New school genetika</a><a href=\"/cali-semena-usa-genetika/\" style=\"--d:2.0999999999999996s\"><i></i>Cali genetika z USA</a><a href=\"/vitezove-cannabis-cup/\" style=\"--d:2.4499999999999997s\"><i></i>Vítězové Cannabis Cup</a><a href=\"/celebrity-genetiky/\" style=\"--d:2.8s\"><i></i>Celebrity genetiky</a></div></div></div>\n  <a class=\"btn\" href=\"/geneticke-linie/\">Rodokmen všech linií →</a>\n  <div class=\"chips\">\n    <a href=\"/vyprodej-semen-marihuany/\">Výprodej</a><a href=\"/slevy/\">Akce 1+1 a 2+1</a>\n  </div>\n</div>\n\n<div class=\"game\" id=\"sc404-game\">\n  <h2>Zahraj si o semínka zdarma</h2>\n  <p class=\"howto1\">Šipkami nebo prstem doveď úponek k hnědým semínkům. Za 10 semínek odemkneš sběratelskou odměnu.</p>\n  <div class=\"board\">\n    <canvas id=\"sc404-c\" width=\"420\" height=\"420\" aria-label=\"Hra: sbírej semínka\"></canvas>\n    <div class=\"over\" id=\"sc404-over\"><b id=\"sc404-t\">Připraven na sklizeň?</b><span id=\"sc404-s\">Doveď úponek k hnědému semínku.</span><button class=\"btn\" id=\"sc404-start\">Spustit sklizeň</button></div>\n  </div>\n  <div class=\"pad\" aria-hidden=\"true\"><span></span><button data-d=\"0,-1\">▲</button><span></span><button data-d=\"-1,0\">◀</button><button data-d=\"0,1\">▼</button><button data-d=\"1,0\">▶</button></div>\n  <div class=\"score\">Úroda: <b id=\"sc404-sc\">0</b> semínek · Rekord: <b id=\"sc404-best\">0</b></div>\n  <p class=\"goal\">🏆 Nasbírej <b>10 semínek</b> a odemkni sběratelskou odměnu.</p>\n  <div class=\"reward\" id=\"sc404-reward\" hidden>\n    <b class=\"rw-h\">🏆 Sběratelská sklizeň! Odměna: 1+1 na jeden produkt.</b>\n    <p>Kup si balení semen a my k němu přibalíme <strong>stejný počet promo semen zdarma</strong>. Koupíš 3 semena, dostaneš 3 promo semena navíc. Které to budou, je překvapení.</p>\n    <p class=\"rw-code\">Kód <strong id=\"sc404-code\"></strong> napiš do poznámky k objednávce. <span id=\"sc404-rdate\"></span></p>\n    <p class=\"rw-rules\">Platí 1× na objednávku a na jeden produkt. Nekombinuje se s akcemi 1+1 a 2+1 ani s výprodejem.</p>\n    <a class=\"btn\" href=\"/ideal-outdoor/\">Vybrat semena →</a>\n    <div class=\"chips\"><a href=\"/oldschool-klasiky/\">Oldschool klasiky</a><a href=\"/novinky-feminizovane-semena/\">Novinky</a></div>\n  </div>\n</div>\n\n";c.innerHTML="";c.appendChild(w);
(function(){
  /* --- chytré hledání podle adresy --- */
  var path=(window.SC404_PATH||location.pathname).replace(/^\/|\/$/g,'');
  var slug=path.split('/').pop().split('---')[0].replace(/^vyprodej-|^akce-|^novinka-/,'');
  var words=slug.split('-').filter(function(w){return w && !/^(semena|seminka|feminizovana|samonakvetaci|autoflowering|fast|f1|cbd|konopi|marihuany|auto)$/.test(w)}).slice(0,4);
  if(words.length){
    var name=words.map(function(w){return w.charAt(0).toUpperCase()+w.slice(1)}).join(' ');
    document.getElementById('sc404-nazev').textContent=name;
    document.getElementById('sc404-hledat').href='/vyhledavani/?string='+encodeURIComponent(words.join(' '));
    document.getElementById('sc404-hledam').hidden=false;
  }
  var cta=document.querySelector('#sc404 .cta');if(cta)cta.onclick=function(e){e.preventDefault();document.getElementById('sc404-game').scrollIntoView({behavior:'smooth',block:'start'})};
  /* --- svítící rodina: linie z adresy --- */
  var full='-'+path.split('/').pop()+'-',lines=[].slice.call(document.querySelectorAll('#sc404 .dots a.ln')),fam=null;
  lines.forEach(function(a){var k=a.getAttribute('data-s');if(k&&full.indexOf('-'+k+'-')>-1&&(!fam||k.length>fam.getAttribute('data-s').length))fam=a});
  if(fam){fam.classList.add('mine');var mo=document.getElementById('sc404-mine');
    if(mo){mo.innerHTML='✨ Tvoje odrůda patří do rodiny <a href="'+fam.getAttribute('href')+'">'+fam.textContent+' →</a>';mo.hidden=false}}
  /* --- poraď mi genetiku --- */
  var tb=document.getElementById('sc404-tip');
  if(tb&&lines.length)tb.onclick=function(){
    lines.forEach(function(a){a.classList.remove('chosen')});
    var a=lines[Math.floor(Math.random()*lines.length)];a.classList.add('chosen');
    document.getElementById('sc404-tipout').innerHTML='Zkus rodinu <a href="'+a.getAttribute('href')+'">'+a.textContent+' →</a>';
    tb.textContent='🎲 Jiný tip';
  };
  /* --- hra: úponek sbírá semínka --- */
  var c=document.getElementById('sc404-c'),x=c.getContext('2d'),N=14,S=c.width/N;
  var snake,dir,next,seed,score,timer,run=false,best=0;
  try{best=+localStorage.getItem('sc404best')||0}catch(e){}
  document.getElementById('sc404-best').textContent=best;
  function place(){do{seed={x:Math.floor(Math.random()*N),y:Math.floor(Math.random()*N)}}while(snake.some(function(p){return p.x===seed.x&&p.y===seed.y}))}
  function reset(){snake=[{x:5,y:7},{x:4,y:7},{x:3,y:7}];dir={x:1,y:0};next=dir;score=0;seed={x:9,y:7};upd()}
  function speed(){return Math.max(110,230-score*10)}
  function loop(){clearInterval(timer);timer=setInterval(step,speed())}
  function upd(){document.getElementById('sc404-sc').textContent=score}
  function draw(){
    x.clearRect(0,0,c.width,c.height);
    x.fillStyle='#eef6ea';for(var i=0;i<N;i++)for(var j=0;j<N;j++)if((i+j)%2)x.fillRect(i*S,j*S,S,S);
    /* semínko */
    x.save();x.translate(seed.x*S+S/2,seed.y*S+S/2);x.rotate(.5);x.fillStyle='#7a5230';x.beginPath();x.ellipse(0,0,S*.22,S*.32,0,0,7);x.fill();x.fillStyle='#a77a4c';x.beginPath();x.ellipse(-S*.05,-S*.08,S*.07,S*.12,0,0,7);x.fill();x.restore();
    /* úponek */
    x.strokeStyle='#2a7d46';x.lineWidth=S*.32;x.lineCap='round';x.lineJoin='round';x.beginPath();
    snake.forEach(function(p,i){var px=p.x*S+S/2,py=p.y*S+S/2;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
    snake.forEach(function(p,i){if(i&&i%2===0){x.fillStyle='#5cb85c';x.beginPath();x.ellipse(p.x*S+S*.75,p.y*S+S*.3,S*.18,S*.09,-.6,0,7);x.fill()}});
    var h=snake[0];x.fillStyle='#8fd19e';x.beginPath();x.arc(h.x*S+S/2,h.y*S+S/2,S*.26,0,7);x.fill();
  }
  function step(){
    dir=next;var h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
    if(h.x<0||h.y<0||h.x>=N||h.y>=N||snake.some(function(p){return p.x===h.x&&p.y===h.y})){return end()}
    snake.unshift(h);
    if(h.x===seed.x&&h.y===seed.y){score++;upd();place();loop()}else snake.pop();
    draw();
  }
  function end(){run=false;clearInterval(timer);
    if(score>best){best=score;try{localStorage.setItem('sc404best',best)}catch(e){}document.getElementById('sc404-best').textContent=best}
    document.getElementById('sc404-t').textContent='Úroda: '+score+(score===1?' semínko':score>=2&&score<=4?' semínka':' semínek');
    document.getElementById('sc404-s').textContent=score>=10?'Sběratelská sklizeň! Odměna je pod hrou.':'Zkus to znovu, sbírka čeká. Za 10 semínek je odměna.';
    if(score>=10){document.getElementById('sc404-code').textContent=atob('Qk9HT0Y0MDQ=');var rw=document.getElementById('sc404-reward'),dt=new Date();document.getElementById('sc404-rdate').textContent='(odemčeno '+dt.getDate()+'. '+(dt.getMonth()+1)+'. '+dt.getFullYear()+')';rw.hidden=false;setTimeout(function(){rw.scrollIntoView({behavior:'smooth',block:'center'})},600)}
    document.getElementById('sc404-start').textContent='Zahrát znovu';
    document.getElementById('sc404-over').style.display='flex';}
  var counting=false;
  function start(){if(counting)return;counting=true;reset();draw();clearInterval(timer);
    var o=document.getElementById('sc404-over'),n=3;
    o.innerHTML='<b class="cd">3</b><span>Připrav se…</span>';o.style.display='flex';
    var cd=setInterval(function(){n--;if(n>0){o.querySelector('.cd').textContent=n;return}
      clearInterval(cd);counting=false;
      o.innerHTML='<b id="sc404-t"></b><span id="sc404-s"></span><button class="btn" id="sc404-start">Zahrát znovu</button>';
      document.getElementById('sc404-start').onclick=start;
      o.style.display='none';run=true;loop()},700)}
  function turn(dx,dy){if(!run&&!counting)return;if(dx===-dir.x&&dy===-dir.y)return;next={x:dx,y:dy}}
  document.getElementById('sc404-start').onclick=start;
  document.addEventListener('keydown',function(e){var k={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(k&&(run||counting)){e.preventDefault();turn(k[0],k[1])}});
  var t0=null;c.addEventListener('touchstart',function(e){t0=e.touches[0]},{passive:true});
  c.addEventListener('touchmove',function(e){if(run)e.preventDefault()},{passive:false});
  c.addEventListener('touchend',function(e){if(!t0)return;var t=e.changedTouches[0],dx=t.clientX-t0.clientX,dy=t.clientY-t0.clientY;if(Math.max(Math.abs(dx),Math.abs(dy))>20){Math.abs(dx)>Math.abs(dy)?turn(dx>0?1:-1,0):turn(0,dy>0?1:-1)}t0=null});
  document.querySelectorAll('#sc404 .pad button').forEach(function(b){b.onclick=function(){var d=b.dataset.d.split(',');turn(+d[0],+d[1])}});
  reset();draw();
})();
}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();})();
