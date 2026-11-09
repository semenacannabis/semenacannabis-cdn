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

  /* TAWK.TO */
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  window.Tawk_API.customStyle = {
    visibility: {
      mobile: { position: "br", xOffset: 8, yOffset: 72 },
      desktop: { position: "br", xOffset: 16, yOffset: 16 }
    }
  };
  var s1 = document.createElement("script");
  var s0 = document.getElementsByTagName("script")[0];
  s1.async = true;
  s1.src = "https://embed.tawk.to/6adb3a17464c67347245fbf1/1k5k5lrb1";
  s1.charset = "UTF-8";
  s1.setAttribute("crossorigin", "*");
  s0.parentNode.insertBefore(s1, s0);
})();
