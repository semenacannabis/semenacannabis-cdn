(function waitForFilters() {
  const filters = document.getElementById("filters");
  if (!filters) return setTimeout(waitForFilters, 200);

  const sections = filters.querySelectorAll(".filter-section");
  if (!sections.length) return setTimeout(waitForFilters, 200);

  const primaryKeywords = [
    "Cena",
    "Indika",
    "Sativa",
    "Hybrid",
    "THC",
    "CBD",
    "Doba",
    "Výnos",
    "Výška"
  ];

  sections.forEach(sec => {
    const title = sec.innerText || "";

    if (!primaryKeywords.some(k => title.includes(k))) {
      sec.classList.add("sc-secondary-filter");
    }
  });

  // Tlačítko – pouze přepíná VIDITELNOST
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "sc-filters-toggle";
  toggleBtn.innerText = "➕ Podrobné filtry";

  toggleBtn.addEventListener("click", e => {
    e.preventDefault();
    const hidden = filters.classList.toggle("sc-show-secondary");
    toggleBtn.innerText = hidden
      ? "➖ Skrýt podrobné filtry"
      : "➕ Podrobné filtry";
  });

  filters.prepend(toggleBtn);
})();
