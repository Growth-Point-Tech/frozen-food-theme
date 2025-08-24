function isFooterInView() {
  const footer = document.getElementById("footer");
  if (!footer) return false;

  const rect = footer.getBoundingClientRect();
  return (
    rect.top < window.innerHeight && // top edge is above bottom of viewport
    rect.bottom >= 0 // bottom edge is below top of viewport
  );
}

const addToCart = (addToCartBtn, productDetails) => {
  const variantId = addToCartBtn.dataset.variantId;

  if (!variantId) {
    alert("Please select a product variant.");
    return;
  }

  // Add loading state (optional)
  addToCartBtn.classList.add("loading");

  // Get quantity from the quantity input
  const quantity =
    parseInt(productDetails.querySelector(".quantity-input")?.textContent) || 1;

  // Get the selling plan (if any)
  const sellingPlanInput = document.querySelector('input[name="selling_plan"]');
  const sellingPlan = sellingPlanInput?.value;

  const payload = {
    id: variantId,
    quantity,
  };

  // Include selling_plan only if selected
  if (sellingPlan) {
    payload.selling_plan = sellingPlan;
  }

  fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (res) => await window.handleFetchResponse(res))
    .then((res) => {
      window.updateCartCount();
      window.showToast(`${res.title} has been added in your cart`);
    })
    .catch((err) => {
      console.error(err);
      window.showToast(err.message, "error");
    })
    .finally(() => {
      addToCartBtn.classList.remove("loading");
    });
};

document.addEventListener("DOMContentLoaded", () => {
  const productDetails = document.getElementById("product-details");

  if (!productDetails) return;

  const stickyBottomSection = productDetails.querySelector(
    "#product-sticky-bottom",
  );
  const productDetailSection = productDetails.querySelector(
    ".product-details-wrapper",
  );

  productVariationInit(productDetails);

  // Quantity functionality
  const initializeQuantityHandlers = () => {
    const qtyWrapper = productDetails.querySelector(".add-to-cart-qty-wrapper");
    if (!qtyWrapper) return;

    const qtyDisplay = qtyWrapper.querySelector(".quantity-input");
    const minusBtn = qtyWrapper.querySelector(".qty-btn.minus");
    const plusBtn = qtyWrapper.querySelector(".qty-btn.plus");

    if (!qtyDisplay || !minusBtn || !plusBtn) return;

    const updateQuantity = (newQty) => {
      const min = parseInt(qtyWrapper.dataset.min) || 1;
      const max = parseInt(qtyWrapper.dataset.max) || 9999;

      // Ensure quantity is within bounds
      newQty = Math.max(min, Math.min(max, newQty));

      qtyDisplay.textContent = newQty;

      // Update button states
      minusBtn.classList.toggle("disable", newQty <= min);
      plusBtn.classList.toggle("disable", newQty >= max);
    };

    // Initialize quantity
    const initialQty = parseInt(qtyDisplay.textContent) || 1;
    updateQuantity(initialQty);

    // Minus button click
    minusBtn.addEventListener("click", () => {
      const currentQty = parseInt(qtyDisplay.textContent) || 1;
      const min = parseInt(qtyWrapper.dataset.min) || 1;

      if (currentQty > min) {
        updateQuantity(currentQty - 1);
      }
    });

    // Plus button click
    plusBtn.addEventListener("click", () => {
      const currentQty = parseInt(qtyDisplay.textContent) || 1;
      const max = parseInt(qtyWrapper.dataset.max) || 9999;

      if (currentQty < max) {
        updateQuantity(currentQty + 1);
      } else {
        console.log("You've reached the maximum stock available.");
      }
    });
  };

  // Update max quantity based on selected variant
  const updateMaxQuantity = (variant) => {
    const qtyWrapper = productDetails.querySelector(".add-to-cart-qty-wrapper");
    if (!qtyWrapper) return;

    let maxQty = 9999; // Default max

    if (variant) {
      // Check if inventory is managed
      if (variant.inventory_management === "shopify") {
        maxQty = variant.inventory_quantity || 0;
      }

      // If variant is not available, set max to 0
      if (!variant.available) {
        maxQty = 0;
      }
    }

    console.log(
      "Setting max quantity to:",
      maxQty,
      "for variant:",
      variant?.id,
    );

    // Update the data-max attribute
    qtyWrapper.dataset.max = maxQty;

    const availabilityStatus = productDetails.querySelector(
      ".availability-status",
    );
    if (variant && availabilityStatus) {
      if (variant.available) {
        availabilityStatus.textContent = "In Stock";
        availabilityStatus.classList.remove("out-of-stock");
        availabilityStatus.classList.add("in-stock");
      } else {
        availabilityStatus.textContent = "Out of Stock";
        availabilityStatus.classList.remove("in-stock");
        availabilityStatus.classList.add("out-of-stock");
      }
    }

    // Update the quantity display if current quantity exceeds new max
    const qtyDisplay = qtyWrapper.querySelector(".quantity-input");
    const currentQty = parseInt(qtyDisplay.textContent) || 1;

    if (currentQty > maxQty && maxQty > 0) {
      qtyDisplay.textContent = maxQty;
    }

    // Update button states
    const minusBtn = qtyWrapper.querySelector(".qty-btn.minus");
    const plusBtn = qtyWrapper.querySelector(".qty-btn.plus");

    if (minusBtn && plusBtn) {
      const min = parseInt(qtyWrapper.dataset.min) || 1;
      const shouldDisableMinus = currentQty <= min;
      const shouldDisablePlus = currentQty >= maxQty;

      // minusBtn.classList.toggle("disable", shouldDisableMinus);
      // plusBtn.classList.toggle("disable", shouldDisablePlus);
    }
  };

  // Initialize quantity handlers
  initializeQuantityHandlers();

  // Update max quantity for initial variant - use first available variant if possible
  const variantData = JSON.parse(
    document.getElementById("product-variants-data").textContent,
  );

  // Find first available variant for initial setup
  const firstAvailableVariant =
    variantData.find((variant) => variant.available) || variantData[0];

  updateMaxQuantity(firstAvailableVariant);

  const addToCartBtn = productDetails.querySelector(".product-add-to-cart-btn");
  const isDisabled = addToCartBtn.classList.contains("disabled");
  const btnAddToCartBtn = productDetails.querySelector("#bottom-product-cart");

  if (addToCartBtn && !isDisabled) {
    addToCartBtn.addEventListener("click", () => {
      addToCart(addToCartBtn, productDetails);
    });
    btnAddToCartBtn.addEventListener("click", () => {
      addToCart(btnAddToCartBtn, productDetails);
    });
  }

  // Event listener for when a selling plan is changed in any widget
  document.addEventListener("sealsubs:selling_plan_changed", function (e) {
    const { selling_plan_id, element } = e.detail;

    const select = element.querySelector('select[name="subs_interval"]');

    const selectedOption = Array.from(select.options).find(
      (option) => option.value === selling_plan_id,
    );

    const bottomVariantWrapper = productDetails.querySelector(
      "#btm-product-subscription",
    );

    console.log(bottomVariantWrapper, "@@@");

    if (selectedOption && bottomVariantWrapper) {
      const selectedLabel = selectedOption.textContent.trim();
      bottomVariantWrapper.innerText = `With ${selectedLabel} subscription`;
    } else {
      bottomVariantWrapper.innerText = "";
    }
  });

  const readMoreText = productDetails.querySelector("#product-read-more");

  readMoreText.addEventListener("click", () => {
    const section = document.querySelector("#product-description");
    const headerOffset = 100; // adjust this based on your header height
    const elementPosition = section.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  });

  const productStickyBottomInit = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const productDetailHeight = productDetailSection.offsetHeight;

    const showShowStickyBtn =
      scrollTop > productDetailHeight && !isFooterInView();

    if (showShowStickyBtn) {
      stickyBottomSection.classList.add("active");
    } else {
      stickyBottomSection.classList.remove("active");
    }
  };

  window.addEventListener("scroll", productStickyBottomInit, { passive: true });

  const swiperImageInit = () => {
    const ImageSwiper = productDetails.querySelector("#product-image-wrapper");
    const swiperPagination = ImageSwiper.querySelector(
      ".product-gallery-swiper-pagination",
    );

    if (!ImageSwiper) return;

    const forceSlider = document.documentElement.clientWidth <= 1023;

    // Only initialize Swiper on mobile
    if (forceSlider) {
      swiperPagination.style.display = "flex";
      // Check if Swiper is already initialized
      if (ImageSwiper.swiper) {
        return; // Already initialized
      }

      new Swiper(ImageSwiper, {
        loop: true,
        autoplay: {
          delay: 10000,
          disableOnInteraction: true,
        },
        slidesPerView: 1,
        spaceBetween: 0,
        effect: "slide", // Or "fade"
        pagination: {
          el: ".product-gallery-swiper-pagination",
          clickable: true,
        },
      });

      console.log("Product image Swiper initialized for mobile");
    } else {
      swiperPagination.style.display = "none";
      ImageSwiper?.swiper?.destroy(true, true);
    }
  };

  swiperImageInit();

  // Handle resize events
  window.addEventListener("resize", swiperImageInit);
});
