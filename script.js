const RODA_START_HOUR = 17;
const RODA_END_HOUR = 19;
const RODA_TIME_ZONE = "America/Sao_Paulo";

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

// Datas comemorativas fixas ("MM-DD")
const DATAS_COMEMORATIVAS_FIXAS = {
  "01-01": "Feliz Ano Novo! Que a roda continue girando com muita energia neste novo ciclo.",
  "02-14": "Dia de São Valentim — espalhando amizade e boas jogadas dentro e fora da quadra.",
  "03-08": "Feliz Dia Internacional da Mulher! Respeito, força e presença em cada jogada.",
  "04-21": "Feriado de Tiradentes — aproveite o descanso e recarregue as energias.",
  "05-01": "Dia do Trabalhador — pausa merecida para quem constrói o dia a dia.",
  "06-12": "Dia dos Namorados — boas vibrações e parceria dentro e fora da roda.",
  "08-11": "Feliz Dia do Estudante! A roda é feita por vocês e para vocês.",
  "09-01": "Dia do Profissional de Educação Física — valorizando o movimento e o esporte.",
  "09-07": "Independência do Brasil — feriado nacional, aproveite o dia.",
  "10-12": "Dia das Crianças e Nossa Senhora Aparecida — leveza, alegria e espírito de jogo.",
  "10-31": "Feliz Halloween! Cuidado com os passes assombrados na roda.",
  "11-02": "Finados — dia de respeito e memória.",
  "11-15": "Proclamação da República — feriado, aproveite o descanso.",
  "11-20": "Dia da Consciência Negra — memória, luta, cultura e respeito.",
  "12-25": "Feliz Natal! Muita paz, união e alegria para toda a turma da Roda de Vôlei."
};

function getSaoPauloTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: RODA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const year = Number(map.year);
  const month = Number(map.month);
  const dayOfMonth = Number(map.day);
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute);

  return {
    year,
    monthKey: `${String(month).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`,
    day: WEEKDAY_MAP[map.weekday] ?? date.getDay(),
    minutes: hour * 60 + minute
  };
}

function getEasterDateUTC(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function getMensagemComemorativa(date = new Date()) {
  const { year, monthKey } = getSaoPauloTimeParts(date);

  if (DATAS_COMEMORATIVAS_FIXAS[monthKey]) {
    return DATAS_COMEMORATIVAS_FIXAS[monthKey];
  }

  const hojeUTC = Date.UTC(
    year,
    Number(monthKey.slice(0, 2)) - 1,
    Number(monthKey.slice(3, 5))
  );
  const pascoaUTC = getEasterDateUTC(year).getTime();
  const diffDias = Math.round((hojeUTC - pascoaUTC) / 86400000);

  if (diffDias === -2) return "Sexta-feira Santa — dia de reflexão e pausa.";
  if (diffDias === 0) return "Feliz Páscoa! Renovação, união e boas energias para todos.";
  if (diffDias === 1) return "Segunda de Páscoa — seguindo em frente com renovação e movimento.";

  return null;
}

function isRodaAtiva(date = new Date()) {
  const { day, minutes } = getSaoPauloTimeParts(date);
  const start = RODA_START_HOUR * 60;
  const end = RODA_END_HOUR * 60;

  return day >= 1 && day <= 5 && minutes >= start && minutes < end;
}

function renderStatus() {
  const aviso = document.getElementById("avisoRoda");
  if (!aviso) return;

  const statusTexto = isRodaAtiva()
    ? "Está tendo roda hoje."
    : "A roda não está acontecendo agora.";

  const mensagemData = getMensagemComemorativa();

  aviso.innerHTML = mensagemData
    ? `<p><strong>Status:</strong> ${statusTexto}</p><p class="status-data"><strong>Data comemorativa:</strong> ${mensagemData}</p>`
    : `<p><strong>Status:</strong> ${statusTexto}</p>`;
}

// --- A partir daqui o seu código continua exatamente igual ---

function initStatus() {
  renderStatus();
  window.setInterval(renderStatus, 60000);
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
  const dialog = document.getElementById("comoFuncionaDialog");
  const fecharBtn = document.getElementById("fecharDialog");

  if (!btnComo) return;

  if (dialog && typeof dialog.showModal === "function") {
    btnComo.addEventListener("click", () => {
      dialog.showModal();
    });

    fecharBtn?.addEventListener("click", () => {
      dialog.close();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  } else {
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