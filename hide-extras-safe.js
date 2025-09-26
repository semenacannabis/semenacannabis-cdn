(function(){
  // přesně cílené texty
  var targets = [
    { rx: /^detailní\s+informace$/i, tags: ['H2','H3','H4','A','BUTTON'] },
    { rx: /^tisk$/i,                  tags: ['A','BUTTON'] },
    { rx: /^zeptat\s*se$/i,           tags: ['A','BUTTON'] }
  ];

  function hideExactItems(root){
    var hidden = 0;
    (root || document).querySelectorAll('a,button,h2,h3,h4').forEach(function(el){
      var txt = (el.innerText || '').trim();
      if (!txt) return;
      for (var i=0;i<targets.length;i++){
        var t = targets[i];
        if (t.tags.indexOf(el.tagName) > -1 && t.rx.test(txt)){
          el.style.display = 'none';
          hidden++;
          break;
        }
      }
    });
    return hidden;
  }

  function collapseEmptyParents(){
    var collapsed = 0;
    document.querySelectorAll('a,button,h2,h3,h4').forEach(function(el){
      if (el.style.display === 'none' && el.parentElement){
        var box = el.parentElement;
        // zkolabuj jen malé panely (bezpečné limity)
        var r = box.getBoundingClientRect();
        var kids = Array.from(box.children);
        var allGone = kids.every(function(k){ return k.style.display === 'none' || k.offsetHeight === 0; });
        if (allGone && r.height < 200 && r.width <= window.innerWidth){
          box.style.display = 'none';
          collapsed++;
        }
      }
    });
    return collapsed;
  }

  function run(root){
    var h = hideExactItems(root);
    var c = collapseEmptyParents();
    if (h || c) console.log('[HideExtras] hidden:', h, 'collapsed:', c);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ run(); });
  else run();

  // reaguj na dynamický obsah
  new MutationObserver(function(m){
    for (var i=0;i<m.length;i++){
      if (m[i].addedNodes && m[i].addedNodes.length){ run(m[i].target); break; }
    }
  }).observe(document.documentElement, { childList:true, subtree:true });
})();
