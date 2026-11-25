import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  RODA_TIME_ZONE
} from "./supabase-config.js";

if (
  !SUPABASE_URL ||
  SUPABASE_URL.startsWith("https://SEU-PROJETO") ||
  !SUPABASE_PUBLISHABLE_KEY ||
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_SUA_")
) {
  console.warn(
    "Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em supabase-config.js antes de usar a autenticação."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

window.__rodaSupabaseClient = supabase;

const els = {
  authBox: document.getElementById("authBox"),
  profilePanel: document.getElementById("profilePanel"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  btnLogin: document.getElementById("btnLogin"),
  btnSignup: document.getElementById("btnSignup"),
  btnLogout: document.getElementById("btnLogout"),
  authFeedback: document.getElementById("authFeedback"),
  memberFeedback: document.getElementById("memberFeedback"),
  profileNameDisplay: document.getElementById("profileNameDisplay"),
  profileRoleDisplay: document.getElementById("profileRoleDisplay"),
  profileForm: document.getElementById("profileForm"),
  profileDisplayName: document.getElementById("profileDisplayName"),
  profileNickname: document.getElementById("profileNickname"),
  attendanceSummary: document.getElementById("attendanceSummary"),
  btnConfirmPresence: document.getElementById("btnConfirmAttendance"),
  btnCancelPresence: document.getElementById("btnCancelAttendance")
};

const isLoginPage = Boolean(els.authForm);
const isProfilePage = Boolean(els.profileForm);

let attendanceChannel = null;
let hasRedirectedAfterAuth = false;

function getSaoPauloTodayISO() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: RODA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function setFeedback(el, msg, state = "info") {
  if (!el) return;
  el.textContent = msg || "";
  if (msg) {
    el.dataset.state = state;
  } else {
    delete el.dataset.state;
  }
}

function setButtonsDisabled(disabled) {
  [
    els.btnLogin,
    els.btnSignup,
    els.btnLogout,
    els.btnConfirmPresence,
    els.btnCancelPresence
  ].forEach((btn) => {
    if (btn) btn.disabled = disabled;
  });

  const submitBtn = els.profileForm?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = disabled;
}

function showLoggedOutUI() {
  if (isLoginPage) {
    if (els.authBox) els.authBox.hidden = false;
    if (els.profilePanel) els.profilePanel.hidden = true;
  } else if (isProfilePage) {
    if (els.authBox) els.authBox.hidden = false;
    if (els.profilePanel) els.profilePanel.hidden = true;
  } else {
    // Na Home: mostra o box com o link "Entrar" e esconde o painel logado
    if (els.authBox) els.authBox.hidden = false;
    if (els.profilePanel) els.profilePanel.hidden = true;
  }

  if (els.profileNameDisplay) els.profileNameDisplay.textContent = "Participante";
  if (els.profileRoleDisplay) els.profileRoleDisplay.textContent = "";
  if (els.attendanceSummary) els.attendanceSummary.textContent = "";
}

function showLoggedInUI() {
  if (els.authBox) els.authBox.hidden = true;
  if (els.profilePanel) els.profilePanel.hidden = false;
}

function cleanupRealtime() {
  if (attendanceChannel) {
    void supabase.removeChannel(attendanceChannel);
    attendanceChannel = null;
  }
}

function subscribeTodayAttendance(userId) {
  if (!els.attendanceSummary) return;
  cleanupRealtime();

  attendanceChannel = supabase
    .channel("roda-attendances-today")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "attendances"
      },
      () => {
        void loadTodayAttendance(userId);
      }
    )
    .subscribe();
}

async function ensureAndLoadProfile(user) {
  let { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, nickname, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && !data) {
    const fallbackName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      (user.email ? user.email.split("@")[0] : "Participante");

    await supabase
      .from("profiles")
      .upsert(
        { id: user.id, display_name: fallbackName },
        { onConflict: "id", ignoreDuplicates: true }
      );

    const retry = await supabase
      .from("profiles")
      .select("id, display_name, nickname, role")
      .eq("id", user.id)
      .maybeSingle();

    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    setFeedback(els.memberFeedback, "Não foi possível carregar o perfil.");
    return;
  }

  const labelNome = data.nickname
    ? `${data.display_name} (${data.nickname})`
    : data.display_name || user.email || "Participante";

  if (els.profileNameDisplay) els.profileNameDisplay.textContent = labelNome;
  if (els.profileRoleDisplay) {
    els.profileRoleDisplay.textContent = `Perfil: ${data.role === "organizer" ? "Organizador" : "Participante"}`;
  }
  if (els.profileDisplayName) els.profileDisplayName.value = data.display_name || "";
  if (els.profileNickname) els.profileNickname.value = data.nickname || "";
}

async function loadTodayAttendance(userId) {
  if (!els.attendanceSummary) return;

  const today = getSaoPauloTodayISO();

  const { data: sessionRow, error: sessionErr } = await supabase
    .from("roda_sessions")
    .select("id")
    .eq("session_date", today)
    .maybeSingle();

  if (sessionErr) {
    els.attendanceSummary.textContent = "Erro ao consultar a roda de hoje.";
    return;
  }

  if (!sessionRow) {
    els.attendanceSummary.textContent = "Nenhuma presença confirmada ainda para hoje (0 confirmados).";
    return;
  }

  const { data: rows, error: attErr } = await supabase
    .from("attendances")
    .select("user_id, status")
    .eq("session_id", sessionRow.id);

  if (attErr) {
    els.attendanceSummary.textContent = "Erro ao carregar confirmações de presença.";
    return;
  }

  const confirmedCount = (rows || []).filter((r) => r.status === "confirmed").length;
  const myStatus = (rows || []).find((r) => r.user_id === userId)?.status;

  const myText =
    myStatus === "confirmed"
      ? "Sua presença está CONFIRMADA."
      : myStatus === "cancelled"
        ? "Sua presença está CANCELADA."
        : "Você ainda não confirmou presença hoje.";

  els.attendanceSummary.textContent = `${myText} Total de confirmados hoje: ${confirmedCount}.`;
}

async function setAttendanceStatus(desiredStatus) {
  setFeedback(els.memberFeedback, "Atualizando presença...");
  setButtonsDisabled(true);

  try {
    const { data, error } = await supabase.rpc("toggle_attendance_today", {
      p_desired_status: desiredStatus
    });

    if (error) {
      setFeedback(els.memberFeedback, `Erro ao atualizar presença: ${error.message}`);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const count = row?.confirmed_count ?? 0;
    const statusLabel = row?.attendance_status === "confirmed" ? "CONFIRMADA" : "CANCELADA";

    if (els.attendanceSummary) {
      els.attendanceSummary.textContent = `Sua presença está ${statusLabel}. Total de confirmados hoje: ${count}.`;
    }
    setFeedback(els.memberFeedback, "Presença atualizada com sucesso!");
  } finally {
    setButtonsDisabled(false);
  }
}

async function syncAuthState(session) {
  if (!session?.user) {
    setFeedback(els.authFeedback, "");
    setFeedback(els.memberFeedback, "");
    cleanupRealtime();
    showLoggedOutUI();
    return;
  }

  if (isLoginPage && !hasRedirectedAfterAuth) {
    hasRedirectedAfterAuth = true;
    setButtonsDisabled(true);
    setFeedback(
      els.authFeedback,
      "Autenticado com sucesso! Redirecionando para a Home...",
      "success"
    );
    setTimeout(() => {
      window.location.replace("index.html");
    }, 700);
    return;
  }

  setFeedback(els.authFeedback, "");
  setFeedback(els.memberFeedback, "");
  showLoggedInUI();

  const tasks = [ensureAndLoadProfile(session.user)];
  if (els.attendanceSummary) {
    tasks.push(loadTodayAttendance(session.user.id));
  }

  await Promise.all(tasks);

  if (els.attendanceSummary) {
    subscribeTodayAttendance(session.user.id);
  }
}

function validateCredentials(email, password) {
  if (!email || !email.includes("@")) {
    return "Informe um e-mail válido.";
  }
  if (!password || password.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  return null;
}

els.authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFeedback(els.authFeedback, "");

  const email = els.authEmail?.value.trim() || "";
  const password = els.authPassword?.value || "";
  const validationError = validateCredentials(email, password);

  if (validationError) {
    setFeedback(els.authFeedback, validationError, "error");
    return;
  }

  setFeedback(els.authFeedback, "Verificando credenciais...", "info");
  setButtonsDisabled(true);

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setFeedback(els.authFeedback, `Erro no login: ${error.message}`, "error");
      setButtonsDisabled(false);
      return;
    }

    setFeedback(
      els.authFeedback,
      "Login realizado! Redirecionando para a Home...",
      "success"
    );
  } catch (err) {
    setFeedback(
      els.authFeedback,
      `Falha inesperada ao entrar: ${err?.message || "tente novamente."}`,
      "error"
    );
    setButtonsDisabled(false);
  }
});

els.btnSignup?.addEventListener("click", async () => {
  setFeedback(els.authFeedback, "");

  const email = els.authEmail?.value.trim() || "";
  const password = els.authPassword?.value || "";
  const validationError = validateCredentials(email, password);

  if (validationError) {
    setFeedback(els.authFeedback, validationError, "error");
    return;
  }

  setFeedback(els.authFeedback, "Criando sua conta...", "info");
  setButtonsDisabled(true);

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setFeedback(els.authFeedback, `Erro no cadastro: ${error.message}`, "error");
      setButtonsDisabled(false);
      return;
    }

    if (data.session) {
      setFeedback(
        els.authFeedback,
        "Conta criada! Redirecionando para a Home...",
        "success"
      );
    } else {
      setFeedback(
        els.authFeedback,
        "Conta criada! Confira seu e-mail para confirmar o cadastro antes de entrar.",
        "success"
      );
      setButtonsDisabled(false);
    }
  } catch (err) {
    setFeedback(
      els.authFeedback,
      `Falha inesperada ao cadastrar: ${err?.message || "tente novamente."}`,
      "error"
    );
    setButtonsDisabled(false);
  }
});

els.btnSignup?.addEventListener("click", async () => {
  setFeedback(els.authFeedback, "");

  const email = els.authEmail?.value.trim() || "";
  const password = els.authPassword?.value || "";
  const validationError = validateCredentials(email, password);

  if (validationError) {
    setFeedback(els.authFeedback, validationError);
    return;
  }

  setFeedback(els.authFeedback, "Criando conta...");
  setButtonsDisabled(true);

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setFeedback(els.authFeedback, `Erro no cadastro: ${error.message}`);
      return;
    }

    if (data.session) {
      setFeedback(els.authFeedback, "Conta criada e sessão iniciada!");
    } else {
      setFeedback(
        els.authFeedback,
        "Conta criada! Confira seu e-mail para confirmar o cadastro, se necessário."
      );
    }
  } finally {
    setButtonsDisabled(false);
  }
});

els.btnLogout?.addEventListener("click", async () => {
  setButtonsDisabled(true);
  try {
    cleanupRealtime();
    await supabase.auth.signOut();
    if (isProfilePage) {
      window.location.href = "index.html";
    }
  } finally {
    setButtonsDisabled(false);
  }
});

els.profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFeedback(els.memberFeedback, "");

  const displayName = els.profileDisplayName?.value.trim() || "";
  const nickname = els.profileNickname?.value.trim() || null;

  if (!displayName) {
    setFeedback(els.memberFeedback, "O nome de exibição não pode ficar vazio.");
    return;
  }

  setFeedback(els.memberFeedback, "Salvando perfil...");
  setButtonsDisabled(true);

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      setFeedback(els.memberFeedback, "Sessão expirada. Faça login novamente.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, nickname })
      .eq("id", user.id);

    if (error) {
      setFeedback(els.memberFeedback, `Erro ao salvar perfil: ${error.message}`);
      return;
    }

    await ensureAndLoadProfile(user);
    setFeedback(els.memberFeedback, "Perfil atualizado!");
  } finally {
    setButtonsDisabled(false);
  }
});

els.btnConfirmPresence?.addEventListener("click", () => {
  void setAttendanceStatus("confirmed");
});

els.btnCancelPresence?.addEventListener("click", () => {
  void setAttendanceStatus("cancelled");
});

const { data: initialSessionData } = await supabase.auth.getSession();
await syncAuthState(initialSessionData?.session);

supabase.auth.onAuthStateChange((_event, session) => {
  void syncAuthState(session);
});