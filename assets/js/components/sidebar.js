import { NAV_GROUPS } from "../constants.js";
import { getUnreadNotificationCount } from "../store.js";
import { getRequestsForRole, needsAction } from "../services/requests.js";
import { logoMarkup } from "./logo.js";
import { icon } from "./icons.js";

function isActive(pathname, href) {
  if (pathname === href) return true;
  if (href.includes("?") || pathname.includes("?")) return false;
  return pathname.startsWith(`${href}/`);
}

export function renderSidebar(state, role, pathname = "") {
  const groups = NAV_GROUPS[role] || [];
  const unread = getUnreadNotificationCount(state, role);
  const actionCount = getRequestsForRole(state, role).filter((request) =>
    needsAction(request, role)
  ).length;

  const badgeValue = (badge) => {
    if (badge === "notifications") return unread;
    if (badge === "requests") return actionCount;
    return 0;
  };

  return `
    <aside class="app-sidebar" id="app-sidebar" aria-label="التنقل الرئيسي">
      <div class="sidebar-head">
        ${logoMarkup({ href: "./index.html" })}
        <button type="button" class="icon-btn-plain sidebar-close" data-action="close-sidebar" aria-label="إغلاق القائمة">
          ${icon("x", { size: 18 })}
        </button>
      </div>
      <nav class="side-nav">
        ${groups
          .map(
            (group) => `
              <div class="nav-group">
                <div class="nav-group-title">${group.title}</div>
                ${group.items
                  .map((item) => {
                    const count = item.badge ? badgeValue(item.badge) : 0;
                    return `
                      <a class="side-link${isActive(pathname, item.href) ? " is-active" : ""}" href="#${item.href}"${isActive(pathname, item.href) ? ' aria-current="page"' : ""}>
                        <span class="side-icon">${icon(item.icon, { size: 19 })}</span>
                        <span class="side-text">${item.label}</span>
                        ${count > 0 ? `<span class="side-badge">${count}</span>` : ""}
                      </a>`;
                  })
                  .join("")}
              </div>`
          )
          .join("")}
      </nav>
      <div class="sidebar-foot">
        <div class="sidebar-note">
          ${icon("database", { size: 15 })}
          <span>بيانات المحاكاة محفوظة في هذا المتصفح فقط ويمكن إعادة ضبطها من الإعدادات.</span>
        </div>
        <a class="sidebar-home-link" href="./index.html">${icon("home", { size: 14 })} العودة إلى الصفحة الرئيسية</a>
      </div>
    </aside>`;
}
