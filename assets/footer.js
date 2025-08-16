function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

document.addEventListener("DOMContentLoaded", () => {
  const footer = document.getElementById("footer");

  if (!footer) return;

  footer
    .querySelectorAll(".footer-navigation-link-wrapper")
    .forEach((wrapper) => {
      const title = wrapper.querySelector(".footer-title-wrapper");
      const content = wrapper.querySelector(".footer-link-content");

      title.addEventListener("click", () => {
        content.classList.toggle("active");
        title.classList.toggle("active");
      });
    });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          footer.classList.add("dark-bg");
        } else {
          footer.classList.remove("dark-bg");
        }
      });
    },
    {
      root: null, // viewport
      rootMargin: "0px 0px -75px 0px",
      threshold: 0.1, // 10% of footer must be visible to trigger
    },
  );

  if (footer) {
    observer.observe(footer);
  }

  const subscribeBtn = footer.querySelector(".newsletter-form-wrapper .btn");
  const emailInput = footer.querySelector(".contact-email");
  const errMsg = footer.querySelector(".newsletter-form-err-msg");
  const newletterBtn = footer.querySelector("#newletter-btn");

  subscribeBtn.addEventListener("click", function () {
    const email = emailInput.value.trim();
    if (!validateEmail(email)) {
      emailInput.classList.add("error");
      errMsg.style.opacity = "1";
      return;
    }
    newletterBtn.classList.add("loading");
    setTimeout(() => {
      window.showToast("Thank you for subscribing");
      emailInput.value = "";
      newletterBtn.classList.remove("loading");
    }, 2000);
  });

  emailInput.addEventListener("input", function () {
    emailInput.classList.remove("error");
    errMsg.style.opacity = "0";
  });
});
