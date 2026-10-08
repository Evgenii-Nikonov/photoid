(() => {
  "use strict";
  const value = document.querySelector("meta[name='yandex-metrika-id']")?.content || "";
  const counter = Number(value);
  // No counter is created or contacted until the owner supplies a real ID.
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(counter)) return;
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Date.now();
  const script = document.createElement("script");
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  script.async = true;
  script.addEventListener("error", () => { document.documentElement.dataset.analytics = "unavailable"; });
  document.head.appendChild(script);
  try {
    window.ym(counter, "init", { accurateTrackBounce: true, trackLinks: true, clickmap: false, webvisor: false });
  } catch {
    document.documentElement.dataset.analytics = "unavailable";
    return;
  }

  document.addEventListener("click", event => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const url = new URL(link.href);
    let goal = null;
    if (url.protocol === "tel:") goal = "call_click";
    else if (url.hostname === "t.me") goal = "telegram_click";
    else if (url.hostname === "max.ru") goal = "max_click";
    else if (url.hostname === "yandex.ru" && url.pathname.startsWith("/maps")) goal = "map_click";
    else if (url.origin === location.origin && url.pathname.endsWith("/price.html")) goal = "price_open";
    else if (url.origin === location.origin && url.hash === "#contacts") goal = "contact_intent";
    if (!goal) return;
    const placement = link.closest(".site-header") ? "header" : link.closest(".site-footer") ? "footer" : link.matches(".mobile-cta") ? "mobile" : link.closest(".price-card") ? "package" : "content";
    try {
      window.ym(counter, "reachGoal", goal, { placement });
    } catch {
      // Analytics failures must never prevent a call or navigation.
      document.documentElement.dataset.analytics = "unavailable";
    }
  });
})();
