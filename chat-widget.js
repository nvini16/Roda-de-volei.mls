import * as supabaseConfig from "./supabase-config.js";

const FUNCTION_NAME = "MLS-AI";
const WELCOME_MESSAGE =
  "Olá! Posso tirar dúvidas sobre a Roda de Vôlei, mostrar o resumo de presença de hoje ou conversar sobre vôlei em geral.";

function getSupabaseContext() {
  const cfg =
    supabaseConfig.default ||
    supabaseConfig.RODA_SUPABASE_CONFIG ||
    window.RODA_SUPABASE_CONFIG ||
    supabaseConfig;

  const url = (
    cfg.url ||
    cfg.supabaseUrl ||
    cfg.SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
  const key =
    cfg.publishableKey ||
    cfg.anonKey ||
    cfg.SUPABASE_PUBLISHABLE_KEY ||
    cfg.SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) return null;

  return {
    supabase: window.__rodaSupabaseClient || cfg.supabase || null,
    url,
    key,
  };
}

function getStoredSession(supabaseUrl) {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    if (!projectRef) return null;
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession || parsed;
    if (!session?.access_token) return null;
    return {
      accessToken: session.access_token,
      userId: session.user?.id || null,
    };
  } catch {
    return null;
  }
}

async function resolveSession(supabase, supabaseUrl) {
  const stored = getStoredSession(supabaseUrl);
  if (stored?.accessToken) return stored;

  if (supabase?.auth?.getSession) {
    try {
      const { data } = await supabase.auth.getSession();
      const s = data?.session;
      if (s?.access_token) {
        return {
          accessToken: s.access_token,
          userId: s.user?.id || null,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function initChatWidget() {
  if (document.getElementById("mls-chat-launcher")) return;

  const launcher = document.createElement("button");
  launcher.id = "mls-chat-launcher";
  launcher.type = "button";
  launcher.className = "mls-chat-launcher";
  launcher.setAttribute("aria-expanded", "false");
  launcher.textContent = "Assistente da Roda";

  const panel = document.createElement("section");
  panel.id = "mls-chat-panel";
  panel.className = "mls-chat-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Assistente da Roda de Vôlei");

  panel.innerHTML = `
    <div class="mls-chat-header">
      <strong>Assistente • Roda de Vôlei</strong>
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="mls-chat-clear" title="Limpar histórico" style="background:transparent;border:1px solid currentColor;border-radius:6px;padding:2px 8px;font-size:12px;color:inherit;cursor:pointer;" hidden>Limpar</button>
        <button type="button" class="mls-chat-close" aria-label="Fechar chat">&times;</button>
      </div>
    </div>
    <div class="mls-chat-messages" id="mls-chat-messages">
      <div class="mls-chat-msg bot">${WELCOME_MESSAGE}</div>
    </div>
    <div class="mls-chat-quick">
      <button type="button" data-q="Quantos confirmados hoje?">Confirmados hoje</button>
      <button type="button" data-q="Estou confirmado hoje?">Minha presença</button>
      <button type="button" data-q="Como funciona a roda?">Como funciona</button>
    </div>
    <form class="mls-chat-form" id="mls-chat-form">
      <input type="text" id="mls-chat-input" placeholder="Pergunte sobre a roda ou vôlei..." autocomplete="off" required />
      <button type="submit" id="mls-chat-send">Enviar</button>
    </form>
  `;

  document.body.append(launcher, panel);

  const closeBtn = panel.querySelector(".mls-chat-close");
  const clearBtn = panel.querySelector(".mls-chat-clear");
  const messagesEl = panel.querySelector("#mls-chat-messages");
  const formEl = panel.querySelector("#mls-chat-form");
  const inputEl = panel.querySelector("#mls-chat-input");
  const sendBtn = panel.querySelector("#mls-chat-send");

  let historyLoadedForUser = null;

  function appendMessage(text, role) {
    const bubble = document.createElement("div");
    bubble.className = `mls-chat-msg ${role}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function resetMessagesView(customWelcome = WELCOME_MESSAGE) {
    messagesEl.innerHTML = "";
    appendMessage(customWelcome, "bot");
  }

  async function loadPersistentHistory() {
    const ctx = getSupabaseContext();
    if (!ctx) return;

    const session = await resolveSession(ctx.supabase, ctx.url);
    if (!session?.accessToken) {
      clearBtn.hidden = true;
      historyLoadedForUser = null;
      return;
    }

    clearBtn.hidden = false;

    const cacheKey = session.userId || session.accessToken.slice(0, 16);
    if (historyLoadedForUser === cacheKey) return;

    try {
      const response = await fetch(
        `${ctx.url}/rest/v1/chat_messages?select=role,content&order=created_at.desc&limit=20`,
        {
          headers: {
            apikey: ctx.key,
            Authorization: `Bearer ${session.accessToken}`,
          },
          signal: AbortSignal.timeout(6000),
        },
      );

      if (!response.ok) return;

      const rows = await response.json();
      historyLoadedForUser = cacheKey;

      if (Array.isArray(rows) && rows.length > 0) {
        messagesEl.innerHTML = "";
        for (const item of [...rows].reverse()) {
          const role = item.role === "user" ? "user" : "bot";
          appendMessage(item.content, role);
        }
      }
    } catch {
      // Falha silenciosa: mantém a mensagem de boas-vindas
    }
  }

  async function clearPersistentHistory() {
    const ctx = getSupabaseContext();
    if (!ctx) return;

    const session = await resolveSession(ctx.supabase, ctx.url);
    if (!session?.accessToken) return;

    clearBtn.disabled = true;
    try {
      const filter = session.userId
        ? `user_id=eq.${encodeURIComponent(session.userId)}`
        : "id=not.is.null";

      const response = await fetch(`${ctx.url}/rest/v1/chat_messages?${filter}`, {
        method: "DELETE",
        headers: {
          apikey: ctx.key,
          Authorization: `Bearer ${session.accessToken}`,
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        resetMessagesView("Histórico limpo! Como posso ajudar agora?");
      }
    } finally {
      clearBtn.disabled = false;
    }
  }

  function togglePanel(forceOpen) {
    const isOpen = typeof forceOpen === "boolean" ? forceOpen : panel.hidden;
    panel.hidden = !isOpen;
    launcher.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      void loadPersistentHistory();
      inputEl.focus();
    }
  }

  async function sendQuestion(text) {
    const cleanText = text.trim();
    if (!cleanText) return;

    appendMessage(cleanText, "user");
    inputEl.value = "";
    sendBtn.disabled = true;

    const loadingBubble = appendMessage("Consultando...", "bot");

    try {
      const ctx = getSupabaseContext();
      if (!ctx) {
        throw new Error("Configuração do Supabase indisponível.");
      }

      const session = await resolveSession(ctx.supabase, ctx.url);

      const headers = {
        "Content-Type": "application/json",
        apikey: ctx.key,
      };

      if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
        clearBtn.hidden = false;
      }

      const response = await fetch(`${ctx.url}/functions/v1/${FUNCTION_NAME}`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({ message: cleanText }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível obter resposta.");
      }

      loadingBubble.textContent =
        data.reply || "Sem resposta no momento. Tente novamente.";
    } catch (err) {
      loadingBubble.textContent =
        err?.name === "TimeoutError"
          ? "A consulta demorou mais que o esperado. Tente novamente."
          : err?.message || "Erro ao falar com o assistente.";
    } finally {
      sendBtn.disabled = false;
    }
  }

  launcher.addEventListener("click", () => togglePanel());
  closeBtn.addEventListener("click", () => togglePanel(false));
  clearBtn.addEventListener("click", () => {
    void clearPersistentHistory();
  });

  panel.querySelectorAll("[data-q]").forEach((btn) => {
    btn.addEventListener("click", () => sendQuestion(btn.dataset.q || ""));
  });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    sendQuestion(inputEl.value);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatWidget);
} else {
  initChatWidget();
}