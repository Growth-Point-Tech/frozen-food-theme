const disableButtons = (loader) => {
  const mainWrapper = document.querySelector(".cart-main-wrapper");
  if (!mainWrapper) return;
  const proceedCheckoutBtn = mainWrapper.querySelector("#cart-checkout-btn");
  proceedCheckoutBtn.classList.toggle("disabled", loader);

  const itemRemoveBtn = mainWrapper.querySelectorAll("#cart-item-remove-btn");
  if (itemRemoveBtn.length) {
    itemRemoveBtn.forEach((ele) => {
      ele.classList.toggle("disabled", loader);
    });
  }
  const qtyHandler = mainWrapper.querySelectorAll(".cart-page-qty-wrapper");
  if (qtyHandler.length) {
    qtyHandler.forEach((ele) => {
      ele.classList.toggle("disabled", loader);
    });
  }
};

document.addEventListener("DOMContentLoaded", function () {
  const cartPageWrapper = document.querySelector(".cart-main-wrapper");

  if (!cartPageWrapper) return;

  // Debounce map per item key
  const quantityUpdateTimers = {};

  // Utility to show/hide item loader by toggling 'hidden' class
  function setItemLoading(itemKey, isLoading) {
    const desktopLoader = document.getElementById(
      `item-loader-${itemKey.replace(/:/g, "-")}`,
    );
    const mobileLoader = document.getElementById(
      `item-loader-mobile-${itemKey.replace(/:/g, "-")}`,
    );
    if (desktopLoader) {
      desktopLoader.classList.toggle("hidden", !isLoading);
    }
    if (mobileLoader) {
      mobileLoader.classList.toggle("hidden", !isLoading);
    }
  }

  async function fetchAndRenderCartSection() {
    return await fetch(
      window.location.pathname + "?sections=cart-main&v=" + Date.now(),
    )
      .then((res) => res.json())
      .then((data) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = data["cart-main"];
        const newSection = tempDiv.querySelector(".cart-main-wrapper");
        document.querySelector(".cart-main-wrapper").replaceWith(newSection);
        attachCartPageListeners();
        window.updateCartCount();
      })
      .finally(() => {
        disableButtons(false);
      });
  }

  function updateCartItem(key, newQty) {
    setItemLoading(key, true);
    disableButtons(true);
    fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: key, quantity: newQty }),
    })
      .then(async (res) => await window.handleFetchResponse(res))
      .then(async () => await fetchAndRenderCartSection())
      .catch((err) => {
        window.showToast(err.message || "error");
        fetchAndRenderCartSection(); // Try to re-sync the DOM anyway
      })
      .finally(() => setItemLoading(key, false));
  }

  function attachCartPageListeners() {
    document
      .querySelectorAll(".cart-item, .cart-item-card")
      .forEach(function (itemElem) {
        const key = itemElem.dataset.key;
        const qtyInput = itemElem.querySelector(".quantity-input");
        const minusBtn = itemElem.querySelector(".qty-btn.minus");
        const plusBtn = itemElem.querySelector(".qty-btn.plus");
        const removeBtn = itemElem.querySelector(".cart-remove-btn");

        if (minusBtn) {
          minusBtn.addEventListener("click", function () {
            let qty = parseInt(qtyInput.textContent, 10);
            if (qty > 1) {
              qty--;
              qtyInput.textContent = qty;
              if (quantityUpdateTimers[key])
                clearTimeout(quantityUpdateTimers[key]);
              quantityUpdateTimers[key] = setTimeout(
                () => updateCartItem(key, qty),
                400,
              );
            }
          });
        }
        if (plusBtn) {
          plusBtn.addEventListener("click", function () {
            let qty = parseInt(qtyInput.textContent, 10);
            qty++;
            qtyInput.textContent = qty;
            if (quantityUpdateTimers[key])
              clearTimeout(quantityUpdateTimers[key]);
            quantityUpdateTimers[key] = setTimeout(
              () => updateCartItem(key, qty),
              400,
            );
          });
        }
        // Note: quantity-input is now a div, not an input field
        // Quantity changes are handled by the +/- buttons
        if (removeBtn) {
          removeBtn.addEventListener("click", function () {
            if (removeBtn.classList.contains("disabled")) {
              return;
            }
            updateCartItem(key, 0);
          });
        }
      });
  }

  // Initial attach
  attachCartPageListeners();
});
