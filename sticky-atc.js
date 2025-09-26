(function(){
  // ZKUSÍME VÍCE SELEKTORŮ, PODLE VAŠEHO HTML:
  var BTN_SELECTORS = [
    "button.add-to-cart-button",
    "button[data-testid='buttonAddToCart']",
    "form button[type='submit']"
  ];
  var TITLE_SEL = ".product-detail h1, .p-detail__name, h1";
  var bar, buyBtn, titleEl, io;

  function qBuy(){
    for(var i=0;i<BTN_SELECTORS.length;i++){
      var el = document.querySelector(BTN_SELECTORS[i]);
      if(el) return el;
    }
    return null;
  }

  function ensureBtn(){
    if (!buyBtn) buyBtn = qBuy();
    return !!buyBtn;
  }

  function createBar(){
    if(bar) return;
    titleEl = document.querySelector(TITLE_SEL);
    bar = document.createElement('div');
    bar.className = 'sticky-atc';
    bar.innerHTML = '<div class="sticky-atc__title"></div><button class="sticky-atc__btn">Přidat do košíku</button>';
    document.body.appendChild(bar);

    var t = (titleEl && (titleEl.innerText || titleEl.textContent).trim()) || 'Produkt';
    bar.querySelector('.sticky-atc__title').textContent = t;

    // vyhnout se vašemu sale baru
    var saleBar = document.getElementById('saleBar');
    if (saleBar) {
      var h = saleBar.offsetHeight || 60;
      bar.style.bottom = h + 'px';
    }

    bar.querySelector('.sticky-atc__btn').addEventListener('click', function(){
      if (!ensureBtn()) return;
      buyBtn.click();
    });

    console.log('[sticky-atc] lišta vytvořena');
  }

  function showBar(show){
    if(!bar) createBar();
    if(show) bar.classList.add('sticky-atc--show');
    else bar.classList.remove('sticky-atc--show');
  }

  function setupObserver(){
    if(!ensureBtn()) return;
    if(io) { try{ io.disconnect(); }catch(e){} }
    io = new IntersectionObserver(function(entries){
      var e = entries[0];
      var visible = e && e.isIntersecting;
      var scrolled = (window.scrollY || window.pageYOffset) > 200;
      showBar(!visible || scrolled);
    }, {threshold: 0.01});
    io.observe(buyBtn);
    console.log('[sticky-atc] pozorujeme tlačítko:', buyBtn);
  }

  function tryInit(){
    if(!ensureBtn()){
      // tlačítko tam ještě není – zkusíme znovu za chvilku
      setTimeout(tryInit, 300);
      return;
    }
    setupObserver();
  }

  // fallback i na scroll/resize (když by IO nefungoval)
  function onScroll(){
    if(!ensureBtn()) return;
    var rect = buyBtn.getBoundingClientRect();
    var visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    var scrolled = (window.scrollY || window.pageYOffset) > 200;
    showBar(!visible || scrolled);
  }

  ['scroll','resize','orientationchange'].forEach(function(ev){
    window.addEventListener(ev, onScroll, {passive:true});
  });

  window.addEventListener('load', tryInit);
  document.addEventListener('DOMContentLoaded', tryInit);

  // kdyby se DOM měnil (AJAX)
  new MutationObserver(function(){ onScroll(); if(!buyBtn) tryInit(); })
    .observe(document.documentElement, {childList:true, subtree:true});
})();
