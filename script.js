const RODA_START_HOUR = 17;
const RODA_END_HOUR = 19;

function isRodaAtiva(date = new Date()) {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = RODA_START_HOUR * 60;
  const end = RODA_END_HOUR * 60;

  return day >= 1 && day <= 5 && minutes >= start && minutes < end;
}

function initStatus() {
  const aviso = document.getElementById("avisoRoda");
  if (!aviso) return;

  aviso.innerHTML = isRodaAtiva()
    ? "<strong>Status:</strong> Está tendo roda hoje."
    : "<strong>Status:</strong> A roda não está acontecendo agora.";
}

function initGalleries() {
  document.querySelectorAll(".galeria-bloco").forEach((bloco) => {
    const wrapper = bloco.querySelector(".galeria-wrapper");
    const next = bloco.querySelector(".next");
    const prev = bloco.querySelector(".prev");

    if (!wrapper) return;

    const updateButtons = () => {
      const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
      if (prev) prev.disabled = wrapper.scrollLeft <= 1;
      if (next) next.disabled = wrapper.scrollLeft >= maxScroll - 1;
    };

    const scrollAmount = () => Math.max(wrapper.clientWidth * 0.7, 150);

    if (next) {
      next.addEventListener("click", () => {
        wrapper.scrollBy({ left: scrollAmount(), behavior: "smooth" });
      });
    }

    if (prev) {
      prev.addEventListener("click", () => {
        wrapper.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
      });
    }

    wrapper.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    updateButtons();
  });
}

function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const caption = document.getElementById("caption");
  const closeBtn = lightbox?.querySelector(".close");
  let lastFocusedElement = null;

  if (!lightbox || !lightboxImg || !caption || !closeBtn) return;

  const close = () => {
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    lightboxImg.removeAttribute("src");
    if (lastFocusedElement) lastFocusedElement.focus();
  };

  document.querySelectorAll(".galeria-item img").forEach((img) => {
    img.addEventListener("click", () => {
      lastFocusedElement = img;
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt;
      caption.textContent = img.alt;
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
      closeBtn.focus();
    });
  });

  closeBtn.addEventListener("click", close);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") close();
  });
}

function initButtons() {
  const btnComo = document.getElementById("comoFunciona");
  if (btnComo) {
    btnComo.addEventListener("click", () => {
      window.alert("A roda é livre.\n\nNão precisa de experiência.\nChegou, entrou, jogou.");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initStatus();
  initGalleries();
  initLightbox();
  initButtons();
});
