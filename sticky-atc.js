(function(){
  // Selektor ATC tlačítka podle vašeho HTML:
  var BUY_BTN_SEL = "button.add-to-cart-button";
  var TITLE_SEL   = ".product-detail h1, .p-detail__name, h1";
  var bar, buyBtn, titleEl;

  function inViewport(el){
    if(!el) return false;
    var r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
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

    // posun nad SALE bar podle skutečné výšky, pokud existuje
    var saleBar = document.getElementById('saleBar');
    if (saleBar) {
      var h = saleBar.offsetHeight || 60;
      bar.style.bottom = h + 'px';
    }

    bar.querySelector('.sticky-atc__btn').addEventListener('click', function(){
      var b = document.querySelector(BUY_BTN_SEL);
      if (b) { b.click(); }
    });
  }

  function toggleBar(){
    if(!buyBtn) buyBtn = document.querySelector(BUY_BTN_SEL);
    if(!buyBtn) return; // na stránce bez ATC nic nedělej

    var scrolled = window.scrollY || window.pageYOffset;
    var show = !inViewport(buyBtn) || scrolled > 200; // zobraz po 200 px nebo když ATC není vidět

    if (show){
      createBar();
      bar.classList.add('sticky-atc--show');
    } else if (bar){
      bar.classList.remove('sticky-atc--show');
    }
  }

  ['scroll','resize','orientationchange'].forEach(function(e){
    window.addEventListener(e, toggleBar, {passive:true});
  });
  window.addEventListener('load', toggleBar);
  document.addEventListener('DOMContentLoaded', toggleBar);

  // kdyby se
