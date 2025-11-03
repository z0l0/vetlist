// Hero header collapse/expand functionality
document.addEventListener("DOMContentLoaded", function () {
  const heroHeaderContainer = document.getElementById("hero-header-container");
  const heroHeader = document.getElementById("hero-header");
  const heroHeaderMini = document.getElementById("hero-header-mini");
  const expandBtn = document.getElementById("header-expand-btn");

  let isCollapsed = false;
  let autoCollapseTimeout;
  let userHasExpanded = false;

  // Auto-collapse after 3 seconds (only if user hasn't manually expanded)
  function startAutoCollapse() {
    autoCollapseTimeout = setTimeout(function () {
      if (!isCollapsed && !userHasExpanded) {
        collapseHeader();
      }
    }, 3000);
  }

  // Cancel auto-collapse
  function cancelAutoCollapse() {
    if (autoCollapseTimeout) {
      clearTimeout(autoCollapseTimeout);
    }
  }

  // Collapse header
  function collapseHeader() {
    if (isCollapsed || !heroHeader || !heroHeaderMini || !heroHeaderContainer)
      return;

    isCollapsed = true;

    // Get current height and set it explicitly for smooth transition
    const currentHeight = heroHeaderContainer.offsetHeight;
    heroHeaderContainer.style.height = currentHeight + "px";

    // Animate out main header
    heroHeader.style.opacity = "0";
    heroHeader.style.transform = "translateY(-10px) scale(0.98)";
    heroHeader.style.pointerEvents = "none";

    // Animate in mini header and collapse container height
    setTimeout(function () {
      if (heroHeaderMini && heroHeaderContainer) {
        // Position mini header between the collapsed header space and the content
        const heroSection = heroHeaderContainer.closest("section");
        if (heroSection) {
          const rect = heroSection.getBoundingClientRect();
          heroHeaderMini.style.top = rect.top + window.scrollY + 10 + "px";
        }

        heroHeaderMini.style.opacity = "1";
        heroHeaderMini.style.transform = "scale(1)";
        heroHeaderMini.style.pointerEvents = "auto";

        // Collapse to mini header height and move content up more
        heroHeaderContainer.style.height = "0px";
        heroHeaderContainer.style.marginBottom = "0rem";

        // Move content up to fill the collapsed space (for homepage)
        const heroContent = document.getElementById("hero-content");
        if (heroContent) {
          heroContent.style.transform = "translateY(-80px)";
        }
      }
    }, 250);
  }

  // Expand header
  function expandHeader() {
    if (!isCollapsed || !heroHeader || !heroHeaderMini || !heroHeaderContainer)
      return;

    isCollapsed = false;
    userHasExpanded = true; // Mark that user has manually expanded

    // Animate out mini header
    heroHeaderMini.style.opacity = "0";
    heroHeaderMini.style.transform = "scale(0.9)";
    heroHeaderMini.style.pointerEvents = "none";

    // Restore container height and margin
    heroHeaderContainer.style.height = "auto";
    heroHeaderContainer.style.marginBottom = heroHeaderContainer.dataset.originalMargin || "1.125rem";

    // Move content back to normal position (for homepage)
    const heroContent = document.getElementById("hero-content");
    if (heroContent) {
      heroContent.style.transform = "translateY(0)";
    }

    // Animate in main header
    setTimeout(function () {
      if (heroHeader) {
        heroHeader.style.opacity = "1";
        heroHeader.style.transform = "translateY(0) scale(1)";
        heroHeader.style.pointerEvents = "auto";
      }
    }, 250);

    // Don't restart auto-collapse timer since user manually expanded
  }

  // Event listeners
  if (expandBtn) {
    expandBtn.addEventListener("click", expandHeader);
  }

  // Cancel auto-collapse on user interaction with header container
  if (heroHeaderContainer) {
    heroHeaderContainer.addEventListener("mouseenter", cancelAutoCollapse);
    heroHeaderContainer.addEventListener("mouseleave", function () {
      // Only restart timer if user hasn't manually expanded
      if (!userHasExpanded) {
        autoCollapseTimeout = setTimeout(function () {
          if (!isCollapsed) {
            collapseHeader();
          }
        }, 2000);
      }
    });
  }

  // Reposition mini header on scroll when collapsed
  function repositionMiniHeader() {
    if (isCollapsed && heroHeaderMini && heroHeaderContainer) {
      const heroSection = heroHeaderContainer.closest("section");
      if (heroSection) {
        const rect = heroSection.getBoundingClientRect();

        // Hide the mini header if we've scrolled past the hero header area
        if (rect.top < -200 || rect.bottom < 0) {
          heroHeaderMini.style.opacity = "0";
          heroHeaderMini.style.pointerEvents = "none";
        } else {
          heroHeaderMini.style.opacity = "1";
          heroHeaderMini.style.pointerEvents = "auto";
          heroHeaderMini.style.top =
            Math.max(10, rect.top + window.scrollY + 10) + "px";
        }
      }
    }
  }

  window.addEventListener("scroll", repositionMiniHeader);
  window.addEventListener("resize", repositionMiniHeader);

  // Store original margin for location pages
  if (heroHeaderContainer) {
    heroHeaderContainer.dataset.originalMargin = window.getComputedStyle(heroHeaderContainer).marginBottom;
  }

  // Start auto-collapse timer
  startAutoCollapse();
});