(function(){
  // UPRAVTE selektory podle Shoptetu:
  var BUY_BTN_SEL = ".product-detail form button[type='submit'], .buy-form button[type='submit']";
  var TITLE_SEL   = ".product-detail h1, .p-detail__name, h1";
  var buyBtn, bar, titleEl;

  function createBar(){
    if(bar) return;
    titleEl = document.querySelector(TITLE_SEL);
    bar = document.createElement('div');
    bar.className='sticky-atc';
    bar.innerHTML = '<div class="sticky-atc__title"></div><button class="sticky-atc__btn">Přidat do košíku</button>';
    document.body.appendChild(bar);
    var t = (titleEl && (titleEl.innerText||titleEl.textContent).trim()) || 'Produkt';
    bar.querySelector('.sticky-atc__title').textContent = t;

    bar.querySelector('.sticky-atc__btn').addEventListener('click', function(){
      var b = document.querySelector(BUY_BTN_SEL);
      if(b){ b.click(); }
    });
  }

  function onScroll(){
    if(!buyBtn) buyBtn = document.querySelector(BUY_BTN_SEL);
    if(!buyBtn){ return; }
    var rect = buyBtn.getBoundingClientRect();
    var onScreen = rect.top>=0 && rect.bottom<=window.innerHeight;
    if(onScreen){ bar && bar.classList.remove('sticky-atc--show'); }
    else { createBar(); bar.classList.add('sticky-atc--show'); }
  }

  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('load', onScroll);
  document.addEventListener('DOMContentLoaded', onScroll);
})();
