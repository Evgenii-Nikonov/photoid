// Шапка: тень при прокрутке
const header = document.getElementById("site-header");
if (header) {
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Бургер-меню
const burger = document.getElementById("burger");
const mainNav = document.getElementById("main-nav");
const navOverlay = document.getElementById("nav-overlay");

function closeMenu() {
  burger?.setAttribute("aria-expanded", "false");
  mainNav?.classList.remove("is-open");
  navOverlay?.classList.remove("is-active");
  document.body.style.overflow = "";
}

function toggleMenu() {
  const isOpen = mainNav?.classList.toggle("is-open");
  burger?.setAttribute("aria-expanded", String(Boolean(isOpen)));
  navOverlay?.classList.toggle("is-active", Boolean(isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";
}

burger?.addEventListener("click", toggleMenu);
navOverlay?.addEventListener("click", closeMenu);
mainNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("resize", () => {
  if (window.innerWidth > 992) closeMenu();
});

// Год в футере
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Плавное появление блоков при прокрутке
const revealTargets = document.querySelectorAll(
  ".advantage-card, .process-step, .price-card, .price-block, .compare-container, .contact-card, .where__map"
);
if ("IntersectionObserver" in window && revealTargets.length) {
  revealTargets.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  revealTargets.forEach((el) => io.observe(el));
}
