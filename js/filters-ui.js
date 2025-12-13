(function () {

  let initialized = false;

  function allFiltersLoaded(container) {
    const texts = container.innerText || "";
    return (
      texts.includes("Indika") &&
      texts.includes("Sativa") &&
      texts.includes("Hybrid")
    );
  }

  function initFilters() {
    if (initialized) return;

    const container = document.getElementById("filters");
    if (!container) return;

    if (!allFiltersLoaded(container)) return;

    const sections = Array.from(container.querySelectorAll(".filter-section"));
    if (!sections.length) return;

    initialized = true;

    const primaryWrap = document.createElement("div");
    primaryWrap.className = "sc-primary";

    const secondaryWrap = document.createElement("div");
    secondaryWrap.className = "sc-secondary";
    secondaryWrap.style.display = "none";

    sections.forEach(sec => {
      const text = sec.innerText || "";

      if (
        text.includes("Cena") ||
        text.includes("Indika") ||
        text.includes("Sativa") ||
        text.includes("Hybrid") ||
        text.includes("THC") ||
        text.includes("CBD") ||
        text.includes("Doba") ||
        text.includes("Výnos") ||
        text.includes("Výška")
      ) {
        primaryWrap.appendChild(sec);
      } else {
        secondaryWrap.appendChild(sec);
      }
    });

    const title = document.createElement("div");
    title.className = "sc-filter-title";
    title.innerText = "🌿 Rychlý vý
