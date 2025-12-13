document.addEventListener("DOMContentLoaded", function () {
  const filters = document.getElementById("filters");
  if (!filters) return;

  const btn = document.createElement("div");
  btn.className = "sc-filters-toggle";
  btn.innerText = "➕ Podrobné filtry";

  btn.onclick = () => {
    filters.querySelectorAll(".filter-section").forEach(f => {
      f.style.display = "inline-block";
    });
    btn.remove();
  };

  filters.prepend(btn);
});
