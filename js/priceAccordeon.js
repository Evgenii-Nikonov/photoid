const headers = document.querySelectorAll(".accordion-header");

headers.forEach((header) => {
  header.addEventListener("click", () => {
    const item = header.parentElement;

    // если уже открыт, закрыть
    if (item.classList.contains("active")) {
      item.classList.remove("active");
    } else {
      // закрыть все
      document.querySelectorAll(".accordion-item").forEach((i) => i.classList.remove("active"));
      // открыть текущий
      item.classList.add("active");
    }
  });
});
