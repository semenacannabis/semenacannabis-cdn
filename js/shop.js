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
