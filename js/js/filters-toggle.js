(function waitForFilters() {
  const filters = document.getElementById("filters");
  if (!filters) {
    setTimeout(waitForFilters, 200);
    return;
  }

  const sections = filters.querySelectorAll(".filter-section");
  if (!sections.length) {
    setTimeout(waitForFilters, 200);
    return;
  }

  // ===== OD TUD UŽ FILTRY EXISTUJÍ =====

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

  const primaryWrap = document.createElement("div");
  primaryWrap.className = "sc-filters-primary";

  const secondaryWrap = document.createElement("div");
  secondaryWrap.className = "sc-filters-secondary";
  secondaryWrap.style.display = "none";

  sections.forEach(sec => {
    const title = sec.innerText || "";
    if (primaryKeywords.some(k => title.includes(k))) {
      primaryWrap.appendChild(sec);
    } else {
      secondaryWrap.appendChild(sec);
    }
  });

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "sc-filters-toggle";
  toggleBtn.type = "button";
  toggleBtn.innerText = "➕ Podrobné filtry";

  toggleBtn.addEventListener("click", () => {
    const open = secondaryWrap.style.display === "none";
    secondaryWrap.style.display = open ? "block" : "none";
    toggleBtn.innerText = open
      ? "➖ Skrýt podrobné filtry"
      : "➕ Podrobné filtry";
  });

  filters.innerHTML = "";
  filters.appendChild(toggleBtn);
  filters.appendChild(primaryWrap);
  filters.appendChild(secondaryWrap);

})();
