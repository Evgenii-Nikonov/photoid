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

  /* ---------- 4. Mouse-parallax многослойной композиции hero ---------- */
  // Каждый слой двигается со своей скоростью (data-parallax = множитель глубины).
  // Плавность — через requestAnimationFrame + easing. Отключено на тач-устройствах
  // и узких экранах, а также при prefers-reduced-motion (см. условие выше).
  if (!prefersReduced && window.matchMedia("(pointer: fine) and (min-width: 992px)").matches) {
    const stage = document.querySelector(".hero__media");
    const targets = stage ? stage.querySelectorAll("[data-parallax]") : [];
    if (stage && targets.length) {
      // Кэш элементов: глубина + базовый поворот (--rot у карточек)
      const items = Array.from(targets).map((el) => ({
        el,
        depth: parseFloat(el.dataset.parallax) || 0.5,
        rot: (getComputedStyle(el).getPropertyValue("--rot") || "").trim() || "0deg",
      }));
      const MAX = 14; // максимальное смещение, px
      let tx = 0, ty = 0; // цель (нормированная -1..1)
      let cx = 0, cy = 0; // сглаженное значение
      let raf = null;

      const tick = () => {
        // easing: приближаемся к цели на ~8% за кадр — мягкое «доганяющее» движение
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        for (const { el, depth, rot } of items) {
          const x = cx * MAX * depth;
          const y = cy * MAX * depth;
          el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot})`;
        }
        if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
          raf = requestAnimationFrame(tick);
        } else {
          raf = null;
        }
      };

      window.addEventListener(
        "mousemove",
        (e) => {
          const r = stage.getBoundingClientRect();
          tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
          ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
          if (!raf) raf = requestAnimationFrame(tick);
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
