import { icon } from "./icons.js";

let previousFocus = null;
let activeModal = null;

function focusableElements(root) {
  return [...root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => element.offsetParent !== null);
}

export function closeModal() {
  const root = document.getElementById("modal-root");
  if (!root) return;
  if (activeModal?.cleanup) activeModal.cleanup();
  root.innerHTML = "";
  document.body.classList.remove("is-locked");
  activeModal = null;
  if (previousFocus && typeof previousFocus.focus === "function") {
    previousFocus.focus({ preventScroll: true });
  }
  previousFocus = null;
}

export function openModal({
  title,
  description = "",
  body = "",
  footer = "",
  size = "default",
  onMount = null,
  closeOnBackdrop = true
} = {}) {
  const root = document.getElementById("modal-root");
  if (!root) return null;
  if (activeModal) closeModal();

  previousFocus = document.activeElement;
  document.body.classList.add("is-locked");

  const overlay = document.createElement("div");
  overlay.className = "modal-backdrop";
  overlay.dataset.modalBackdrop = "true";

  const modal = document.createElement("div");
  modal.className = `modal${size === "wide" ? " is-wide" : size === "narrow" ? " is-narrow" : ""}`;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "modal-title");
  modal.tabIndex = -1;

  const header = document.createElement("div");
  header.className = "modal-header";
  const headingWrap = document.createElement("div");
  const heading = document.createElement("h2");
  heading.id = "modal-title";
  heading.textContent = title || "";
  headingWrap.append(heading);
  if (description) {
    const desc = document.createElement("p");
    desc.textContent = description;
    headingWrap.append(desc);
  }
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-btn-plain";
  close.setAttribute("aria-label", "إغلاق النافذة");
  close.innerHTML = icon("x", { size: 18 });
  close.addEventListener("click", closeModal);
  header.append(headingWrap, close);

  const bodyEl = document.createElement("div");
  bodyEl.className = "modal-body";
  bodyEl.innerHTML = body;

  modal.append(header, bodyEl);

  let footerEl = null;
  if (footer) {
    footerEl = document.createElement("div");
    footerEl.className = "modal-footer";
    footerEl.innerHTML = footer;
    modal.append(footerEl);
  }

  overlay.append(modal);
  root.innerHTML = "";
  root.append(overlay);
  activeModal = { overlay, modal, body: bodyEl, footer: footerEl, close: closeModal };

  overlay.addEventListener("click", (event) => {
    if (closeOnBackdrop && event.target === overlay) closeModal();
  });

  const keyHandler = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key === "Tab") {
      const focusable = focusableElements(modal);
      if (!focusable.length) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener("keydown", keyHandler);
  activeModal.cleanup = () => {
    document.removeEventListener("keydown", keyHandler);
  };

  if (typeof onMount === "function") {
    onMount({ modal, body: bodyEl, footer: footerEl, close: closeModal });
  }

  requestAnimationFrame(() => {
    const preferred = bodyEl.querySelector("[autofocus]");
    const first = preferred || focusableElements(bodyEl)[0] || focusableElements(modal)[0] || modal;
    first.focus({ preventScroll: true });
  });

  return activeModal;
}

export function confirmDialog({
  title = "هل تريد المتابعة؟",
  message = "",
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "brand",
  onConfirm = null
} = {}) {
  const buttonClass =
    tone === "danger" ? "btn-danger" : tone === "success" ? "btn-success" : "btn-primary";
  return openModal({
    title,
    size: "narrow",
    body: `<p class="muted">${message}</p><div class="note-strip is-warning" style="margin-block-start:16px">${icon("info", { size: 18 })}<span>هذه العملية تتم داخل المحاكاة فقط ولا تتصل بخادم خارجي.</span></div>`,
    footer: `
      <button type="button" class="btn btn-outline" data-modal-cancel>${cancelLabel}</button>
      <button type="button" class="btn ${buttonClass}" data-modal-confirm>${confirmLabel}</button>`,
    onMount: ({ footer, close }) => {
      footer.querySelector("[data-modal-cancel]")?.addEventListener("click", close);
      footer.querySelector("[data-modal-confirm]")?.addEventListener("click", () => {
        close();
        onConfirm?.();
      });
    }
  });
}

export function cleanupModal() {
  if (activeModal?.cleanup) activeModal.cleanup();
  closeModal();
}
