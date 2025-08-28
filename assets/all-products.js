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

  // Function to get URL query parameters
  function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of urlParams.entries()) {
      if (params[key]) {
        // If parameter already exists, convert to array
        if (Array.isArray(params[key])) {
          params[key].push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
    }
    return params;
  }

  // Function to apply URL query parameters to filters
  function applyUrlParamsToFilters() {
    const urlParams = getUrlParams();

    // Debug: Log URL parameters

    // Handle the 'q' parameter for general search/filtering
    if (urlParams.q) {
      const queryValue = urlParams.q.toLowerCase();

      // Find and check checkboxes that match the query
      const checkboxes =
        allProductWrapper.querySelectorAll(".facet-list-value");
      checkboxes.forEach((checkbox) => {
        const checkboxValue = checkbox.value.toLowerCase();
        const checkboxName = checkbox.name.toLowerCase();

        // Check if the query matches the checkbox value, name, or any other relevant attribute
        if (
          checkboxValue.includes(queryValue) ||
          checkboxName.includes(queryValue) ||
          checkbox
            .closest(".facet")
            ?.querySelector(".facet-label")
            ?.textContent.toLowerCase()
            .includes(queryValue)
        ) {
          checkbox.checked = true;
        }
      });
    }

    // Handle other specific filter parameters if they exist
    Object.keys(urlParams).forEach((param) => {
      if (param !== "q" && param !== "min_price" && param !== "max_price") {
        // Handle multiple values for the same parameter (e.g., ?product_type=meat&product_type=vegetarian)
        const paramValues = urlParams.getAll
          ? urlParams.getAll(param)
          : [urlParams[param]];

        paramValues.forEach((paramValue) => {
          const paramValueLower = paramValue.toLowerCase();
          const checkboxes = allProductWrapper.querySelectorAll(
            `[name="${param}"]`,
          );

          checkboxes.forEach((checkbox) => {
            if (checkbox.value.toLowerCase() === paramValueLower) {
              checkbox.checked = true;
            }
          });
        });
      }
    });

    // Handle price parameters if they exist
    if (urlParams.min_price || urlParams.max_price) {
      const minInput = document.getElementById("price-min-value");
      const maxInput = document.getElementById("price-max-value");

      if (minInput && urlParams.min_price) {
        minInput.value = urlParams.min_price;
      }
      if (maxInput && urlParams.max_price) {
        maxInput.value = urlParams.max_price;
      }
    }
  }

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

    // Hide loader after filtering is complete
    hideLoader();
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

  // Function to update URL with current filter state
  function updateUrlWithFilters() {
    const activeFilters = getActiveFilters();
    const url = new URL(window.location);

    // Clear existing filter parameters
    url.searchParams.delete("q");
    url.searchParams.delete("min_price");
    url.searchParams.delete("max_price");

    // Add active filters to URL
    // if (activeFilters.price) {
    //   if (activeFilters.price.min > minPrice) {
    //     url.searchParams.set("min_price", activeFilters.price.min.toString());
    //   }
    //   if (activeFilters.price.max < maxPrice) {
    //     url.searchParams.set("max_price", activeFilters.price.max.toString());
    //   }
    // }

    // Add list filters to URL - handle multiple values properly
    // Object.entries(activeFilters.list).forEach(([filterName, values]) => {
    //   if (values.length > 0) {
    //     // Clear any existing values for this filter
    //     url.searchParams.delete(filterName);

    //     // Add each selected value
    //     values.forEach((value) => {
    //       url.searchParams.append(filterName, value);
    //     });
    //   }
    // });

    // Update URL without reloading the page
    // for now its commneted
    window.history.replaceState({}, "", url);
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
    const productCount = document.querySelector("#all-product-count");
    if (productCount) {
      productCount.textContent = `${filteredProducts.length}`;
    }

    // Update URL with current filter state
    updateUrlWithFilters();
  }

  // Show loader function
  function showLoader() {
    const loader = allProductWrapper.querySelector(".filter-loader");
    if (loader) {
      loader.style.display = "flex";
    }
  }

  // Hide loader function
  function hideLoader() {
    const loader = allProductWrapper.querySelector(".filter-loader");
    if (loader) {
      loader.style.display = "none";
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
    checkbox.addEventListener("change", (e) => {
      // Clear URL when filter changes
      const url = new URL(window.location);
      url.search = "";
      window.history.replaceState({}, "", url);

      // Show loader
      showLoader();

      // Apply the filter
      debouncedFilter(e);
    });
  });

  // Price slider setup function - will be called after products are initialized
  function setupPriceSlider() {
    const slider = document.getElementById("price-slider");
    const minInput = document.getElementById("price-min-value");
    const maxInput = document.getElementById("price-max-value");
    const minDisplay = document.getElementById("price-min-display");
    const maxDisplay = document.getElementById("price-max-display");

    if (slider && typeof noUiSlider !== "undefined") {
      // Get URL price parameters if they exist
      const urlParams = getUrlParams();
      const startMin = urlParams.min_price
        ? parseInt(urlParams.min_price)
        : minPrice;
      const startMax = urlParams.max_price
        ? parseInt(urlParams.max_price)
        : maxPrice;

      noUiSlider.create(slider, {
        start: [startMin, startMax],
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

      // Update display elements with URL parameter values if they exist
      const sliderUrlParams = getUrlParams();
      if (sliderUrlParams.min_price || sliderUrlParams.max_price) {
        if (sliderUrlParams.min_price) {
          minDisplay.textContent = sliderUrlParams.min_price;
          minInput.value = sliderUrlParams.min_price;
        }
        if (sliderUrlParams.max_price) {
          maxDisplay.textContent = sliderUrlParams.max_price;
          maxInput.value = sliderUrlParams.max_price;
        }
      }

      // Add filtering on price slider change
      slider.noUiSlider.on("change", debouncedFilter);
    }
  }

  // Clear all filters functionality
  function clearAllFilters() {
    // Uncheck all checkboxes
    const checkboxes = allProductWrapper.querySelectorAll(".facet-list-value");
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    // Reset price slider
    const slider = document.getElementById("price-slider");
    if (slider && slider.noUiSlider) {
      slider.noUiSlider.set([minPrice, maxPrice]);
    }

    // Reset products
    filteredProducts = [...originalProducts];

    // Clear URL parameters
    const url = new URL(window.location);
    url.search = "";
    window.history.replaceState({}, "", url);

    updateProductDisplay();
  }

  // Add clear filters button if it doesn't exist
  function addClearFiltersButton() {
    const existingButton =
      allProductWrapper.querySelector(".clear-filters-btn");
    if (!existingButton && facetWrapper) {
      const clearButton = document.createElement("button");
      clearButton.className =
        "clear-filters-btn btn btn-red btn-contained btn-md";
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
  setupPriceSlider(); // Setup price slider with actual product price range
  applyUrlParamsToFilters(); // Apply URL parameters on load

  // Initial filter application (in case there are pre-selected filters from URL)
  setTimeout(() => {
    filterProducts();
  }, 100);
});
