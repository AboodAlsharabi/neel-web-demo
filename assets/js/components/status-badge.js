import { CONTRIBUTION_STATES, COVERAGE_STATUSES, PRIORITIES, REQUEST_STATUSES } from "../constants.js";
import { icon } from "./icons.js";

export function badge(label, tone = "neutral", iconName = "") {
  const toneClass = tone && tone !== "neutral" ? ` is-${tone}` : "";
  return `<span class="badge${toneClass}">${iconName ? icon(iconName, { size: 13 }) : ""}${label}</span>`;
}

export function requestBadge(status) {
  const meta = REQUEST_STATUSES[status] || REQUEST_STATUSES.draft;
  return badge(meta.label, meta.tone, meta.icon);
}

export function coverageBadge(status) {
  const meta = COVERAGE_STATUSES[status] || COVERAGE_STATUSES.uncovered;
  return badge(meta.label, meta.tone, meta.icon);
}

export function priorityBadge(priority) {
  const meta = PRIORITIES[priority] || PRIORITIES.medium;
  return badge(meta.label, meta.tone);
}

export function contributionBadge(state) {
  const meta = CONTRIBUTION_STATES[state] || CONTRIBUTION_STATES.not_started;
  return badge(meta.label, meta.tone);
}

export function projectStatusBadge(status) {
  if (status === "published") return badge("منشور تجريبيًا", "success", "check-circle");
  if (status === "draft") return badge("مسودة", "neutral", "file-text");
  if (status === "closed") return badge("مغلق", "neutral", "archive");
  return badge(status || "غير محدد", "neutral");
}

export function matchBadge(label, tone = "success") {
  const iconName = tone === "success" ? "sparkles" : tone === "info" ? "check-circle" : "alert-circle";
  return `<span class="match-label${tone === "info" ? " is-medium" : tone === "warning" ? " is-low" : ""}">${icon(iconName, { size: 12 })}${label}</span>`;
}

export function demoBadge(label = "بيانات تجريبية") {
  return `<span class="demo-tag">${label}</span>`;
}
