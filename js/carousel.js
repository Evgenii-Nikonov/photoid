(() => {
  "use strict";
  const gallery = document.querySelector(".carousel");
  const wrapper = gallery?.querySelector(".carousel-track-wrapper");
  const track = gallery?.querySelector(".carousel-track");
  const previous = gallery?.querySelector(".arrow.left");
  const next = gallery?.querySelector(".arrow.right");
  if (!wrapper || !track || !previous || !next) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const items = [...track.children];
  const position = gallery.querySelector(".gallery-position");
  const progress = gallery.querySelector(".gallery-progress span");
  let current = 0;
  function step() {
    const item = track.firstElementChild;
    return item ? item.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || "0") : wrapper.clientWidth;
  }
  function move(direction) {
    wrapper.scrollBy({ left: direction * step(), behavior: motion.matches ? "instant" : "smooth" });
  }
  function update() {
    previous.disabled = wrapper.scrollLeft < 2;
    next.disabled = wrapper.scrollLeft >= wrapper.scrollWidth - wrapper.clientWidth - 2;
    const index = Math.min(items.length - 1, Math.round(wrapper.scrollLeft / step()));
    if (index !== current || !position?.textContent) {
      current = index;
      if (position) position.textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    }
    items.forEach((item, index) => item.classList.toggle("is-current", index === current));
    const max = wrapper.scrollWidth - wrapper.clientWidth;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? 0.125 + (wrapper.scrollLeft / max) * 0.875 : 1})`;
  }
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  wrapper.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
  });
  wrapper.addEventListener("scroll", update, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(update).observe(wrapper);
  else window.addEventListener("resize", update);
  update();

  // Keep native touch scrolling. Mouse dragging starts only after deliberate movement.
  let drag = null;
  let suppressClick = false;
  wrapper.addEventListener("dragstart", event => event.preventDefault());
  wrapper.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, scroll: wrapper.scrollLeft, active: false };
  });
  wrapper.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.x;
    if (!drag.active && Math.abs(delta) < 8) return;
    if (!drag.active) {
      drag.active = true;
      suppressClick = true;
      wrapper.setPointerCapture(event.pointerId);
      wrapper.classList.add("is-dragging");
    }
    wrapper.scrollLeft = drag.scroll - delta;
  });
  function stopDrag() {
    drag = null;
    wrapper.classList.remove("is-dragging");
    setTimeout(() => { suppressClick = false; }, 0);
  }
  wrapper.addEventListener("pointerup", stopDrag);
  wrapper.addEventListener("pointercancel", stopDrag);
  wrapper.addEventListener("lostpointercapture", stopDrag);
  wrapper.addEventListener("click", event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  }, true);

  const dialog = document.querySelector(".photo-dialog");
  const image = dialog?.querySelector(".photo-dialog__image");
  const status = dialog?.querySelector(".photo-dialog__status");
  const count = dialog?.querySelector(".photo-dialog__count");
  const close = dialog?.querySelector(".photo-dialog__close");
  const prevPhoto = dialog?.querySelector(".photo-dialog__prev");
  const nextPhoto = dialog?.querySelector(".photo-dialog__next");
  const photos = [...gallery.querySelectorAll(".photo-open")];
  if (!dialog || typeof dialog.showModal !== "function" || !image || !status || !count || !close || !prevPhoto || !nextPhoto) return;
  let selected = 0;
  let photoDirection = 1;
  let imageAnimation = null;
  let opener = null;
  let previousOverflow = "";
  function selectPhoto(index) {
    photoDirection = index >= selected ? 1 : -1;
    imageAnimation?.cancel();
    selected = Math.max(0, Math.min(index, photos.length - 1));
    status.textContent = "Загружаем фото…";
    status.hidden = false;
    image.hidden = true;
    image.alt = photos[selected].querySelector("img").alt;
    image.src = photos[selected].href;
    count.textContent = `${String(selected + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
    prevPhoto.disabled = selected === 0;
    nextPhoto.disabled = selected === photos.length - 1;
  }
  image.addEventListener("load", () => {
    image.hidden = false;
    status.hidden = true;
    if (!motion.matches && typeof image.animate === "function") {
      imageAnimation = image.animate([
        { opacity: .3, transform: `translateX(${photoDirection * 12}px)` },
        { opacity: 1, transform: "translateX(0)" }
      ], { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  });
  motion.addEventListener("change", event => { if (event.matches) imageAnimation?.cancel(); });
  image.addEventListener("error", () => { status.textContent = "Фото не удалось загрузить. Выберите другое или закройте просмотр."; image.hidden = true; });
  photos.forEach((photo, index) => {
    photo.querySelector("img").draggable = false;
    photo.addEventListener("click", event => {
      // Modified clicks retain standard link behavior (new tab/download).
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = photo;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      selectPhoto(index);
      dialog.showModal();
    });
  });
  close.addEventListener("click", () => dialog.close());
  prevPhoto.addEventListener("click", () => selectPhoto(selected - 1));
  nextPhoto.addEventListener("click", () => selectPhoto(selected + 1));
  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      selectPhoto(selected + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    imageAnimation?.cancel();
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
})();
