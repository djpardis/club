(function () {
  if (window._tocCleanup) window._tocCleanup();

  var toc = document.querySelector(".mixtape-post__toc");
  if (!toc) return;

  var items = Array.prototype.slice.call(toc.querySelectorAll("[data-heading-id]"));
  var headings = items
    .map(function (item) {
      return document.getElementById(item.getAttribute("data-heading-id"));
    })
    .filter(Boolean);

  if (!items.length || !headings.length) return;

  var manuallyCollapsed = {};

  function setActive(id) {
    var activeItem = toc.querySelector('[data-heading-id="' + id + '"]');
    var activeParentId = activeItem && (activeItem.getAttribute("data-parent-id") || id);

    delete manuallyCollapsed[activeParentId];

    items.forEach(function (item) {
      var itemId = item.getAttribute("data-heading-id");
      var isChild = item.hasAttribute("data-parent-id");
      var parentId = item.getAttribute("data-parent-id");
      var isActive = itemId === id;
      var isActiveSection = !isChild && itemId === activeParentId;
      var isExpanded = isChild && parentId === activeParentId && !manuallyCollapsed[parentId];

      item.classList.toggle("is-active", isActive);
      item.classList.toggle("is-active-section", isActiveSection);
      item.classList.toggle("is-expanded", isExpanded);
    });
  }

  function activeHeadingId() {
    var marker = window.innerHeight * 0.28;
    var scrollEl = document.scrollingElement || document.documentElement;
    var scrollBottom = scrollEl.scrollTop + window.innerHeight;
    var pageBottom = scrollEl.scrollHeight;

    if (scrollBottom >= pageBottom - 8) {
      return headings[headings.length - 1].id;
    }

    var active = null;
    headings.forEach(function (heading) {
      if (heading.getBoundingClientRect().top <= marker) {
        active = heading;
      }
    });

    return active ? active.id : null;
  }

  function updateActive() {
    var id = activeHeadingId();
    if (id) setActive(id);
  }

  function requestUpdate() {
    window.requestAnimationFrame(updateActive);
  }

  items.forEach(function (item) {
    if (item.hasAttribute("data-parent-id")) return;
    var link = item.querySelector("a");
    if (!link) return;

    link.addEventListener("click", function (e) {
      var id = item.getAttribute("data-heading-id");
      var isActiveSection = item.classList.contains("is-active-section") || item.classList.contains("is-active");
      if (!isActiveSection) return;

      e.preventDefault();
      if (manuallyCollapsed[id]) {
        delete manuallyCollapsed[id];
      } else {
        manuallyCollapsed[id] = true;
      }
      var currentId = activeHeadingId();
      if (currentId) setActive(currentId);
    });
  });

  toc.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return;
    var target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href);
  });

  if (window.location.hash) {
    setActive(window.location.hash.slice(1));
  } else {
    requestUpdate();
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("hashchange", requestUpdate);

  window._tocCleanup = function () {
    window.removeEventListener("scroll", requestUpdate);
    window.removeEventListener("resize", requestUpdate);
    window.removeEventListener("hashchange", requestUpdate);
    window._tocCleanup = null;
  };
})();
