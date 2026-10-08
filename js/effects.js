(() => {
  "use strict";
  const links = [...document.querySelectorAll(".main-nav__list a[href^='#']")];
  const sections = links.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  if (sections.length) {
    let frame = null;
    const update = () => {
      const line = window.innerHeight * 0.4;
      const current = sections.find(section => { const rect = section.getBoundingClientRect(); return rect.top <= line && rect.bottom > line; });
      links.forEach(link => {
        const active = link.hash === `#${current?.id}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      frame = null;
    };
    window.addEventListener("scroll", () => { if (frame === null) frame = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  // Load the background only when it is visible; pause on motion preferences and tab changes.
  const video = document.querySelector(".pricing__bg-video");
  if (video) {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    let pending = false;
    let failed = false;
    let playTimeout = null;
    video.dataset.state = "idle";
    video.muted = true;

    function fallback() {
      failed = true;
      clearTimeout(playTimeout);
      video.pause();
      video.dataset.state = "fallback";
    }
    function pause() {
      clearTimeout(playTimeout);
      video.pause();
      if (!failed) video.dataset.state = "paused";
    }
    async function play() {
      if (!inView || document.hidden || motion.matches || pending || failed) return;
      const source = video.querySelector("source");
      if (source && !source.hasAttribute("src")) {
        source.src = source.dataset.src;
        video.load();
      }
      pending = true;
      video.dataset.state = "loading";
      playTimeout = setTimeout(fallback, 12000);
      try {
        await video.play();
        if (!inView || document.hidden || motion.matches) pause();
        else video.dataset.state = "playing";
      } catch {
        // A cancelled offscreen play is expected; blocked autoplay uses the poster.
        if (inView && !document.hidden && !motion.matches) fallback();
      } finally {
        pending = false;
        clearTimeout(playTimeout);
      }
    }
    video.addEventListener("error", fallback);
    video.querySelector("source")?.addEventListener("error", fallback);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        if (inView) play();
        else pause();
      }, { threshold: 0.05 }).observe(video);
    } else {
      const checkVisibility = () => {
        const rect = video.getBoundingClientRect();
        inView = rect.bottom > 0 && rect.top < innerHeight;
        if (inView) play(); else pause();
      };
      window.addEventListener("scroll", checkVisibility, { passive: true });
      checkVisibility();
    }
    document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); else play(); });
    motion.addEventListener("change", event => { if (event.matches) pause(); else play(); });
  }

  const widget = document.querySelector(".sw-app");
  const message = document.getElementById("reviews-message");
  const retry = document.getElementById("reviews-retry");
  if (widget && message && retry) {
    let loading = false;
    let script = null;
    let timeout = null;
    const status = message.parentElement;
    function enhanceReviews() {
      widget.querySelectorAll("img:not([alt])").forEach(image => {
        image.alt = image.closest(".sw-review-item-photo") ? "" : "Фото из отзыва клиента";
      });
      widget.querySelectorAll(".sw-scroll").forEach(region => {
        if (region.scrollWidth > region.clientWidth + 1 || region.scrollHeight > region.clientHeight + 1) {
          region.tabIndex = 0;
          region.setAttribute("aria-label", region.closest(".sw-review-item-images") ? "Фотографии из отзыва" : "Отзывы клиентов");
        }
      });
      widget.querySelectorAll("a[target='_blank']").forEach(link => { link.relList.add("noopener"); });
      // Provider branding uses inline !important; retain the link with readable contrast.
      widget.closest(".feedback")?.querySelectorAll(".sw-review-bottom a").forEach(link => {
        link.style.setProperty("color", "#5d6573", "important");
      });
    }
    const hasReviews = () => widget.dataset.swState === "loaded" && Boolean(widget.querySelector("iframe") || widget.textContent.trim());
    function ready() {
      if (!hasReviews()) return;
      enhanceReviews();
      clearTimeout(timeout);
      loading = false;
      widget.setAttribute("aria-busy", "false");
      status.hidden = true;
      retry.hidden = true;
    }
    function failed() {
      clearTimeout(timeout);
      loading = false;
      widget.setAttribute("aria-busy", "false");
      message.textContent = "Отзывы сейчас не загрузились. Попробуйте снова или откройте карточку студии на карте.";
      status.hidden = false;
      retry.hidden = false;
    }
    function load() {
      if (loading) return;
      if (hasReviews()) return ready();
      loading = true;
      widget.setAttribute("aria-busy", "true");
      status.hidden = false;
      retry.hidden = true;
      message.textContent = "Загружаем отзывы…";
      if (typeof window.swAppRefresh === "function") {
        window.swAppRefresh();
        timeout = setTimeout(() => hasReviews() ? ready() : failed(), 12000);
        return;
      }
      script?.remove();
      script = document.createElement("script");
      script.src = "https://res.smartwidgets.ru/app.js";
      script.async = true;
      script.addEventListener("error", failed, { once: true });
      document.head.appendChild(script);
      timeout = setTimeout(() => hasReviews() ? ready() : failed(), 12000);
    }
    new MutationObserver(() => {
      if (["quota", "nodata"].includes(widget.dataset.swState)) failed();
      else ready();
    }).observe(widget, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-sw-state"] });
    retry.addEventListener("click", load);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { observer.disconnect(); load(); } }, { rootMargin: "300px" });
      observer.observe(widget.closest(".feedback") || widget);
    } else load();
  }
})();
