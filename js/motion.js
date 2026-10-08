(() => {
  "use strict";
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const navigation = document.querySelector(".main-nav");
  // Apply the initial closed mobile position before enabling menu transitions.
  requestAnimationFrame(() => requestAnimationFrame(() => navigation?.classList.add("is-motion-ready")));
  if (!Element.prototype.animate || !("IntersectionObserver" in window)) return;
  const active = new Map();
  const completed = new WeakSet();
  const tokens = getComputedStyle(document.documentElement);
  const duration = parseFloat(tokens.getPropertyValue("--motion-enter")) || 900;
  const easing = tokens.getPropertyValue("--motion-ease").trim() || "cubic-bezier(.4,0,.2,1)";

  function enter(element, delay = 0, keepReadable = false) {
    if (preference.matches || completed.has(element)) return;
    completed.add(element);
    element.setAttribute("data-motion-entering", "");
    const animation = element.animate([
      { opacity: keepReadable ? 1 : .75, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" }
    ], { duration, delay, easing, fill: "backwards" });
    active.set(element, animation);
    const cleanup = () => { active.delete(element); element.removeAttribute("data-motion-entering"); };
    animation.addEventListener("finish", cleanup, { once: true });
    animation.addEventListener("cancel", cleanup, { once: true });
  }

  const hero = document.querySelector(".hero");
  hero?.querySelectorAll(".eyebrow, .hero__title, .hero__subtitle, .hero__description, .hero__cta, .hero__badges, .hero__media").forEach((element, index) => {
    // The main heading and portrait stay opaque so motion does not delay their paint.
    enter(element, Math.min(index * 45, 180), element.matches("h1, .hero__media"));
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const siblings = entry.target.parentElement.children;
      const index = [...siblings].filter(element => element.matches(".advantage-card, .process-step, .price-card, .carousel-item")).indexOf(entry.target);
      enter(entry.target, index >= 0 ? Math.min(index * 75, 225) : 0);
    });
  }, { threshold: .08, rootMargin: "0px 0px -24px 0px" });
  document.querySelectorAll("main .common-title, .advantage-card, .process-step, .price-card, .carousel-item, .contact-card").forEach(element => observer.observe(element));

  document.addEventListener("focusin", event => {
    active.forEach((animation, element) => {
      if (element.contains(event.target)) animation.cancel();
    });
  });
  preference.addEventListener("change", event => {
    if (!event.matches) return;
    active.forEach(animation => animation.cancel());
    active.clear();
  });
})();
