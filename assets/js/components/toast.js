import { icon } from "./icons.js";

const ICONS = {
  success: "check-circle",
  warning: "alert-triangle",
  danger: "alert-circle",
  info: "info",
  brand: "info"
};

function getRegion() {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.className = "toast-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.append(region);
  }
  return region;
}

export function showToast(message, options = {}) {
  const { title = "", tone = "success", duration = 4800 } = options;
  const region = getRegion();
  const toast = document.createElement("div");
  toast.className = `toast is-${tone}`;
  toast.setAttribute("role", "status");

  const iconHost = document.createElement("span");
  iconHost.innerHTML = icon(ICONS[tone] || ICONS.info, { size: 19 });

  const content = document.createElement("div");
  content.className = "toast-content";
  if (title) {
    const titleEl = document.createElement("strong");
    titleEl.textContent = title;
    content.append(titleEl);
  }
  const messageEl = document.createElement("span");
  messageEl.textContent = message;
  content.append(messageEl);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "إغلاق التنبيه");
  close.innerHTML = icon("x", { size: 15 });

  toast.append(iconHost, content, close);
  region.append(toast);
  while (region.children.length > 3) region.firstElementChild.remove();

  let timeout = window.setTimeout(remove, duration);
  function remove() {
    window.clearTimeout(timeout);
    toast.remove();
  }
  close.addEventListener("click", remove);
  toast.addEventListener("mouseenter", () => window.clearTimeout(timeout));
  toast.addEventListener("mouseleave", () => {
    timeout = window.setTimeout(remove, 2200);
  });
  return { remove, element: toast };
}

export function showSuccess(message, title = "تم الحفظ") {
  return showToast(message, { title, tone: "success" });
}

export function showWarning(message, title = "تنبيه") {
  return showToast(message, { title, tone: "warning" });
}
