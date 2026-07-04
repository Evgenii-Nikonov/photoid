/* =========================================================
   EFFECTS — прогресс скролла, счётчики, scrollspy,
   параллакс героя, tilt карточек, пауза видео вне экрана
   ========================================================= */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Полоса прогресса прокрутки ---------- */
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  document.body.appendChild(progress);

  let ticking = false;
  function updateProgress() {
    const scrollTop = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    progress.style.width = pct + "%";
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    },
    { passive: true }
  );
  updateProgress();

  /* ---------- 2. Анимированные счётчики ---------- */
  const counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length && !prefersReduced) {
    const animateCount = (el) => {
      const target = parseFloat(el.dataset.count);
      const duration = 1600;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        // easeOutExpo
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = Math.round(target * eased).toString();
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      };
      requestAnimationFrame(step);
    };
    const ioCount = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            ioCount.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => ioCount.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = String(c.dataset.count)));
  }

  /* ---------- 3. Scrollspy — активный пункт меню ---------- */
  const navLinks = Array.from(document.querySelectorAll(".main-nav__list a[href^='#']"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = "#" + entry.target.id;
            navLinks.forEach((l) =>
              l.classList.toggle("is-active", l.getAttribute("href") === id)
            );
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- 4. Параллакс блоба и фото в герое ---------- */
  if (!prefersReduced) {
    const heroBlob = document.querySelector(".hero__media-blob");
    const heroImage = document.querySelector(".hero__image");
    const hero = document.querySelector(".hero");
    if (hero && (heroBlob || heroImage)) {
      window.addEventListener(
        "scroll",
        function () {
          const y = window.scrollY;
          if (y > window.innerHeight) return;
          if (heroBlob) heroBlob.style.transform = `translateY(${y * 0.06}px)`;
          if (heroImage) heroImage.style.transform = `translateY(${y * -0.04}px)`;
        },
        { passive: true }
      );
    }
  }

  /* ---------- 5. Tilt-эффект на карточках преимуществ ---------- */
  if (!prefersReduced && window.matchMedia("(pointer: fine)").matches) {
    const tiltSelector = ".advantage-card";
    document.querySelectorAll(tiltSelector).forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translateY(-6px) perspective(800px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---------- 6. Видео-фон в прайсе: пауза вне экрана ---------- */
  const bgVideo = document.querySelector(".pricing__bg-video");
  if (bgVideo && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const p = bgVideo.play();
            if (p && p.catch) p.catch(() => {});
          } else {
            bgVideo.pause();
          }
        });
      },
      { threshold: 0.05 }
    );
    vio.observe(bgVideo);
  }

  /* ---------- 7. Подсветка пунктов бегущей строки при появлении ---------- */
  // (анимация на CSS, тут только плавный старт после загрузки)
})();
