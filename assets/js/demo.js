import { hydrateIcons } from "./components/icons.js";
import { confirmDialog } from "./components/modal.js";
import { showToast } from "./components/toast.js";
import {
  clearSession,
  getCurrentOrganization,
  getCurrentSupporter,
  getSession,
  getState,
  resetDemo,
  setFlash,
  setSession
} from "./store.js";

const ROLE_PATHS = {
  association: "./app.html#/association/overview",
  supporter: "./app.html#/supporter/overview"
};

function startRole(role) {
  if (!ROLE_PATHS[role]) return;
  setSession(role);
  setFlash(
    role === "association"
      ? "دخلت كجمعية مهارات الغد. هذه جلسة محاكاة محلية وليست تسجيل دخول حقيقيًا."
      : "دخلت كشركة مدى التقنية. هذه جلسة محاكاة محلية وليست تسجيل دخول حقيقيًا.",
    "info"
  );
  window.location.assign(ROLE_PATHS[role]);
}

function setupContinueSession() {
  const banner = document.getElementById("continue-session");
  const text = document.getElementById("continue-session-text");
  const link = document.getElementById("continue-session-link");
  if (!banner || !text || !link) return;

  const session = getSession();
  if (!session) {
    banner.hidden = true;
    return;
  }

  const state = getState();
  const current = session.role === "association" ? getCurrentOrganization(state) : getCurrentSupporter(state);
  const roleName = session.role === "association" ? "الجمعية" : "الجهة الداعمة";
  text.textContent = `لديك جلسة محفوظة كـ${roleName}: ${current?.name || "الجهة الافتراضية"}. يمكنك المتابعة أو اختيار الدور الآخر لبدء جلسة جديدة.`;
  link.href = ROLE_PATHS[session.role];
  banner.hidden = false;
}

function setupRoleCards() {
  const requested = new URLSearchParams(window.location.search).get("role");
  if (requested === "association" || requested === "supporter") {
    document.querySelector(`[data-role-card="${requested}"]`)?.classList.add("is-suggested");
  }

  document.querySelectorAll("[data-start-role]").forEach((button) => {
    button.addEventListener("click", () => startRole(button.dataset.startRole));
  });
}

function setupReset() {
  document.querySelector("[data-reset-demo]")?.addEventListener("click", () => {
    confirmDialog({
      title: "إعادة ضبط بيانات العرض؟",
      message: "سيتم حذف المشاريع والطلبات والمساهمات والرسائل المحفوظة في هذا المتصفح، والعودة إلى بيانات seed الأصلية. ستنتهي الجلسة الحالية.",
      confirmLabel: "إعادة الضبط",
      cancelLabel: "إلغاء",
      tone: "danger",
      onConfirm: () => {
        resetDemo({ keepSession: false });
        clearSession();
        showToast("تمت إعادة بيانات العرض إلى حالتها الأصلية.", { title: "تمت إعادة الضبط", tone: "success" });
        window.setTimeout(() => window.location.reload(), 500);
      }
    });
  });
}

function init() {
  hydrateIcons();
  setupContinueSession();
  setupRoleCards();
  setupReset();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
