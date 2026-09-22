(function(){
  // používáme ověřené selektory (všechny u vás vrací true)
  var BUY_BTN_SEL = "button.add-to-cart-button, button[data-testid='buttonAddToCart'], form button[type='submit']";
  var TITLE_SEL   = ".product-detail h1, .p-detail__name, h1";
  var bar, titleEl;

  function ensureBar(){
    if (bar) return bar;
    titleEl = document.querySelector(TITLE_SEL);
    bar = document.createElement('div');
    bar.className = 'sticky-atc';
    bar.innerHTML = '<div class="sticky-atc__title"></div><button class="sticky-atc__btn">Přidat do košíku</button>';
    document.body.appendChild(bar);

    var t = (titleEl && (titleEl.innerText || titleEl.textContent || '').trim()) || 'Produkt';
    bar.querySelector('.sticky-atc__title').textContent = t;

    // drž se nad SALE barem
    var saleBar = document.getElementById('saleBar');
    if (saleBar) {
      var h = saleBar.offsetHeight || 60;
      bar.style.bottom = h + 'px';
    }

    // proklik přesměrujeme na původní tlačítko
    bar.querySelector('.sticky-atc__btn').addEventListener('click', function(){
      var btn = document.querySelector(BUY_BTN_SEL);
      if (btn) btn.click();
    });

    console.log('[sticky-atc] lišta vytvořena');
    return bar;
  }

  function btnVisible(){
    var btn = document.querySelector(BUY_BTN_SEL);
    if (!btn) return false;
    var r = btn.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }

  function toggle(){
    // zobraz po 150 px scrollu NEBO když není vidět originální ATC
    var scrolled = (window.scrollY || window.pageYOffset) > 150;
    var show = scrolled || !btnVisible();
    var el = ensureBar();
    if (show) el.classList.add('sticky-atc--show');
    else el.classList.remove('sticky-atc--show');
  }

  ['scroll','resize','orientationchange'].forEach(function(ev){
    window.addEventListener(ev, toggle, {passive:true});
  });
  window.addEventListener('load', toggle);
  document.addEventListener('DOMContentLoaded', toggle);
})();
