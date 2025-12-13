(function waitForFilters() {
  const filters = document.getElementById("filters");
  if (!filters) return setTimeout(waitForFilters, 200);

  const sections = filters.querySelectorAll(".filter-section");
  if (!sections.length) return setTimeout(waitForFilters, 200);

  // tlačítko
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sc-filters-toggle";
  btn.innerText = "➕ Podrobné filtry";

  btn.addEventListener("click", e => {
    e.preventDefault();
    filters.classList.toggle("sc-show-secondary");
    btn.innerText = filters.classList.contains("sc-show-secondary")
      ? "➖ Skrýt podrobné filtry"
      : "➕ Podrobné filtry";
  });

  filters.prepend(btn);

  // ZABRÁNĚNÍ SKOKU NAHORU
  filters.addEventListener("click", e => {
    const a = e.target.closest("a[href='#']");
    if (a) e.preventDefault();
  });
})();
