document.addEventListener("DOMContentLoaded", () => {
  const allProductWrapper = document.getElementById("all-product");

  if (!allProductWrapper) return;

  const filterTitle = allProductWrapper.querySelector("#filter-title");
  const facetWrapper = allProductWrapper.querySelector("#facet-wrapper");
  const productsContainer = allProductWrapper.querySelector(
    ".all-products-list-wrapper",
  );

  // Store original products for filtering
  let originalProducts = [];
  let filteredProducts = [];
  let minPrice = 0;
  let maxPrice = 1000; // Default max, will be updated

  // Initialize original products array
  function initializeProducts() {
    const productCards = productsContainer.querySelectorAll(".product-card");
    originalProducts = Array.from(productCards).map((card) => {
      const productData = {
        element: card, //Use direct reference for performance
        price: parseFloat(
          card.dataset.price ||
            card.querySelector(".price")?.textContent.replace(/[^0-9.]/g, "") ||
            0,
        ),
        tags: (card.dataset.tags || "")
          .split(",")
          .map((tag) => tag.trim().toLowerCase()),
        vendor: (card.dataset.vendor || "").toLowerCase(),
        productType: (card.dataset.productType || "").toLowerCase(),
        title: (
          card.dataset.title ||
          card.querySelector(".product-title")?.textContent ||
          ""
        ).toLowerCase(),
        available: ["true", "instock", "in_stock", "available"].includes(
          (card.dataset.available || "").toLowerCase(),
        ),
      };

      return productData;
    });
    if (originalProducts.length > 0) {
      const prices = originalProducts.map((p) => p.price);
      minPrice = Math.floor(Math.min(...prices));
      maxPrice = Math.ceil(Math.max(...prices));
    }
    filteredProducts = [...originalProducts];
  }

  // Centralized filter strategies for cleaner, more maintainable logic
  const filterStrategies = {
    product_type: (product, value) => product.productType === value,
    vendor: (product, value) => product.vendor === value,
    tag: (product, value) => product.tags.includes(value),
    availability: (product, value) => {
      const isAvailable = product.available;
      if (["1", "true", "available", "in stock", "in_stock"].includes(value)) {
        return isAvailable;
      }
      if (["0", "false", "sold out", "out of stock"].includes(value)) {
        return !isAvailable;
      }
      return false; // Unrecognized availability value
    },
  };
  // Handle Shopify's specific availability filter name
  filterStrategies["filter.v.availability"] = filterStrategies.availability;

  // The broad/default matcher reuses specific strategies for a wider search
  filterStrategies.default = (product, value) =>
    filterStrategies.tag(product, value) ||
    filterStrategies.product_type(product, value) ||
    filterStrategies.vendor(product, value) ||
    product.title.includes(value);

  // Define an order of precedence for matching filter types to handle complex names
  const strategyPrecedence = [
    "filter.v.availability",
    "availability",
    "product_type",
    "vendor",
    "tag",
  ];
  // Filter products based on current selections
  function filterProducts() {
    const activeFilters = getActiveFilters();

    filteredProducts = originalProducts.filter((product) => {
      // Price filter
      if (
        activeFilters.price &&
        (product.price < activeFilters.price.min ||
          product.price > activeFilters.price.max)
      ) {
        return false;
      }

      // List filters (tags, vendor, product type, etc.)
      for (const [filterType, values] of Object.entries(activeFilters.list)) {
        if (values.length > 0) {
          // Find the correct filtering strategy based on the filter's name
          const strategyKey =
            strategyPrecedence.find((key) => filterType.includes(key)) ||
            "default";
          const strategy = filterStrategies[strategyKey];

          // Check if the product matches any of the selected values for this filter
          const matches = values.some((filterValue) => {
            return strategy(product, filterValue.toLowerCase());
          });
          if (!matches) return false;
        }
      }

      return true;
    });

    updateProductDisplay();
  }

  // Get currently active filters
  function getActiveFilters() {
    const filters = {
      price: null,
      list: {},
    };

    // Price range filter
    const minInput = document.getElementById("price-min-value");
    const maxInput = document.getElementById("price-max-value");
    if (minInput && maxInput) {
      filters.price = {
        min: parseInt(minInput.value) || 0,
        max: parseInt(maxInput.value) || maxPrice,
      };
    }

    // List filters (checkboxes)
    const checkboxes = allProductWrapper.querySelectorAll(
      ".facet-list-value:checked",
    );
    checkboxes.forEach((checkbox) => {
      const filterName = checkbox.name.trim().toLowerCase();
      const filterValue = String(checkbox.value).trim().toLowerCase();

      if (!filters.list[filterName]) {
        filters.list[filterName] = [];
      }
      filters.list[filterName].push(filterValue);
    });

    return filters;
  }

  // Update product display
  function updateProductDisplay() {
    const filteredElements = new Set(filteredProducts.map((p) => p.element));
    let hasVisibleProducts = false;

    // Toggle visibility of products
    originalProducts.forEach((product) => {
      if (filteredElements.has(product.element)) {
        product.element.style.display = "";
        hasVisibleProducts = true;
      } else {
        product.element.style.display = "none";
      }
    });

    // Handle the 'no products' message
    let noProductsMessage = productsContainer.querySelector(
      ".no-products-message",
    );
    if (filteredProducts.length === 0) {
      if (!noProductsMessage) {
        noProductsMessage = document.createElement("div");
        noProductsMessage.className = "no-products-message";
        noProductsMessage.innerHTML =
          "<p>No products found matching your filters.</p>";
        productsContainer.prepend(noProductsMessage);
      }
      noProductsMessage.style.display = "block";
    } else if (noProductsMessage) {
      noProductsMessage.style.display = "none";
    }

    // Update product count if there's a counter element
    const productCount = document.querySelector(".product-count");
    if (productCount) {
      productCount.textContent = `${filteredProducts.length} products`;
    }
  }

  // Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const debouncedFilter = debounce(filterProducts, 300);

  // Filter toggle functionality
  filterTitle.addEventListener("click", () => {
    filterTitle.classList.toggle("active");
    facetWrapper.classList.toggle("active");
  });

  // Facet expand/collapse functionality
  const facetList = allProductWrapper.querySelectorAll(".facet");
  facetList.forEach((ele) => {
    const facetId = ele.querySelector(".facet-identifier");
    if (facetId) {
      facetId.addEventListener("click", () => {
        ele.classList.toggle("active");
      });
    }
  });

  // Add event listeners to filter checkboxes
  const filterCheckboxes =
    allProductWrapper.querySelectorAll(".facet-list-value");
  filterCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", debouncedFilter);
  });

  // Price slider setup
  const slider = document.getElementById("price-slider");
  const minInput = document.getElementById("price-min-value");
  const maxInput = document.getElementById("price-max-value");
  const minDisplay = document.getElementById("price-min-display");
  const maxDisplay = document.getElementById("price-max-display");

  if (slider && typeof noUiSlider !== "undefined") {
    noUiSlider.create(slider, {
      start: [parseInt(minInput.value), parseInt(maxInput.value)],
      connect: true,
      step: 1,
      range: {
        min: minPrice,
        max: maxPrice,
      },
    });

    slider.noUiSlider.on("update", function (values) {
      minDisplay.textContent = Math.round(values[0]);
      maxDisplay.textContent = Math.round(values[1]);
      minInput.value = Math.round(values[0]);
      maxInput.value = Math.round(values[1]);
    });

    // Add filtering on price slider change
    slider.noUiSlider.on("change", debouncedFilter);
  }

  // Clear all filters functionality
  function clearAllFilters() {
    // Uncheck all checkboxes
    const checkboxes = allProductWrapper.querySelectorAll(".facet-list-value");
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    // Reset price slider
    if (slider && slider.noUiSlider) {
      slider.noUiSlider.set([minPrice, maxPrice]);
    }

    // Reset products
    filteredProducts = [...originalProducts];
    updateProductDisplay();
  }

  // Add clear filters button if it doesn't exist
  function addClearFiltersButton() {
    const existingButton =
      allProductWrapper.querySelector(".clear-filters-btn");
    if (!existingButton && facetWrapper) {
      const clearButton = document.createElement("button");
      clearButton.className = "clear-filters-btn";
      clearButton.textContent = "Clear All Filters";
      clearButton.addEventListener("click", clearAllFilters);

      const facetInnerWrapper = facetWrapper.querySelector(
        ".facet-inner-wrapper",
      );
      if (facetInnerWrapper) {
        facetInnerWrapper.appendChild(clearButton);
      }
    }
  }

  // Initialize everything
  initializeProducts();
  addClearFiltersButton();

  // Initial filter application (in case there are pre-selected filters from URL)
  setTimeout(() => {
    filterProducts();
  }, 100);
});
