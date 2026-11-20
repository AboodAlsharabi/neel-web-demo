import {
  COVERAGE_STATUSES,
  PRIORITIES,
  REQUEST_STATUSES,
  SUPPORT_TYPE_MAP
} from "./constants.js";

const ARABIC_DATE = new Intl.DateTimeFormat("ar", {
  day: "numeric",
  month: "long",
  year: "numeric",
  numberingSystem: "latn"
});

const ARABIC_DATETIME = new Intl.DateTimeFormat("ar", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  numberingSystem: "latn"
});

const UNIT_FORMS = {
  device: { one: "جهاز", two: "جهازان", few: "أجهزة", many: "جهازًا" },
  trainer: { one: "مدرب", two: "مدربان", few: "مدربون", many: "مدربًا" },
  opportunity: { one: "فرصة", two: "فرصتان", few: "فرص", many: "فرصة" },
  workshop: { one: "ورشة", two: "ورشتان", few: "ورش", many: "ورشة" },
  session: { one: "جلسة", two: "جلستان", few: "جلسات", many: "جلسة" },
  package: { one: "حزمة", two: "حزمتان", few: "حزم", many: "حزمة" },
  trainee: { one: "متدرب", two: "متدربان", few: "متدربون", many: "متدربًا" }
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function nl2br(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export function formatDate(value, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return ARABIC_DATE.format(date);
}

export function formatDateTime(value, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return ARABIC_DATETIME.format(date);
}

export function formatNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toLocaleString("ar-EG", { numberingSystem: "latn" }) : "0";
}

export function formatQty(quantity, unit) {
  const number = Number(quantity);
  if (!Number.isFinite(number)) return "غير محدد";
  const forms = UNIT_FORMS[unit];
  if (!forms) return `${formatNumber(number)} ${unit || ""}`.trim();
  if (number === 0) return `0 ${forms.one}`;
  if (number === 1) return forms.one;
  if (number === 2) return forms.two;
  if (number >= 3 && number <= 10) return `${formatNumber(number)} ${forms.few}`;
  return `${formatNumber(number)} ${forms.many}`;
}

export function formatNeedQuantity(need) {
  if (!need || need.requiredQuantity == null) return "التزام وصفي";
  return formatQty(need.requiredQuantity, need.unit);
}

export function formatAgreedOfRequired(agreed, required, unit) {
  if (required == null) return "تعهد وصفي";
  return `${formatNumber(agreed)} من ${formatQty(required, unit)}`;
}

export function supportLabel(type) {
  return SUPPORT_TYPE_MAP[type]?.label || type || "دعم";
}

export function supportShortLabel(type) {
  return SUPPORT_TYPE_MAP[type]?.shortLabel || type || "دعم";
}

export function priorityMeta(priority) {
  return PRIORITIES[priority] || PRIORITIES.medium;
}

export function requestStatusMeta(status) {
  return REQUEST_STATUSES[status] || REQUEST_STATUSES.draft;
}

export function coverageMeta(status) {
  return COVERAGE_STATUSES[status] || COVERAGE_STATUSES.uncovered;
}

export function roleLabel(role) {
  return role === "supporter" ? "جهة داعمة" : "جمعية";
}

export function getInitials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "ن";
  if (words.length === 1) return words[0].slice(0, 2);
  return `${words[0][0] || ""}${words[1][0] || ""}`;
}

export function normalizeArabic(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearch(text, query) {
  const cleanQuery = normalizeArabic(query);
  if (!cleanQuery) return true;
  return normalizeArabic(text).includes(cleanQuery);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO() {
  return new Date().toISOString();
}

export function uid(prefix = "ID") {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random.slice(0, 8).toUpperCase()}`;
}

export function sumBy(items, getter) {
  return items.reduce((total, item) => total + (Number(getter(item)) || 0), 0);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function debounce(fn, wait = 180) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function safeExternalHref(value) {
  const text = String(value || "").trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(text) ? text : "#";
}

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0%";
  return `${Math.round(number)}%`;
}

export function percentOf(part, total) {
  const numerator = Number(part) || 0;
  const denominator = Number(total) || 0;
  if (denominator <= 0) return 0;
  return clamp((numerator / denominator) * 100, 0, 100);
}

export function selectOptions(items, selected, getValue = (item) => item, getLabel = (item) => item) {
  return items
    .map((item) => {
      const value = getValue(item);
      const label = getLabel(item);
      return `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? " selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

export function checkboxGroup(name, values, selected = []) {
  return values
    .map((value) => {
      const checked = selected.includes(value);
      return `
        <label class="check">
          <input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(value)}"${checked ? " checked" : ""}>
          <span>${escapeHtml(value)}</span>
        </label>`;
    })
    .join("");
}

export function setFormError(field, message = "") {
  if (!field) return;
  field.classList.toggle("has-error", Boolean(message));
  const error = field.querySelector(".field-error");
  if (error) {
    error.textContent = message;
    error.classList.toggle("is-visible", Boolean(message));
  }
}

export function clearFormErrors(form) {
  form?.querySelectorAll(".field.has-error").forEach((field) => {
    field.classList.remove("has-error");
    const error = field.querySelector(".field-error");
    if (error) {
      error.textContent = "";
      error.classList.remove("is-visible");
    }
  });
}

export function getFormValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function getCheckedValues(form, name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

export function scrollMainTop() {
  const main = document.getElementById("app-main");
  if (main) {
    main.scrollIntoView({ block: "start", behavior: "auto" });
  } else {
    window.scrollTo(0, 0);
  }
}

export function navigateTo(path) {
  const hash = String(path || "").startsWith("#") ? String(path) : `#${path}`;
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

export function parseHashQuery(hash = window.location.hash) {
  const raw = String(hash || "").replace(/^#/, "");
  const queryIndex = raw.indexOf("?");
  if (queryIndex < 0) return {};
  return Object.fromEntries(new URLSearchParams(raw.slice(queryIndex + 1)).entries());
}

export function truncate(value, length = 120) {
  const text = String(value ?? "").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

export function parseBoolean(value) {
  return value === true || value === "true" || value === "1" || value === "on";
}
