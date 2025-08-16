const productVariationInit = (wrapperEle) => {
  if (!wrapperEle) return;

  const variantDataElement = wrapperEle.querySelector("#product-variants-data");

  const buyNowBtn = wrapperEle.querySelector("#cart-buy-now-btn");

  const bottomBuyNowBtn = wrapperEle.querySelector("#bottom-product-cart");

  const bottomVarintListWrapper = wrapperEle.querySelector(
    "#btm-product-variant",
  );

  if (!variantDataElement) {
    console.error("product-variants-data element not found");
    return;
  }

  const variantData = JSON.parse(variantDataElement.textContent);

  const selections = [];

  // Check if product has real variants (not just a single variant with 'Title' option)
  const hasRealVariants =
    variantData.length > 1 ||
    (variantData.length === 1 &&
      variantData[0].options &&
      variantData[0].options.some(
        (option) => option !== "Default Title" && option !== "Title",
      ));

  // Only run variant logic if product has real variants
  if (!hasRealVariants) {
    console.log("Product has no real variants, skipping variant logic");
    return;
  }

  // Auto-select first available variant
  const autoSelectFirstAvailableVariant = () => {
    // Find the first available variant
    const firstAvailableVariant = variantData.find(
      (variant) => variant.available,
    );

    if (firstAvailableVariant) {
      // Auto-select the options for the first available variant
      firstAvailableVariant.options.forEach((optionValue, optionIndex) => {
        selections[optionIndex] = optionValue;

        // Find and click the corresponding option element
        const optionWrapper = wrapperEle.querySelector(
          `.product-variation-content[data-option-index="${optionIndex}"]`,
        );

        if (optionWrapper) {
          const optionElement = optionWrapper.querySelector(
            `.variations-list[data-value="${optionValue}"]`,
          );

          if (optionElement) {
            // Remove active class from all options in this group
            optionWrapper
              .querySelectorAll(".variations-list")
              .forEach((item) => item.classList.remove("active"));

            // Add active class to the selected option
            optionElement.classList.add("active");
          }
        }
      });

      // Update the add to cart button
      const btn = wrapperEle.querySelector(
        ".product-add-to-cart-btn, .add-to-cart-btn",
      );
      if (btn) {
        btn.classList.remove("disabled");
        bottomBuyNowBtn?.classList.remove("disabled");
        buyNowBtn?.classList.remove("disabled");
        btn.dataset.variantId = firstAvailableVariant.id;
        btn.disabled = false;
      }
      if (bottomVarintListWrapper) {
        bottomVarintListWrapper.innerHTML = `${selections.join(", ")}`;
      }

      // Update the price for the auto-selected variant
      updateProductPrice(firstAvailableVariant);

      // Update max quantity for the selected variant
      updateMaxQuantityForVariant(firstAvailableVariant);
    } else {
      // No available variants - keep button disabled
      const btn = wrapperEle.querySelector("#add-to-cart-btn");
      if (btn) {
        btn.classList.add("disabled");
        bottomBuyNowBtn?.classList.add("disabled");
        buyNowBtn?.classList.add("disabled");
        btn.disabled = true;
      }
      console.log("No available variants found - auto-selection disabled");
    }
  };

  // Update product price based on selected variant
  const updateProductPrice = (variant) => {
    const priceWrapper = wrapperEle.querySelector(".product-price-wrapper");
    if (!priceWrapper) return;

    // Update the main price
    const priceElement = priceWrapper.querySelector(".product-price");
    if (priceElement) {
      priceElement.textContent = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(variant.price / 100); // Shopify prices are in cents
    }

    // Update compare at price (if exists)
    const comparePriceElement = priceWrapper.querySelector(".original-price");
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      if (comparePriceElement) {
        comparePriceElement.textContent = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(variant.compare_at_price / 100);
      } else {
        // Create compare price element if it doesn't exist
        const newComparePrice = document.createElement("s");
        newComparePrice.className = "original-price";
        newComparePrice.textContent = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(variant.compare_at_price / 100);
        priceWrapper.insertBefore(newComparePrice, priceElement);
      }
    } else {
      // Remove compare price if variant doesn't have one or it's not higher
      if (comparePriceElement) {
        comparePriceElement.remove();
      }
    }
  };

  // Update max quantity based on selected variant
  const updateMaxQuantityForVariant = (variant) => {
    const qtyWrapper = wrapperEle.querySelector(".add-to-cart-qty-wrapper");
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

    // Update the data-max attribute
    qtyWrapper.dataset.max = maxQty;

    // Update the quantity display if current quantity exceeds new max
    const qtyDisplay = qtyWrapper.querySelector(".quantity-input");
    const currentQty = parseInt(qtyDisplay.textContent) || 1;

    if (currentQty > maxQty && maxQty > 0) {
      qtyDisplay.textContent = maxQty;
    }

    // Update button states
    const minusBtn = qtyWrapper.querySelector(".qty-btn.minus");
    const plusBtn = qtyWrapper.querySelector(".qty-btn.plus");

    // if (minusBtn && plusBtn) {
    //   const min = parseInt(qtyWrapper.dataset.min) || 1;
    //   minusBtn.classList.toggle("disable", currentQty <= min);
    //   plusBtn.classList.toggle("disable", currentQty >= maxQty);
    // }
  };

  // Disable out-of-stock variant options
  const disableOutOfStockOptions = () => {
    // Get all option groups
    const optionGroups = wrapperEle.querySelectorAll(
      ".product-variation-content",
    );

    optionGroups.forEach((group, groupIndex) => {
      const options = group.querySelectorAll(".variations-list");

      options.forEach((option) => {
        const optionValue = option.dataset.value;

        // Check if this option value can be combined with other selected options to create an available variant
        const isOptionAvailable = variantData.some((variant) => {
          // First, check if this variant has the current option value at the right position
          if (variant.options[groupIndex] !== optionValue) {
            return false;
          }

          // Then check if this variant is available
          if (!variant.available) {
            return false;
          }

          // For multi-level variants, we need to check if this option value
          // can be combined with other selected options to create a valid variant
          // We'll check if there are any other selected options that would conflict
          const hasConflict = selections.some(
            (selectedValue, selectedIndex) => {
              // Skip if no selection at this index or if it's the current group
              if (selectedValue === null || selectedIndex === groupIndex) {
                return false;
              }
              // Check if the selected value conflicts with this variant
              return variant.options[selectedIndex] !== selectedValue;
            },
          );

          // If there's no conflict, this option value is available
          return !hasConflict;
        });

        if (!isOptionAvailable) {
          option.classList.add("disabled");
          option.style.pointerEvents = "none";
        } else {
          option.classList.remove("disabled");
          option.style.pointerEvents = "auto";
        }
      });
    });
  };

  // Call auto-selection function
  autoSelectFirstAvailableVariant();

  // Disable out-of-stock options
  disableOutOfStockOptions();

  // Add click listeners to each variation option
  const variationElements = wrapperEle.querySelectorAll(".variations-list");

  variationElements.forEach((el) => {
    el.addEventListener("click", () => {
      const wrapper = el.closest(".product-variation-content");
      const index = parseInt(wrapper.dataset.optionIndex, 10);
      const value = el.dataset.value;

      // Save selected value
      selections[index] = value;

      // Clear all selections after this one
      for (let i = index + 1; i < selections.length; i++) {
        selections[i] = null;

        const nextWrapper = wrapperEle.querySelector(
          `.product-variation-content[data-option-index="${i}"]`,
        );
        if (nextWrapper) {
          nextWrapper
            .querySelectorAll(".variations-list")
            .forEach((item) => item.classList.remove("active"));
        }
      }

      // Highlight current selection
      wrapper
        .querySelectorAll(".variations-list")
        .forEach((item) => item.classList.remove("active"));
      el.classList.add("active");

      // Re-run the disable function to update available options based on current selection
      disableOutOfStockOptions();

      // Check if a full match is found
      const btn = wrapperEle.querySelector("#add-to-cart-btn");
      if (selections.every(Boolean)) {
        const matched = variantData.find((variant) =>
          variant.options.every((opt, i) => opt === selections[i]),
        );

        if (matched) {
          btn.classList.remove("disabled");
          buyNowBtn?.classList.remove("disabled");
          bottomBuyNowBtn?.classList.remove("disabled");
          btn.dataset.variantId = matched.id;
          if (bottomBuyNowBtn?.dataset) {
            bottomBuyNowBtn.dataset.variantId = matched.id;
          }
          btn.disabled = false;
          updateProductPrice(matched); // Update price when a full match is found
          // Update max quantity for the selected variant
          updateMaxQuantityForVariant(matched);
        } else {
          btn.classList.add("disabled");
          buyNowBtn?.classList.add("disabled");
          bottomBuyNowBtn?.classList.add("disabled");
          btn.disabled = true;
        }
      } else {
        btn.classList.add("disabled");
        buyNowBtn?.classList.add("disabled");
        bottomBuyNowBtn?.classList.add("disabled");
        btn.disabled = true;
      }

      const sanitizeSelectionValue = selections.filter((x) => x !== null);

      if (bottomVarintListWrapper) {
        bottomVarintListWrapper.innerHTML = `${sanitizeSelectionValue.join(", ")}`;
      }
    });
  });
};
