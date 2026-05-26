// Lightweight image lightbox + carousel.
// Scans any element tagged with [data-lightbox-group], turns the <figure>
// images inside into a single carousel for that group, and opens a
// full-screen overlay with prev/next/keyboard/swipe.
(function () {
  "use strict";

  var GROUP_SELECTOR = "[data-lightbox-group]";
  var FIGURE_SELECTOR = "figure";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function collectFigures(scope) {
    var figures = scope.querySelectorAll(FIGURE_SELECTOR);
    var items = [];
    figures.forEach(function (fig) {
      var img = fig.querySelector("img");
      if (!img) return;
      if (fig.querySelector("iframe")) return;
      // Skip figures that belong to a more specific nested group so the
      // outer scope doesn't double-collect (e.g. gallery inside <main>).
      var owner = fig.closest(GROUP_SELECTOR);
      if (owner && owner !== scope) return;
      var cap = fig.querySelector("figcaption");
      items.push({
        figure: fig,
        img: img,
        src: img.currentSrc || img.src,
        alt: img.alt || "",
        caption: cap ? cap.innerHTML : "",
      });
    });
    return items;
  }

  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image viewer");
    overlay.hidden = true;
    overlay.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Close">&times;</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous image">&#8592;</button>' +
      '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next image">&#8594;</button>' +
      '<figure class="lightbox__stage">' +
      '<img class="lightbox__img" alt="" />' +
      '<figcaption class="lightbox__caption"></figcaption>' +
      '<p class="lightbox__counter" aria-live="polite"></p>' +
      "</figure>";
    document.body.appendChild(overlay);
    return overlay;
  }

  ready(function () {
    var scopes = document.querySelectorAll(GROUP_SELECTOR);
    if (!scopes.length) return;

    var overlay = buildOverlay();
    var imgEl = overlay.querySelector(".lightbox__img");
    var capEl = overlay.querySelector(".lightbox__caption");
    var counterEl = overlay.querySelector(".lightbox__counter");
    var btnPrev = overlay.querySelector(".lightbox__nav--prev");
    var btnNext = overlay.querySelector(".lightbox__nav--next");
    var btnClose = overlay.querySelector(".lightbox__close");
    var items = [];
    var current = 0;
    var lastFocus = null;
    var touchStartX = 0;
    var touchStartY = 0;

    function render(idx) {
      current = (idx + items.length) % items.length;
      var it = items[current];
      imgEl.src = it.src;
      imgEl.alt = it.alt;
      capEl.innerHTML = it.caption;
      capEl.hidden = !it.caption;
      counterEl.textContent = items.length > 1 ? current + 1 + " / " + items.length : "";
      var hasMany = items.length > 1;
      btnPrev.hidden = !hasMany;
      btnNext.hidden = !hasMany;
    }

    function open(idx) {
      lastFocus = document.activeElement;
      render(idx);
      overlay.hidden = false;
      document.body.classList.add("lightbox-open");
      btnClose.focus();
    }

    function close() {
      overlay.hidden = true;
      document.body.classList.remove("lightbox-open");
      imgEl.removeAttribute("src");
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    function next() {
      render(current + 1);
    }
    function prev() {
      render(current - 1);
    }

    scopes.forEach(function (scope) {
      var groupItems = collectFigures(scope);
      if (!groupItems.length) return;
      groupItems.forEach(function (it) {
        it.group = groupItems;
        it.figure.classList.add("is-zoomable");
        it.img.setAttribute("tabindex", "0");
        it.img.setAttribute("role", "button");
        it.img.setAttribute("aria-label", "Open image" + (it.caption ? ": " + it.img.alt : ""));
        it.img.addEventListener("click", function () {
          openGroup(groupItems, groupItems.indexOf(it));
        });
        it.img.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openGroup(groupItems, groupItems.indexOf(it));
          }
        });
      });
    });

    function openGroup(group, idx) {
      items = group;
      open(idx);
    }

    btnPrev.addEventListener("click", prev);
    btnNext.addEventListener("click", next);
    btnClose.addEventListener("click", close);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    document.addEventListener("keydown", function (e) {
      if (overlay.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    });

    overlay.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches[0]) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );
    overlay.addEventListener(
      "touchend",
      function (e) {
        if (!e.changedTouches[0]) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) next();
          else prev();
        }
      },
      { passive: true }
    );
  });
})();
