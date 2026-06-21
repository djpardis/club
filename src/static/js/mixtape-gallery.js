(function () {
  var galleries = document.querySelectorAll("[data-mixtapes-gallery]");
  if (!galleries.length) return;

  galleries.forEach(function (gallery) {
    var track = gallery.querySelector("[data-mixtapes-track]");
    var prev = gallery.querySelector("[data-mixtapes-prev]");
    var next = gallery.querySelector("[data-mixtapes-next]");
    var status = gallery.querySelector("[data-mixtapes-status]");
    if (!track || !prev || !next) return;
    var index = 0;

    function items() {
      return Array.prototype.slice.call(track.querySelectorAll("li"));
    }

    function updateButtons() {
      var list = items();
      list.forEach(function (item, itemIndex) {
        item.classList.toggle("is-active", itemIndex === index);
      });
      prev.disabled = index <= 0;
      next.disabled = index >= list.length - 1;
      if (status) {
        status.textContent = String(index + 1) + " of " + String(list.length);
      }
    }

    prev.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      index = Math.max(index - 1, 0);
      updateButtons();
    });

    next.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      index = Math.min(index + 1, items().length - 1);
      updateButtons();
    });

    window.addEventListener("resize", updateButtons);
    updateButtons();
  });
})();
