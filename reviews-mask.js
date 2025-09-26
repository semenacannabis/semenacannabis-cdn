(function () {
  function anonymizeName(raw) {
    if (!raw) return raw;
    var parts = raw.trim().split(/\s+/);
    if (parts.length < 2) return raw; // když je jen jedno slovo, neměníme
    var first = parts[0];
    var last = parts[parts.length - 1];
    var initial = last.charAt(0).toUpperCase();
    return first + ' ' + initial + '.';
  }

  function maskAll() {
    var nodes = document.querySelectorAll('.vote-name');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.dataset && el.dataset.maskedName === '1') continue;
      var original = (el.innerText || el.textContent || '').trim();
      if (!original) continue;
      var masked = anonymizeName(original);
      if (masked && masked !== original) {
        el.innerText = masked;
        if (el.dataset) el.dataset.maskedName = '1';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maskAll);
  } else {
    maskAll();
  }

  // Sledujeme změny na stránce (kdyby recenze naskakovaly dynamicky)
  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.addedNodes && m.addedNodes.length) {
        maskAll();
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
