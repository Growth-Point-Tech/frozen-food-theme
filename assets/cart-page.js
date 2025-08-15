document.addEventListener("DOMContentLoaded", function () {
  if (!document.querySelector(".cart-main-wrapper")) return;

  // Add Shopify.formatMoney if missing
  if (typeof Shopify === "undefined") {
    window.Shopify = {};
  }
  if (typeof Shopify.formatMoney !== "function") {
    Shopify.formatMoney = function (cents, format) {
      if (typeof cents == "string") {
        cents = cents.replace(".", "");
      }
      var value = "";
      var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      function formatWithDelimiters(number, precision, thousands, decimal) {
        thousands = thousands || ",";
        decimal = decimal || ".";
        if (isNaN(number) || number == null) {
          return 0;
        }
        number = (number / 100.0).toFixed(precision);
        var parts = number.split(".");
        var dollars = parts[0].replace(
          /(\d)(?=(\d{3})+(?!\d))/g,
          "$1" + thousands,
        );
        var cents = parts[1] ? decimal + parts[1] : "";
        return dollars + cents;
      }
      switch (format || this.money_format) {
        case "${{amount}}":
          value = formatWithDelimiters(cents, 2);
          break;
        case "${{amount_no_decimals}}":
          value = formatWithDelimiters(cents, 0);
          break;
        case "${{amount_with_comma_separator}}":
          value = formatWithDelimiters(cents, 2, ".", ",");
          break;
        default:
          value = formatWithDelimiters(cents, 2);
          break;
      }
      return format.replace(placeholderRegex, value);
    };
  }

  // Debounce map per item key
  const quantityUpdateTimers = {};

  // Utility to show/hide item loader by toggling 'hidden' class
  function setItemLoading(itemKey, isLoading) {
    const desktopLoader = document.getElementById(`item-loader-${itemKey.replace(/:/g, '-')}`);
    const mobileLoader = document.getElementById(`item-loader-mobile-${itemKey.replace(/:/g, '-')}`);
    if (desktopLoader) {
      desktopLoader.classList.toggle('hidden', !isLoading);
    }
    if (mobileLoader) {
      mobileLoader.classList.toggle('hidden', !isLoading);
    }
  }

  function fetchAndRenderCartSection() {
    return fetch(
      window.location.pathname + "?sections=cart-main&v=" + Date.now(),
    )
      .then((res) => res.json())
      .then((data) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = data["cart-main"];
        const newSection = tempDiv.querySelector(".cart-main-wrapper");
        document.querySelector(".cart-main-wrapper").replaceWith(newSection);
        attachCartPageListeners();
        initializeAgreementCheckbox();
        window.updateCartCount();
      });
  }

  function updateCartItem(key, newQty) {
    setItemLoading(key, true);
    fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: key, quantity: newQty }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.description || "Cart update failed");
          });
        }
        return res.json();
      })
      .then(() => fetchAndRenderCartSection())
      .catch((err) => {
        alert(err.message || "Error updating cart. Please try again.");
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
            updateCartItem(key, 0);
          });
        }
      });
  }

  // Initial attach
  attachCartPageListeners();

  // Agreement checkbox functionality
  function initializeAgreementCheckbox() {
    const agreementCheckbox = document.getElementById('cart-agreement-checkbox');
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    
    if (!agreementCheckbox || !checkoutBtn) return;
    
    function updateCheckoutButtonState() {
      if (agreementCheckbox.checked) {
        checkoutBtn.removeAttribute('disabled');
        checkoutBtn.classList.remove('disabled');
      } else {
        checkoutBtn.setAttribute('disabled', 'disabled');
        checkoutBtn.classList.add('disabled');
      }
    }
    
    // Set initial state
    updateCheckoutButtonState();
    
    // Add event listener
    agreementCheckbox.addEventListener('change', updateCheckoutButtonState);
    
    // Prevent checkout if checkbox is unchecked
    checkoutBtn.addEventListener('click', function(e) {
      if (!agreementCheckbox.checked) {
        e.preventDefault();
        e.stopPropagation();
        alert('Please agree to the Terms and Conditions and Privacy Policy before proceeding to checkout.');
        return false;
      }
    });
  }

  // Initialize agreement checkbox
  initializeAgreementCheckbox();
});
