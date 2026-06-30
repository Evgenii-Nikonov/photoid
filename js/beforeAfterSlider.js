const container = document.querySelector(".compare-container");
const overlay = document.querySelector(".compare-img.before");
const slider = document.querySelector(".slider-line");

if (container && overlay && slider) {
  let isDragging = false;

  function setPercent(percent) {
    const clamped = Math.max(0, Math.min(percent, 100));
    overlay.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
    slider.style.left = clamped + "%";
    slider.setAttribute("aria-valuenow", String(Math.round(clamped)));
  }

  function percentFromClientX(clientX) {
    const rect = container.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (offsetX / rect.width) * 100;
  }

  slider.setAttribute("aria-valuemin", "0");
  slider.setAttribute("aria-valuemax", "100");
  slider.setAttribute("aria-valuenow", "50");

  slider.addEventListener("pointerdown", (e) => {
    isDragging = true;
    slider.setPointerCapture(e.pointerId);
  });

  slider.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    setPercent(percentFromClientX(e.clientX));
  });

  slider.addEventListener("pointerup", (e) => {
    isDragging = false;
    slider.releasePointerCapture(e.pointerId);
  });

  container.addEventListener("pointerdown", (e) => {
    if (e.target === slider || slider.contains(e.target)) return;
    setPercent(percentFromClientX(e.clientX));
  });

  slider.addEventListener("keydown", (e) => {
    const current = parseFloat(slider.style.left) || 50;
    if (e.key === "ArrowLeft") {
      setPercent(current - 5);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      setPercent(current + 5);
      e.preventDefault();
    }
  });
}
