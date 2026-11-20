import { commit, getCurrentOrganization, getState } from "../../store.js";
import {
  addMessageToRequest,
  getIncomingRequests,
  getOutgoingRequests,
  getRequestContribution,
  getRequestCounterpartName,
  getRequestMessagesForRole,
  getRequestById,
  getRequestsForRole,
  needsAction,
  sendRequest,
  updateRequestStatus
} from "../../services/requests.js";
import { getProjectById, getRequestMessages } from "../../services/projects.js";
import { REQUEST_STATUSES } from "../../constants.js";
import {
  escapeHtml,
  formatDate,
  formatDateTime,
  formatNumber,
  formatQty,
  navigateTo,
  normalizeArabic
} from "../../utils.js";
import { pageHeader, emptyState, requestFlow, avatar } from "../../components/ui.js";
import { badge, contributionBadge, demoBadge, requestBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";
import { confirmDialog } from "../../components/modal.js";

export function renderAssociationRequests(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const query = ctx.query || {};
  const statusFilter = query.status || "all";
  const directionFilter = query.direction || "all";
  const projectFilter = query.project || "all";
  const needFilter = query.need || "all";

  const allRequests = getRequestsForRole(state, "association").filter((request) => {
    if (projectFilter !== "all" && request.projectId !== projectFilter) return false;
    if (needFilter !== "all" && request.needId !== needFilter) return false;
    return true;
  });

  const requests = allRequests
    .filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (directionFilter === "incoming" && request.initiatedBy !== "supporter") return false;
      if (directionFilter === "outgoing" && request.initiatedBy !== "association") return false;
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  const selectedRequest =
    getRequestById(state, query.request) ||
    null;

  const incomingCount = getIncomingRequests(state, "association").filter((request) => needsAction(request, "association")).length;
  const waitingCount = allRequests.filter((request) => ["sent", "reviewing"].includes(request.status)).length;
  const draftCount = allRequests.filter((request) => request.status === "draft").length;

  const projects = state.projects.filter((project) => project.organizationId === organization.id);

  return {
    title: "طلبات التعاون",
    html: `
      ${pageHeader({
        eyebrow: "التعاون",
        title: "طلبات التعاون",
        description: "كل طلب مرتبط بمشروع واحتياج وجهة محددة. الحالة والرسائل محفوظة محليًا، ولا يُرسل بريد أو واتساب.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>${formatNumber(allRequests.length)} طلبًا</span>`,
        actions: `<a class="btn btn-outline" href="#/association/alliances">${icon("handshake", { size: 16 })} الشراكات والمساهمات</a>`
      })}

      <div class="stat-grid stat-grid-3">
        ${[
          ["inbox", "ردود تحتاج إجراءً", incomingCount, "brand"],
          ["clock", "بانتظار رد الجهة", waitingCount, "info"],
          ["file-text", "مسودات", draftCount, "warning"]
        ]
          .map(
            ([iconName, label, value, tone]) => `
              <article class="stat-card">
                <div class="stat-top"><span class="stat-icon is-${tone}">${icon(iconName, { size: 19 })}</span></div>
                <div class="stat-value">${formatNumber(value)}</div>
                <div class="stat-label">${label}</div>
              </article>`
          )
          .join("")}
      </div>

      <div class="inbox-layout">
        <section class="inbox-list-pane">
          <div class="inbox-toolbar">
            <div class="filter-search">
              ${icon("search", { size: 17 })}
              <input class="input" type="search" placeholder="ابحث في الطلبات" data-request-search aria-label="بحث في الطلبات">
            </div>
            <div class="filter-controls">
              <label class="select-wrap">
                <span class="sr-only">الاتجاه</span>
                <select class="select" data-request-filter="direction">
                  <option value="all">الكل</option>
                  <option value="incoming"${directionFilter === "incoming" ? " selected" : ""}>واردة</option>
                  <option value="outgoing"${directionFilter === "outgoing" ? " selected" : ""}>صادرة</option>
                </select>
              </label>
              <label class="select-wrap">
                <span class="sr-only">الحالة</span>
                <select class="select" data-request-filter="status">
                  <option value="all">كل الحالات</option>
                  ${Object.values(REQUEST_STATUSES).map((status) => `<option value="${status.key}"${statusFilter === status.key ? " selected" : ""}>${status.label}</option>`).join("")}
                </select>
              </label>
            </div>
          </div>
          ${
            projectFilter !== "all" || needFilter !== "all"
              ? `<div class="active-filter-strip">
                  ${icon("filter", { size: 14 })}
                  <span>${needFilter !== "all" ? "مرشح حسب احتياج محدد" : "مرشح حسب مشروع محدد"}</span>
                  <a class="link-more" href="#/association/requests">مسح ${icon("x", { size: 12 })}</a>
                </div>`
              : ""
          }
          <div class="request-list" data-request-list>
            ${
              requests.length
                ? requests
                    .map((request) => {
                      const project = getProjectById(state, request.projectId);
                      const need = state.needs.find((item) => item.id === request.needId);
                      const lastMessage = getRequestMessages(state, request.id).slice(-1)[0];
                      const counterpart = getRequestCounterpartName(state, request, "association");
                      return `
                        <a class="request-list-item${selectedRequest?.id === request.id ? " is-active" : ""}" href="#/association/requests?${new URLSearchParams({ ...query, request: request.id }).toString()}" data-request-item data-search="${escapeHtml(normalizeArabic(`${counterpart} ${need?.title || ""} ${project?.title || ""} ${request.message || ""}`))}">
                          <span class="request-list-avatar">${avatar(counterpart, { size: "sm" })}</span>
                          <span class="request-list-main">
                            <span class="spread">
                              <strong>${escapeHtml(counterpart)}</strong>
                              <time>${formatDate(lastMessage?.createdAt || request.updatedAt || request.createdAt)}</time>
                            </span>
                            <span class="request-list-need">${escapeHtml(need?.title || "احتياج")}</span>
                            <span class="request-list-preview">${escapeHtml(lastMessage?.body || request.message || "لا توجد رسالة بعد")}</span>
                            <span class="cluster">
                              ${requestBadge(request.status)}
                              ${request.initiatedBy === "supporter" ? badge("واردة", "outline") : badge("صادرة", "outline")}
                              ${needsAction(request, "association") ? badge("يحتاج إجراءً", "brand") : ""}
                            </span>
                          </span>
                        </a>`;
                    })
                    .join("")
                : emptyState({
                    iconName: "inbox",
                    title: "لا توجد طلبات مطابقة",
                    description: "جرّب تغيير الفلاتر، أو ابدأ طلبًا من صفحة الاحتياجات."
                  })
            }
          </div>
          <div class="search-empty" data-search-empty hidden>
            ${emptyState({ iconName: "search", title: "لا نتائج لهذا البحث", description: "جرّب كلمة أخرى أو امسح البحث." })}
          </div>
        </section>

        <section class="inbox-detail-pane">
          ${
            selectedRequest
              ? renderRequestDetail(state, selectedRequest)
              : `<div class="inbox-placeholder">
                  <span class="inbox-placeholder-icon">${icon("message-square", { size: 26 })}</span>
                  <h2>اختر طلبًا لعرض التفاصيل</h2>
                  <p>ستظهر هنا الحالة والرسائل والخطوات التالية، مع إمكانية إرسال رسالة داخل المحاكاة.</p>
                  ${requests[0] ? `<a class="btn btn-outline" href="#/association/requests?${new URLSearchParams({ ...query, request: requests[0].id }).toString()}">فتح أحدث طلب</a>` : ""}
                </div>`
          }
        </section>
      </div>
    `,
    mount(root) {
      const search = root.querySelector("[data-request-search]");
      const items = [...root.querySelectorAll("[data-request-item]")];
      const empty = root.querySelector("[data-search-empty]");
      search?.addEventListener("input", () => {
        const value = normalizeArabic(search.value || "");
        let visible = 0;
        items.forEach((item) => {
          const matches = !value || item.dataset.search.includes(value);
          item.hidden = !matches;
          if (matches) visible += 1;
        });
        if (empty) empty.hidden = visible > 0 || !value;
      });
      root.querySelectorAll("[data-request-filter]").forEach((select) => {
        select.addEventListener("change", () => {
          const next = { ...query, [select.dataset.requestFilter]: select.value };
          delete next.request;
          const params = new URLSearchParams();
          Object.entries(next).forEach(([key, value]) => {
            if (value && value !== "all") params.set(key, value);
          });
          navigateTo(`/association/requests${params.toString() ? `?${params.toString()}` : ""}`);
        });
      });

      if (selectedRequest) mountRequestDetail(root, state, selectedRequest);
    }
  };
}

function renderRequestDetail(state, request) {
  const project = getProjectById(state, request.projectId);
  const need = state.needs.find((item) => item.id === request.needId);
  const counterpart = getRequestCounterpartName(state, request, "association");
  const messages = getRequestMessagesForRole(state, request.id);
  const contribution = getRequestContribution(state, request.id);
  const canSend = request.status === "draft";
  const canClose = !["closed", "declined"].includes(request.status);
  const canMeeting = ["interested"].includes(request.status);
  const canDecline = ["interested", "meeting"].includes(request.status);

  return `
    <div class="request-detail" data-request-detail data-request-id="${request.id}">
      <div class="request-detail-head">
        <div class="cluster">
          ${avatar(counterpart)}
          <div>
            <h2>${escapeHtml(counterpart)}</h2>
            <p>${escapeHtml(project?.title || "مشروع")} · ${escapeHtml(need?.title || "احتياج")}</p>
          </div>
        </div>
        <div class="cluster">
          ${requestBadge(request.status)}
          ${request.initiatedBy === "supporter" ? badge("طلب وارد", "outline") : badge("طلب صادر", "outline")}
        </div>
      </div>
      <div class="request-detail-meta">
        <span>${icon("calendar", { size: 14 })} أُنشئ ${formatDate(request.createdAt)}</span>
        <span>${icon("clock", { size: 14 })} آخر تواصل ${formatDateTime(request.lastContactAt || request.updatedAt)}</span>
        <a class="link-more" href="#/association/projects/${request.projectId}">فتح المشروع ${icon("chevron-left", { size: 13 })}</a>
      </div>
      <div class="request-flow-wrap">${requestFlow(request.status)}</div>

      <div class="request-detail-grid">
        <div class="request-need-summary">
          <span class="field-label">الاحتياج المرتبط</span>
          <h3>${escapeHtml(need?.title || "احتياج")}</h3>
          ${need?.details ? `<p>${escapeHtml(need.details)}</p>` : ""}
          <div class="meta-line">
            ${badge(need?.requiredQuantity != null ? formatQty(need.requiredQuantity, need.unit) : "تعهد وصفي", "outline")}
            ${contribution ? contributionBadge(contribution.state) : ""}
          </div>
          ${
            contribution
              ? `<div class="contribution-line" style="margin-block-start:10px">
                  <span>${icon("handshake", { size: 14 })} ${contribution.quantity != null ? formatQty(contribution.quantity, contribution.unit) : "تعهد وصفي"} · ${escapeHtml(contribution.description || "")}</span>
                  <a class="link-more" href="#/association/alliances">إدارة</a>
                </div>`
              : ""
          }
        </div>
        <div class="request-actions-box">
          <span class="field-label">إجراءات متاحة داخل المحاكاة</span>
          <div class="cluster">
            ${canSend ? `<button type="button" class="btn btn-primary btn-sm" data-action="send-draft">${icon("send", { size: 15 })} إرسال المسودة</button>` : ""}
            ${canMeeting ? `<button type="button" class="btn btn-secondary btn-sm" data-status="meeting">${icon("calendar", { size: 15 })} اقتراح اجتماع</button>` : ""}
            ${canDecline ? `<button type="button" class="btn btn-outline btn-sm" data-status="declined">${icon("x-circle", { size: 15 })} تسجيل اعتذار</button>` : ""}
            ${canClose ? `<button type="button" class="btn btn-ghost btn-sm" data-status="closed">${icon("archive", { size: 15 })} إغلاق الطلب</button>` : ""}
          </div>
          ${request.status === "draft" ? `<p class="muted micro" style="margin-block-start:8px">إرسال المسودة يضيف رسالة ويسجل تنبيهًا للجهة داخل المحاكاة، دون بريد حقيقي.</p>` : ""}
        </div>
      </div>

      <div class="request-message-box">
        <div class="spread" style="margin-block-end:10px">
          <h3>الرسائل (${formatNumber(messages.length)})</h3>
          <span class="muted micro">رسائل محاكاة فقط</span>
        </div>
        <div class="message-thread">
          ${
            messages.length
              ? messages
                  .map(
                    (message) => `
                      <div class="message-bubble is-${message.senderRole}">
                        <div class="message-meta">
                          <strong>${message.senderRole === "association" ? "الجمعية" : counterpart}</strong>
                          <time>${formatDateTime(message.createdAt)}</time>
                        </div>
                        <p>${escapeHtml(message.body)}</p>
                      </div>`
                  )
                  .join("")
              : `<div class="mini-empty compact">${icon("message-square", { size: 20 })}<div><strong>لا توجد رسائل بعد</strong><p>اكتب أول رسالة لمتابعة الطلب داخل المحاكاة.</p></div></div>`
          }
        </div>
        <form class="message-composer" data-message-form novalidate>
          <label class="sr-only" for="request-message-body">نص الرسالة</label>
          <textarea class="textarea" id="request-message-body" rows="2" placeholder="اكتب رسالة داخل المحاكاة…" data-message-body></textarea>
          <button type="submit" class="btn btn-primary">${icon("send", { size: 15 })} إرسال</button>
        </form>
        <p class="muted micro">لن تُرسل رسالة خارج الموقع. تظهر في صندوق الرسائل للدور الآخر داخل المتصفح نفسه.</p>
      </div>
    </div>`;
}

function mountRequestDetail(root, state, request) {
  const detail = root.querySelector("[data-request-detail]");
  if (!detail) return;

  detail.querySelector('[data-action="send-draft"]')?.addEventListener("click", () => {
    commit((currentState) => {
      sendRequest(currentState, request.id);
    });
    showToast("أُرسل الطلب داخل المحاكاة، وسُجل تنبيه للجهة الداعمة.", { title: "تم الإرسال", tone: "success" });
  });

  detail.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextStatus = button.dataset.status;
      const label = REQUEST_STATUSES[nextStatus]?.label || nextStatus;
      const apply = () => {
        let result = null;
        commit((currentState) => {
          result = updateRequestStatus(currentState, request.id, nextStatus, "association");
        });
        if (result?.ok) {
          showToast(`أصبحت حالة الطلب: ${label}. وسيظهر تنبيه للجهة داخل المحاكاة.`, { title: "تم التحديث", tone: "success" });
        } else {
          showToast(result?.reason || "تعذر تحديث حالة الطلب.", { title: "لم يتم التحديث", tone: "warning" });
        }
      };
      if (nextStatus === "closed") {
        confirmDialog({
          title: "إغلاق طلب التعاون؟",
          message: "سيُغلق الطلب داخل المحاكاة ويمكنك متابعة الرسائل السابقة. لن تُحذف البيانات.",
          confirmLabel: "إغلاق الطلب",
          onConfirm: apply
        });
      } else {
        apply();
      }
    });
  });

  const form = detail.querySelector("[data-message-form]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const body = form.querySelector("[data-message-body]");
    const text = body.value.trim();
    if (text.length < 2) {
      body.focus();
      showToast("اكتب رسالة قصيرة أولًا.", { title: "الرسالة فارغة", tone: "warning" });
      return;
    }
    commit((currentState) => {
      addMessageToRequest(currentState, request.id, "association", text);
    });
    showToast("أُضيفت الرسالة إلى المحادثة داخل المحاكاة.", { title: "تم الإرسال", tone: "success" });
  });
}
