import {
  commit,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../../store.js";
import { formatDateTime, navigateTo } from "../../utils.js";
import { pageHeader, emptyState } from "../../components/ui.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";

export function renderNotifications(ctx) {
  const { state, role } = ctx;
  const notifications = getNotifications(state, role);
  const unread = notifications.filter((item) => !item.read).length;

  return {
    title: "التنبيهات",
    html: `
      ${pageHeader({
        eyebrow: "المتابعة",
        title: "التنبيهات والمهام",
        description: "كل التنبيهات مرتبطة بنشاط داخل المحاكاة، ويمكن فتح الشاشة المرتبطة بها مباشرة.",
        actions: unread
          ? `<button type="button" class="btn btn-outline" data-action="mark-all-read">${icon("check", { size: 17 })} تعليم الكل كمقروء</button>`
          : ""
      })}
      <section class="card">
        <div class="card-head">
          <div>
            <h2>آخر التنبيهات</h2>
            <p>${notifications.length} تنبيهًا داخل المحاكاة</p>
          </div>
          <span class="badge ${unread ? "is-brand" : "is-outline"}">${unread ? `${unread} غير مقروء` : "لا جديد"}</span>
        </div>
        <div class="card-body">
          ${
            notifications.length
              ? `<div class="notifications-list">
                  ${notifications
                    .map(
                      (notification) => `
                        <article class="notification-row${notification.read ? "" : " is-unread"}">
                          <span class="notification-row-icon">${icon(notification.read ? "bell" : "bell", { size: 16 })}</span>
                          <div class="notification-row-body">
                            <strong>${notification.read ? "" : '<span class="text-brand">جديد · </span>'}${notification.title}</strong>
                            <p>${notification.description}</p>
                            <time datetime="${notification.createdAt}">${formatDateTime(notification.createdAt)}</time>
                          </div>
                          <a class="btn btn-outline btn-sm" href="${notification.link || `#/${role}/notifications`}" data-notification-link data-notification-id="${notification.id}">فتح</a>
                        </article>`
                    )
                    .join("")}
                </div>`
              : emptyState({
                  iconName: "bell",
                  title: "لا توجد تنبيهات بعد",
                  description: "ستظهر هنا تحديثات الطلبات والمساهمات عند استخدام المحاكاة."
                })
          }
        </div>
      </section>
    `,
    mount(root) {
      root.querySelector('[data-action="mark-all-read"]')?.addEventListener("click", () => {
        markAllNotificationsRead(role);
        showToast("تم تعليم جميع تنبيهات هذا الدور كمقروءة.", { title: "تم التحديث", tone: "success" });
      });

      root.addEventListener("click", (event) => {
        const link = event.target.closest("[data-notification-link]");
        if (!link) return;
        event.preventDefault();
        const id = link.dataset.notificationId;
        if (id) markNotificationRead(id, { silent: true });
        navigateTo(link.getAttribute("href"));
      });
    }
  };
}
