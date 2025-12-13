document.addEventListener("DOMContentLoaded", function () {

  const filtersContainer = document.getElementById("filters");
  if (!filtersContainer) return;

  const sections = Array.from(filtersContainer.querySelectorAll(".filter-section"));

const primaryFilterIds = [
  "price",        // Cena
  "sativa",       // Sativa
  "indica",       // Indika
  "hybrid",       // Hybrid
  "thc",          // THC
  "cbd",          // CBD
  "flowering",    // Doba květu
  "yield",        // Výnos
  "height"        // Výška
];


  const primaryWrap = document.createElement("div");
  primaryWrap.className = "sc-primary";

  const secondaryWrap = document.createElement("div");
  secondaryWrap.className = "sc-secondary";

 sections.forEach(sec => {
  const param = sec.getAttribute("data-filter-id") || "";
  if (primaryFilterIds.some(id => param.includes(id))) {
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
    toggle.innerText = open ? "➕ Podrobné filtry" : "➖ Skrýt podrobné filtry";
  });

  filtersContainer.prepend(title);
  filtersContainer.appendChild(primaryWrap);
  filtersContainer.appendChild(toggle);
  filtersContainer.appendChild(secondaryWrap);

});
