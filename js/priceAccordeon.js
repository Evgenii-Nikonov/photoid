(() => {
  "use strict";
  document.querySelectorAll(".accordion").forEach((accordion, groupIndex) => {
    const items = [...accordion.querySelectorAll(".accordion-item")];
    function setExpanded(item, expanded) {
      const button = item.querySelector(".accordion-header");
      const panel = item.querySelector(".accordion-content");
      if (!button || !panel) return;
      button.setAttribute("aria-expanded", String(expanded));
      panel.hidden = !expanded;
      item.classList.toggle("active", expanded);
    }
    items.forEach((item, index) => {
      const button = item.querySelector(".accordion-header");
      const panel = item.querySelector(".accordion-content");
      if (!button || !panel) return;
      panel.id = `answer-${groupIndex}-${index}`;
      button.setAttribute("aria-controls", panel.id);
      setExpanded(item, false);
      button.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") !== "true";
        items.forEach(other => setExpanded(other, other === item && expanded));
      });
    });
  });
})();
