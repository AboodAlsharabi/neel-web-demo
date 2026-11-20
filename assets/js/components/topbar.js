import { getNotifications, getUnreadNotificationCount } from "../store.js";
import { formatDateTime, escapeHtml } from "../utils.js";
import { icon } from "./icons.js";

export function renderTopbar(state, role, pageTitle = "", pathname = "") {
  const notifications = getNotifications(state, role);
  const unread = getUnreadNotificationCount(state, role);
  const latest = notifications.slice(0, 5);
  const roleName = role === "association" ? "جمعية" : "جهة داعمة";
  const roleIcon = role === "association" ? "building-2" : "heart-handshake";

  return `
    <header class="dashboard-topbar">
      <div class="topbar-inner">
        <div class="topbar-start">
          <button type="button" class="icon-btn-plain topbar-menu" data-action="toggle-sidebar" aria-controls="app-sidebar" aria-expanded="false" aria-label="فتح القائمة">
            ${icon("menu", { size: 20 })}
          </button>
          <div class="topbar-title">
            <span>لوحة ${roleName}</span>
            ${icon("chevron-left", { size: 14 })}
            <strong>${escapeHtml(pageTitle || "نظرة عامة")}</strong>
          </div>
        </div>
        <div class="topbar-actions">
          <span class="role-chip${role === "supporter" ? " is-supporter" : ""}">${icon(roleIcon, { size: 14 })} ${roleName}</span>
          <a class="topbar-link" href="./index.html">${icon("home", { size: 15 })}<span>الرئيسية</span></a>
          <a class="topbar-link" href="./demo.html">${icon("log-out", { size: 15 })}<span>تبديل الدور</span></a>
          <details class="menu notif-menu">
            <summary class="notif-trigger" aria-label="التنبيهات${unread ? `، ${unread} غير مقروء` : ""}">
              ${icon("bell", { size: 18 })}
              ${unread ? `<span class="notif-count">${unread}</span>` : ""}
            </summary>
            <div class="menu-panel">
              <div class="menu-panel-head">
                <strong>التنبيهات</strong>
                <a class="link-more" href="#/${role}/notifications">عرض الكل ${icon("chevron-left", { size: 13 })}</a>
              </div>
              <div class="menu-panel-list">
                ${
                  latest.length
                    ? latest
                        .map(
                          (notification) => `
                            <a class="menu-item" href="${notification.link || `#/${role}/notifications`}" data-notification-link data-notification-id="${notification.id}">
                              <strong>${notification.read ? "" : "● "}${escapeHtml(notification.title)}</strong>
                              <span>${escapeHtml(notification.description)}</span>
                              <span>${formatDateTime(notification.createdAt)}</span>
                            </a>`
                        )
                        .join("")
                    : '<div class="menu-empty">لا توجد تنبيهات بعد.</div>'
                }
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>`;
}
