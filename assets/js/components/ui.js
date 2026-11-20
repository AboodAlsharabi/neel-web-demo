import { escapeHtml, formatNumber, getInitials, percentOf } from "../utils.js";
import { icon } from "./icons.js";

export { emptyState } from "./empty-state.js";

export function pageHeader({ eyebrow = "", title = "", description = "", actions = "", meta = "" } = {}) {
  return `
    <header class="page-head">
      <div class="page-head-copy">
        ${eyebrow ? `<div class="page-eyebrow">${icon("route", { size: 14 })}${eyebrow}</div>` : ""}
        <h1 class="page-title">${title}</h1>
        ${description ? `<p class="page-desc">${description}</p>` : ""}
        ${meta ? `<div class="page-meta">${meta}</div>` : ""}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </header>`;
}

export function sectionTitle(title, description = "", action = "") {
  return `
    <div class="section-title-row">
      <div>
        <h2>${title}</h2>
        ${description ? `<p>${description}</p>` : ""}
      </div>
      ${action}
    </div>`;
}

export function statCard({
  iconName = "chart-no-axes-column",
  label = "",
  value = 0,
  note = "",
  tone = "brand",
  href = ""
} = {}) {
  const valueMarkup = href
    ? `<a href="${href}" class="plain-link">${escapeHtml(formatNumber(value))}</a>`
    : escapeHtml(formatNumber(value));
  return `
    <article class="stat-card">
      <div class="stat-top">
        <span class="stat-icon is-${tone}">${icon(iconName, { size: 19 })}</span>
      </div>
      <div class="stat-value">${valueMarkup}</div>
      <div class="stat-label">${label}</div>
      ${note ? `<div class="stat-note">${note}</div>` : ""}
    </article>`;
}

export function progressBar(value, tone = "brand", label = "", hint = "") {
  const percent = Math.round(Math.max(0, Math.min(Number(value) || 0, 100)));
  return `
    <div>
      ${label ? `<div class="progress-label"><span>${label}</span><span>${hint || `${percent}%`}</span></div>` : ""}
      <div class="progress${tone !== "brand" ? ` is-${tone}` : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${escapeHtml(label || "نسبة التقدم")}">
        <span style="width:${percent}%"></span>
      </div>
    </div>`;
}

export function avatar(name, { size = "", neutral = false } = {}) {
  return `<span class="avatar${size ? ` is-${size}` : ""}${neutral ? " is-neutral" : ""}" aria-hidden="true">${escapeHtml(getInitials(name))}</span>`;
}

export function donutChart(segments, { centerValue = "", centerLabel = "", ariaLabel = "" } = {}) {
  const total = segments.reduce((sum, segment) => sum + (Number(segment.value) || 0), 0);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const circles = segments
    .filter((segment) => Number(segment.value) > 0)
    .map((segment) => {
      const value = Number(segment.value) || 0;
      const length = total > 0 ? (value / total) * circumference : 0;
      const circle = `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="${segment.color}" stroke-width="11" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"></circle>`;
      offset += length;
      return circle;
    })
    .join("");

  const description = ariaLabel || segments
    .map((segment) => `${segment.label}: ${formatNumber(segment.value)}`)
    .join("، ");

  return `
    <div class="donut-chart">
      <svg viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(description)}">
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="var(--surface-alt)" stroke-width="11"></circle>
        ${circles}
      </svg>
      <div class="donut-center" aria-hidden="true">
        <strong>${escapeHtml(centerValue)}</strong>
        <span>${escapeHtml(centerLabel)}</span>
      </div>
    </div>`;
}

export function barChart(items, { ariaLabel = "" } = {}) {
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);
  return `
    <div class="bar-chart" role="img" aria-label="${escapeHtml(ariaLabel || "مخطط أعمدة")}">
      ${items
        .map(
          (item) => `
            <div class="bar-row">
              <span class="bar-label">${item.label}</span>
              <span class="bar-track"><span class="bar-fill${item.tone ? ` is-${item.tone}` : ""}" style="width:${percentOf(item.value, max)}%"></span></span>
              <span class="bar-value">${formatNumber(item.value)}</span>
            </div>`
        )
        .join("")}
    </div>`;
}

export function coverageFlow(percent, label = "") {
  return `
    <div class="progress-wrap">
      ${label ? `<div class="progress-label"><span>${label}</span><span>${Math.round(percent)}%</span></div>` : ""}
      <div class="progress"><span style="width:${Math.round(percent)}%"></span></div>
    </div>`;
}

export function requestFlow(status) {
  const steps = [
    ["draft", "مسودة"],
    ["sent", "أُرسل"],
    ["reviewing", "قيد المراجعة"],
    ["interested", "مهتم"],
    ["meeting", "اجتماع"],
    ["agreed", "اتفاق"]
  ];
  const order = steps.map(([key]) => key);
  const currentIndex = order.indexOf(status);
  if (["declined", "closed"].includes(status)) {
    return `<div class="request-status-flow"><span class="flow-pill is-current">${status === "declined" ? "اعتذار" : "مغلق"}</span></div>`;
  }
  return `
    <div class="request-status-flow" aria-label="مسار الطلب">
      ${steps
        .map(([key, label], index) => {
          const className = index < currentIndex ? " is-done" : index === currentIndex ? " is-current" : "";
          return `<span class="flow-pill${className}">${label}</span>`;
        })
        .join("")}
    </div>`;
}

export function infoPanel(text, { tone = "", iconName = "info" } = {}) {
  return `<div class="info-panel${tone ? ` is-${tone}` : ""}">${icon(iconName, { size: 16 })} <span>${text}</span></div>`;
}

export function note(title, text, { tone = "", iconName = "info" } = {}) {
  return `
    <div class="note-strip${tone ? ` is-${tone}` : ""}">
      ${icon(iconName, { size: 18 })}
      <div>${title ? `<strong>${title}</strong> ` : ""}${text}</div>
    </div>`;
}

export function listRow({ iconName = "info", title = "", text = "", meta = "", side = "", tone = "" }) {
  return `
    <div class="list-row">
      <span class="list-row-icon${tone ? ` is-${tone}` : ""}">${icon(iconName, { size: 18 })}</span>
      <div class="list-row-main">
        <strong>${title}</strong>
        ${text ? `<p>${text}</p>` : ""}
        ${meta ? `<div class="meta-line">${meta}</div>` : ""}
      </div>
      ${side ? `<div class="list-row-side">${side}</div>` : ""}
    </div>`;
}
