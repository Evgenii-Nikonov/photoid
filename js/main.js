(() => {
  "use strict";
  document.documentElement.classList.add("js");
  const header = document.getElementById("site-header");
  const burger = document.getElementById("burger");
  const nav = document.getElementById("main-nav");
  const overlay = document.getElementById("nav-overlay");
  const mobile = window.matchMedia("(max-width: 1199px)");
  const background = document.querySelectorAll("main, .site-footer, .mobile-cta, .logo, .header__icons, body > .visually-hidden");
  let previousOverflow = "";
  let isOpen = false;
  function syncNav() {
    if (!nav) return;
    const hidden = mobile.matches && !isOpen;
    nav.inert = hidden;
    if (hidden) nav.setAttribute("aria-hidden", "true");
    else nav.removeAttribute("aria-hidden");
  }
  function closeMenu() {
    if (isOpen) {
      background.forEach(element => { element.inert = false; });
      document.body.style.overflow = previousOverflow;
      burger?.focus();
    }
    isOpen = false;
    burger?.setAttribute("aria-expanded", "false");
    burger?.setAttribute("aria-label", "Открыть меню");
    nav?.classList.remove("is-open");
    overlay?.classList.remove("is-active");
    syncNav();
  }
  burger?.addEventListener("click", () => {
    if (isOpen) return closeMenu();
    if (!nav || !mobile.matches) return;
    isOpen = true;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    background.forEach(element => { element.inert = true; });
    nav.classList.add("is-open");
    overlay?.classList.add("is-active");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Закрыть меню");
    syncNav();
    nav.querySelector("a")?.focus();
  });
  overlay?.addEventListener("click", closeMenu);
  nav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      if (!isOpen) return;
      closeMenu();
      if (link.hash && link.pathname === location.pathname) {
        const target = document.getElementById(link.hash.slice(1));
        if (target) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
      }
    });
  });
  document.addEventListener("keydown", event => {
    if (!isOpen) return;
    if (event.key === "Escape") { event.preventDefault(); closeMenu(); }
    else if (event.key === "Tab") {
      const controls = [...nav.querySelectorAll("a, button"), burger];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  mobile.addEventListener("change", closeMenu);
  syncNav();
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
