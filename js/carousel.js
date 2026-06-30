const track = document.querySelector(".carousel-track");
const wrapper = document.querySelector(".carousel-track-wrapper");
const leftArrow = document.querySelector(".arrow.left");
const rightArrow = document.querySelector(".arrow.right");

if (track && wrapper && leftArrow && rightArrow) {
  const CLONE_COUNT = 4; // не меньше максимального числа видимых карточек (4 на десктопе)
  const originals = Array.from(track.children);
  const total = originals.length;

  const headClones = originals.slice(-CLONE_COUNT).map((node) => node.cloneNode(true));
  const tailClones = originals.slice(0, CLONE_COUNT).map((node) => node.cloneNode(true));

  const headFragment = document.createDocumentFragment();
  headClones.forEach((node) => headFragment.appendChild(node));
  track.insertBefore(headFragment, track.firstChild);
  tailClones.forEach((node) => track.appendChild(node));

  let currentIndex = CLONE_COUNT;
  let isAnimating = false;
  const ANIMATION_MS = 350;

  function getStep() {
    const firstItem = track.children[0];
    const itemWidth = firstItem.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0");
    return itemWidth + gap;
  }

  function update(animated = true) {
    const offset = -(currentIndex * getStep());
    track.style.transition = animated ? `transform ${ANIMATION_MS}ms ease-in-out` : "none";
    track.style.transform = `translateX(${offset}px)`;
  }

  function lock() {
    isAnimating = true;
    setTimeout(() => {
      isAnimating = false;
    }, ANIMATION_MS + 30);
  }

  function next() {
    if (isAnimating) return;
    lock();
    currentIndex++;
    update();
    if (currentIndex === total + CLONE_COUNT) {
      setTimeout(() => {
        currentIndex = CLONE_COUNT;
        update(false);
      }, ANIMATION_MS);
    }
  }

  function prev() {
    if (isAnimating) return;
    lock();
    currentIndex--;
    update();
    if (currentIndex === 0) {
      setTimeout(() => {
        currentIndex = total;
        update(false);
      }, ANIMATION_MS);
    }
  }

  rightArrow.addEventListener("click", next);
  leftArrow.addEventListener("click", prev);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => update(false), 120);
  });

  // Свайп для тач-устройств
  let touchStartX = 0;
  wrapper.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  wrapper.addEventListener(
    "touchend",
    (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) < 40) return;
      if (deltaX < 0) next();
      else prev();
    },
    { passive: true }
  );

  update(false);
}
