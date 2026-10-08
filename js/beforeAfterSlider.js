(() => {
  "use strict";
  const container = document.querySelector(".compare-container");
  const before = container?.querySelector(".compare-img.before");
  const slider = container?.querySelector(".slider-line");
  if (!container || !before || !slider) return;
  let percent = 50;
  let pointerId = null;
  function setPercent(value) {
    percent = Math.max(0, Math.min(value, 100));
    before.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    slider.style.left = `${percent}%`;
    slider.setAttribute("aria-valuenow", String(Math.round(percent)));
    slider.setAttribute("aria-valuetext", `До обработки: ${Math.round(percent)}%`);
  }
  function fromPointer(event) {
    const rect = container.getBoundingClientRect();
    if (rect.width > 0) setPercent((event.clientX - rect.left) / rect.width * 100);
  }
  container.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerId = event.pointerId;
    container.setPointerCapture(pointerId);
    slider.focus({ preventScroll: true });
    fromPointer(event);
  });
  container.addEventListener("pointermove", event => { if (event.pointerId === pointerId) fromPointer(event); });
  const stop = () => { pointerId = null; };
  container.addEventListener("pointerup", stop);
  container.addEventListener("pointercancel", stop);
  container.addEventListener("lostpointercapture", stop);
  slider.addEventListener("keydown", event => {
    const changes = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -10, PageUp: 10 };
    if (event.key === "Home") setPercent(0);
    else if (event.key === "End") setPercent(100);
    else if (Object.hasOwn(changes, event.key)) setPercent(percent + changes[event.key]);
    else return;
    event.preventDefault();
  });
  setPercent(percent);
})();
