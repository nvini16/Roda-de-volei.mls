import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as supabaseConfig from "./supabase-config.js";

const FUNCTION_NAME = "MLS-AI";
let cachedClient = null;

function getSupabaseClient() {
  const cfg =
    supabaseConfig.default ||
    supabaseConfig.RODA_SUPABASE_CONFIG ||
    window.RODA_SUPABASE_CONFIG ||
    supabaseConfig;

  const url = cfg.url || cfg.supabaseUrl || cfg.SUPABASE_URL || "";
  const key =
    cfg.publishableKey ||
    cfg.anonKey ||
    cfg.SUPABASE_PUBLISHABLE_KEY ||
    cfg.SUPABASE_ANON_KEY ||
    "";

  if (cfg.supabase && url && key) {
    return { supabase: cfg.supabase, url, key };
  }

  if (!url || !key) return null;

  if (!cachedClient) {
    cachedClient = createClient(url, key);
  }

  return { supabase: cachedClient, url, key };
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
      <button type="button" class="mls-chat-close" aria-label="Fechar chat">&times;</button>
    </div>
    <div class="mls-chat-messages" id="mls-chat-messages">
      <div class="mls-chat-msg bot">Olá! Posso tirar dúvidas sobre a Roda de Vôlei e mostrar o resumo de presença de hoje.</div>
    </div>
    <div class="mls-chat-quick">
      <button type="button" data-q="Quantos confirmados hoje?">Confirmados hoje</button>
      <button type="button" data-q="Estou confirmado hoje?">Minha presença</button>
      <button type="button" data-q="Como funciona a roda?">Como funciona</button>
    </div>
    <form class="mls-chat-form" id="mls-chat-form">
      <input type="text" id="mls-chat-input" placeholder="Pergunte sobre a roda..." autocomplete="off" required />
      <button type="submit" id="mls-chat-send">Enviar</button>
    </form>
  `;

  document.body.append(launcher, panel);

  const closeBtn = panel.querySelector(".mls-chat-close");
  const messagesEl = panel.querySelector("#mls-chat-messages");
  const formEl = panel.querySelector("#mls-chat-form");
  const inputEl = panel.querySelector("#mls-chat-input");
  const sendBtn = panel.querySelector("#mls-chat-send");

  function togglePanel(forceOpen) {
    const isOpen = typeof forceOpen === "boolean" ? forceOpen : panel.hidden;
    panel.hidden = !isOpen;
    launcher.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) inputEl.focus();
  }

  function appendMessage(text, role) {
    const bubble = document.createElement("div");
    bubble.className = `mls-chat-msg ${role}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  async function sendQuestion(text) {
    const cleanText = text.trim();
    if (!cleanText) return;

    appendMessage(cleanText, "user");
    inputEl.value = "";
    sendBtn.disabled = true;

    const loadingBubble = appendMessage("Consultando...", "bot");

    try {
      const clientData = getSupabaseClient();
      if (!clientData) {
        throw new Error("Configuração do Supabase indisponível.");
      }

      const { supabase, url, key } = clientData;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers = {
        "Content-Type": "application/json",
        apikey: key,
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${url}/functions/v1/${FUNCTION_NAME}`, {
        method: "POST",
        headers,
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
        err?.message || "Erro ao falar com o assistente.";
    } finally {
      sendBtn.disabled = false;
    }
  }

  launcher.addEventListener("click", () => togglePanel());
  closeBtn.addEventListener("click", () => togglePanel(false));

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