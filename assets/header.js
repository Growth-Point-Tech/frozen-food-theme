document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("header");
  const promoBanner = document.getElementById("promotional-banner");
  const extraHeight = document.getElementById("extra-header-height");
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu-drawer");

  // To open the sub menu
  document
    .querySelectorAll(".sub-navigation-wrapper")
    .forEach((subMenuWrapper) => {
      const submenu = subMenuWrapper.querySelector(".sub-menu-wrapper");

      subMenuWrapper.addEventListener("mouseenter", () => {
        submenu.style.visibility = "visible";
        submenu.style.height = submenu.scrollHeight + "px";
      });

      subMenuWrapper.addEventListener("mouseleave", () => {
        submenu.style.height = "0";
      });
    });

  const updateStickyHeader = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const bannerHeight = promoBanner ? promoBanner.offsetHeight : 0;

    if (scrollTop > bannerHeight) {
      header.classList.add("sticky");
      extraHeight.classList.add("extra-header-height");
    } else {
      header.classList.remove("sticky");
      extraHeight.classList.remove("extra-header-height");
    }
  };

  // Use passive scroll listener for better mobile performance
  window.addEventListener("scroll", updateStickyHeader, { passive: true });

  const closeMobileMenu = () => {
    window.whenDrawerClose();
    hamburger.classList.remove("active");
    header.classList.remove("mobile-navigation-menu");
    mobileMenu.classList.remove("active");
  };

  hamburger.addEventListener("click", function () {
    const mobileMenu = document.getElementById("mobile-menu-drawer");
    const headerWrapper = document.getElementById("header");

    const isMenuActive = hamburger.classList.contains("active");
    const isStickyInHeader = headerWrapper.classList.contains("sticky");

    if (!isMenuActive) {
      hamburger.classList.add("active");
      mobileMenu.classList.add("active");
      window.whenDrawerOpen();

      const headerHeight = headerWrapper.offsetHeight;

      if (isStickyInHeader) {
        mobileMenu.style.top = headerHeight;
      } else {
        const promotionalBannerHeight =
          document.getElementById("promotional-banner");
        if (!promotionalBannerHeight) {
          mobileMenu.style.top = headerHeight;
          return;
        }

        const totalHeight = headerHeight + promotionalBannerHeight.offsetHeight;
        mobileMenu.style.top = totalHeight - 0.5;
      }
    } else {
      closeMobileMenu();
    }
  });

  // Listen for any <a> inside the drawer
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileMenu();
    });
  });
});
