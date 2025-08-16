const mainOverlay = document.querySelector(".main-overlay");
const body = document.getElementById("body");
gsap.registerPlugin(ScrollTrigger);

window.whenDrawerOpen = (showOverlay = true) => {
  if (mainOverlay & showOverlay) {
    mainOverlay.classList.remove("disable-overlay");
  }
  body.style.overflow = "hidden";
};

window.whenDrawerClose = (showOverlay = true) => {
  if (mainOverlay & showOverlay) {
    mainOverlay.classList.add("disable-overlay");
  }
  body.style.overflow = "scroll";
};

// Moves element directly under the body tag
window.portal = (element) => {
  if (element) {
    document.body.append(element);
  }
};

// get cookie
window.getCookie = (name) => {
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null; // Cookie not found
};

window.updateCartCount = async () => {
  return fetch("/cart.js")
    .then(async (res) => await handleFetchResponse(res))
    .then((cart) => {
      const itemCount = document.getElementById("cart-item-count");
      if (itemCount) {
        itemCount.textContent = cart.item_count;

        if (cart.item_count > 0) {
          itemCount.classList.remove("hidden");
        } else {
          itemCount.classList.add("hidden");
        }
      }
    })
    .catch((err) => {
      alert("Error, view console for logs");
      console.error(err);
    });
};

window.showToast = (message, status = "success") => {
  const colors = {
    success: "#4CAF50", // green
    error: "#f44336", // red
    info: "#2196F3", // blue
  };

  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top", // 'top' or 'bottom'
    position: "right", // 'left', 'center' or 'right'
    backgroundColor: colors[status] || "#333",
    stopOnFocus: true,
  }).showToast();
};

window.handleFetchResponse = async (res) => {
  const data = await res.json();

  if (!res.ok) {
    const msg = data?.description || data?.message || "Something went wrong";
    throw new Error(msg);
  }

  return data;
};

isMobile = () => document.documentElement.clientWidth <= 1024;

getTransition = (position, factor) => position * factor * -1;

getParallaxAnimation = (wrapperSection, contentWrapper) => {
  if (!wrapperSection) {
    console.error("Main Section cannot be empty or null");
    return;
  }

  return ScrollTrigger.create({
    trigger: wrapperSection,
    start: "top top",
    end: "bottom top",
    pinType: "transform",

    onUpdate: (self) => {
      const progress = self.progress;
      const clientRect = wrapperSection.getBoundingClientRect();
      const top = clientRect.top;

      contentWrapper.forEach((ele) => {
        const content = ele.querySelector("#parallax-content-animation");
        const image = ele.querySelector("#parallax-image-animation");

        if (!content || !image) {
          console.error("text and image element cannot be empty");
          return;
        }

        // Only apply movement when section is scrolled past the top
        const position = top < 0 ? top : 0;

        gsap.set(content, {
          y: getTransition(position, 0.5), // Reduced factor to prevent downward movement
          opacity: 1 - progress,
        });

        gsap.set(image, {
          y: getTransition(position, 0.5), // Different factor for image
        });
      });
    },
  });
};
