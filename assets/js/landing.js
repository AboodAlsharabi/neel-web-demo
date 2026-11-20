import { hydrateIcons } from "./components/icons.js";

function setupMobileNav() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.getElementById("mobile-nav");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
  };

  toggle.addEventListener("click", () => {
    setOpen(!nav.classList.contains("is-open"));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) setOpen(false);
  });
}

function setupFlowTabs() {
  const tabs = [...document.querySelectorAll("[data-flow-tab]")];
  const panels = [...document.querySelectorAll("[data-flow-panel]")];
  if (!tabs.length || !panels.length) return;

  const activate = (key, { focus = false } = {}) => {
    tabs.forEach((tab) => {
      const selected = tab.dataset.flowTab === key;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.flowPanel !== key;
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab.dataset.flowTab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      activate(tabs[nextIndex].dataset.flowTab, { focus: true });
    });
  });

  activate(tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.flowTab || tabs[0].dataset.flowTab);
}

function setupSmoothLinks() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });
}

function init() {
  hydrateIcons();
  setupMobileNav();
  setupFlowTabs();
  setupSmoothLinks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
