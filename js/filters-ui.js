(function () {

  function initFilters() {
    const filtersContainer = document.getElementById("filters");
    if (!filtersContainer) return;

    const sections = Array.from(filtersContainer.querySelectorAll(".filter-section"));
    if (!sections.length) return;

    // už jednou upraveno → nedělej znovu
    if (filtersContainer.classList.contains("sc-ready")) return;
    filtersContainer.classList.add("sc-ready");

    const primaryWrap = document.createElement("div");
    primaryWrap.className = "sc-primary";

    const secondaryWrap = document.createElement("div");
    secondaryWrap.className = "sc-secondary";
    secondaryWrap.style.display = "none";

    sections.forEach(sec => {
      const text = sec.innerText || "";
      if (
        text.includes("Cena") ||
        text.includes("Sativa") ||
        text.includes("Indika") ||
        text.includes("Hybrid") ||
        text.includes("THC") ||
        text.includes("CBD") ||
        text.includes("Výnos") ||
        text.includes("Výška") ||
        text.includes("Doba")
      ) {
        primaryWrap.appendChild(sec);
      } else {
        secondaryWrap.appendChild(sec);
      }
    });

    const title = document.createElement("div");
    title.className = "sc-filter-title";
    title.innerText = "🌿 Rychlý výběr genetiky";

    const toggle = document.createElement("div");
    toggle.className = "sc-toggle";
    toggle.innerText = "➕ Podrobné filtry";

    toggle.addEventListener("click", () => {
      const open = secondaryWrap.style.display === "block";
      secondaryWrap.style.display = open ? "none" : "block";
      toggle.innerText = open
        ? "➕ Podrobné filtry"
        : "➖ Skrýt podrobné filtry";
    });

    filtersContainer.prepend(title);
    filtersContainer.appendChild(primaryWrap);
    filtersContainer.appendChild(toggle);
    filtersContainer.appendChild(secondaryWrap);
  }

  // spustit hned
  initFilters();

  // sledovat změny (Shoptet AJAX)
  const observer = new MutationObserver(() => {
    initFilters();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
