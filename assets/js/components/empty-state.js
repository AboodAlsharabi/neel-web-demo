import { icon } from "./icons.js";

export function emptyState({
  iconName = "inbox",
  title = "لا توجد بيانات بعد",
  description = "",
  action = "",
  compact = false
} = {}) {
  return `
    <div class="empty-state${compact ? " is-compact" : ""}">
      <div class="empty-state-icon">${icon(iconName, { size: 28 })}</div>
      <h3>${title}</h3>
      ${description ? `<p>${description}</p>` : ""}
      ${action}
    </div>`;
}
