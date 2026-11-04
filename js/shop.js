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

  /* recenze HP: jen 3 posledni, bez pruhu 4,9 */
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
          if (a.length >= 3 || v.closest(".admin-response")) return;
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
