// Scrape-resistant email: assembled on click only.
(function () {
  const buttons = document.querySelectorAll(".email-btn");
  buttons.forEach((b) => {
    b.addEventListener("click", () => {
      const u = b.dataset.u;
      const d = b.dataset.d;
      if (!u || !d) return;
      // Build the address at runtime; never store the concatenated string.
      const addr = u + "\u0040" + d;
      window.location.href = "mailto:" + addr;
    });
  });
})();
