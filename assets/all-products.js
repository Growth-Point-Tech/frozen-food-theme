document.addEventListener("DOMContentLoaded", () => {
  const allProductWrapper = document.getElementById("all-product");

  if (!allProductWrapper) return;

  const filterTitle = allProductWrapper.querySelector("#filter-title");
  const facetWrapper = allProductWrapper.querySelector("#facet-wrapper");
  filterTitle.addEventListener("click", () => {
    filterTitle.classList.toggle("active");
    facetWrapper.classList.toggle("active");
  });

  const facetList = allProductWrapper.querySelectorAll(".facet");

  facetList.forEach((ele) => {
    const facetId = ele.querySelector(".facet-identifier"); // use class
    if (facetId) {
      facetId.addEventListener("click", () => {
        ele.classList.toggle("active"); // removed dangling comma
      });
    }
  });

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
        min: 0,
        max: 1000,
      },
    });

    slider.noUiSlider.on("update", function (values) {
      minDisplay.textContent = Math.round(values[0]);
      maxDisplay.textContent = Math.round(values[1]);
      minInput.value = Math.round(values[0]);
      maxInput.value = Math.round(values[1]);
    });
  }
});
