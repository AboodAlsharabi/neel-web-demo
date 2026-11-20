import { commit, getState } from "../../store.js";
import {
  addMessageToRequest,
  getRequestById,
  getRequestCounterpartName,
  getRequestMessagesForRole,
  getRequestsForRole,
  needsAction
} from "../../services/requests.js";
import { getProjectById, getRequestMessages } from "../../services/projects.js";
import {
  escapeHtml,
  formatDate,
  formatDateTime,
  formatNumber,
  navigateTo,
  normalizeArabic
} from "../../utils.js";
import { pageHeader, emptyState, requestFlow, avatar } from "../../components/ui.js";
import { badge, demoBadge, requestBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";

export function renderMessages(ctx) {
  const { state, role } = ctx;
  const query = ctx.query || {};
  const allRequests = getRequestsForRole(state, role)
    .slice()
    .sort((a, b) => {
      const aLast = getRequestMessages(state, a.id).slice(-1)[0];
      const bLast = getRequestMessages(state, b.id).slice(-1)[0];
      return new Date(bLast?.createdAt || b.updatedAt || b.createdAt) - new Date(aLast?.createdAt || a.updatedAt || a.createdAt);
    });

  const conversations = allRequests
    .map((request) => ({
      request,
      messages: getRequestMessages(state, request.id),
      lastMessage: getRequestMessages(state, request.id).slice(-1)[0] || null
    }))
    .filter((conversation) => conversation.messages.length > 0);

  const selected =
    conversations.find((conversation) => conversation.request.id === query.request) ||
    conversations[0] ||
    null;

  return {
    title: "الرسائل",
    html: `
      ${pageHeader({
        eyebrow: "التعاون",
        title: "الرسائل",
        description: "محادثات مرتبطة بالطلبات والاحتياجات. كل رسالة محفوظة في هذا المتصفح فقط ولا تُرسل خارج المحاكاة.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>${formatNumber(conversations.length)} محادثة نشطة</span>`,
        actions: `<a class="btn btn-outline" href="#/${role}/requests">${icon("inbox", { size: 16 })} كل الطلبات</a>`
      })}

      ${
        conversations.length
          ? `<div class="inbox-layout messages-layout">
              <section class="inbox-list-pane">
                <div class="inbox-toolbar">
                  <div class="filter-search">
                    ${icon("search", { size: 17 })}
                    <input class="input" type="search" placeholder="ابحث في المحادثات" data-conversation-search aria-label="بحث في المحادثات">
                  </div>
                </div>
                <div class="request-list">
                  ${conversations
                    .map((conversation) => {
                      const counterpart = getRequestCounterpartName(state, conversation.request, role);
                      const need = state.needs.find((item) => item.id === conversation.request.needId);
                      return `
                        <a class="request-list-item${selected?.request.id === conversation.request.id ? " is-active" : ""}" href="#/${role}/messages?request=${encodeURIComponent(conversation.request.id)}" data-conversation-item data-search="${escapeHtml(normalizeArabic(`${counterpart} ${need?.title || ""} ${conversation.lastMessage?.body || ""}`))}">
                          <span class="request-list-avatar">${avatar(counterpart, { size: "sm" })}</span>
                          <span class="request-list-main">
                            <span class="spread">
                              <strong>${escapeHtml(counterpart)}</strong>
                              <time>${formatDate(conversation.lastMessage?.createdAt)}</time>
                            </span>
                            <span class="request-list-need">${escapeHtml(need?.title || "احتياج")}</span>
                            <span class="request-list-preview">${conversation.lastMessage?.senderRole === role ? "أنت: " : ""}${escapeHtml(conversation.lastMessage?.body || "لا رسائل")}</span>
                            <span class="cluster">
                              ${requestBadge(conversation.request.status)}
                              ${needsAction(conversation.request, role) ? badge("يحتاج إجراءً", "brand") : ""}
                              <span class="muted micro">${formatNumber(conversation.messages.length)} رسالة</span>
                            </span>
                          </span>
                        </a>`;
                    })
                    .join("")}
                </div>
                <div class="search-empty" data-search-empty hidden>
                  ${emptyState({ iconName: "search", title: "لا محادثات مطابقة", description: "جرّب كلمة أخرى أو امسح البحث." })}
                </div>
              </section>
              <section class="inbox-detail-pane">
                ${selected ? renderConversation(state, role, selected) : ""}
              </section>
            </div>`
          : emptyState({
              iconName: "message-square",
              title: "لا توجد محادثات بعد",
              description: "ستظهر المحادثات هنا بعد إرسال طلب تعاون أو رسالة. ابدأ من صفحة الطلبات أو الاحتياجات.",
              action: `<a class="btn btn-outline" href="#/${role}/requests">${icon("inbox", { size: 16 })} فتح الطلبات</a>`
            })
      }
    `,
    mount(root) {
      const search = root.querySelector("[data-conversation-search]");
      const items = [...root.querySelectorAll("[data-conversation-item]")];
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

      if (!selected) return;
      const detail = root.querySelector("[data-conversation]");
      const form = detail?.querySelector("[data-message-form]");
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
          addMessageToRequest(currentState, selected.request.id, role, text);
        });
        showToast("أُضيفت الرسالة إلى المحادثة داخل المحاكاة.", { title: "تم الإرسال", tone: "success" });
      });
    }
  };
}

function renderConversation(state, role, conversation) {
  const request = conversation.request;
  const project = getProjectById(state, request.projectId);
  const need = state.needs.find((item) => item.id === request.needId);
  const counterpart = getRequestCounterpartName(state, request, role);
  const messages = getRequestMessagesForRole(state, request.id);

  return `
    <div class="request-detail" data-conversation data-request-id="${request.id}">
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
          <a class="btn btn-outline btn-sm" href="#/${role}/requests?request=${encodeURIComponent(request.id)}">${icon("inbox", { size: 14 })} تفاصيل الطلب</a>
        </div>
      </div>
      <div class="request-detail-meta">
        <span>${icon("calendar", { size: 14 })} أُنشئ ${formatDate(request.createdAt)}</span>
        <span>${icon("clock", { size: 14 })} آخر رسالة ${formatDateTime(conversation.lastMessage?.createdAt)}</span>
        <a class="link-more" href="#/${role}/projects/${request.projectId}">فتح المشروع ${icon("chevron-left", { size: 13 })}</a>
      </div>
      <div class="request-flow-wrap">${requestFlow(request.status)}</div>

      <div class="request-message-box" style="margin-block-start:12px">
        <div class="message-thread">
          ${messages
            .map(
              (message) => `
                <div class="message-bubble is-${message.senderRole}">
                  <div class="message-meta">
                    <strong>${message.senderRole === "association" ? (role === "association" ? "أنت (الجمعية)" : counterpart) : role === "supporter" ? "أنت (الجهة الداعمة)" : counterpart}</strong>
                    <time>${formatDateTime(message.createdAt)}</time>
                  </div>
                  <p>${escapeHtml(message.body)}</p>
                </div>`
            )
            .join("")}
        </div>
        <form class="message-composer" data-message-form novalidate>
          <label class="sr-only" for="conversation-message-body">نص الرسالة</label>
          <textarea class="textarea" id="conversation-message-body" rows="2" placeholder="اكتب رسالة داخل المحاكاة…" data-message-body></textarea>
          <button type="submit" class="btn btn-primary">${icon("send", { size: 15 })} إرسال</button>
        </form>
        <p class="muted micro">لا تُرسل الرسائل خارج الموقع. تظهر في صندوق الدور الآخر داخل المتصفح نفسه.</p>
      </div>
    </div>`;
}
