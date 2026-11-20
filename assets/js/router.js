import {
  getSession,
  getState,
  isTourDismissed,
  markNotificationRead,
  setSession
} from "./store.js";
import { navigateTo, scrollMainTop } from "./utils.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderTopbar } from "./components/topbar.js";
import { logoMarkup } from "./components/logo.js";
import { icon } from "./components/icons.js";
import { emptyState } from "./components/ui.js";
import { showToast } from "./components/toast.js";
import { startTour } from "./components/tour.js";
import { openModal, closeModal } from "./components/modal.js";

import { renderAssociationOverview } from "./views/association/overview.js";
import { renderAssociationProjects } from "./views/association/projects.js";
import { renderAssociationProjectNew } from "./views/association/project-new.js";
import { renderAssociationProjectDetail } from "./views/association/project-detail.js";
import { renderAssociationNeeds } from "./views/association/needs.js";
import { renderAssociationPartners } from "./views/association/partners.js";
import { renderAssociationAgent } from "./views/association/agent.js";
import { renderAssociationRequests } from "./views/association/requests.js";
import { renderAssociationAlliances } from "./views/association/alliances.js";
import { renderAssociationStories } from "./views/association/stories.js";
import { renderAssociationOutcomes } from "./views/association/outcomes.js";
import { renderAssociationProfile } from "./views/association/profile.js";

import { renderSupporterOverview } from "./views/supporter/overview.js";
import { renderSupporterDiscover } from "./views/supporter/discover.js";
import { renderSupporterProjectDetail } from "./views/supporter/project-detail.js";
import { renderSupporterRecommendations } from "./views/supporter/recommendations.js";
import { renderSupporterRequests } from "./views/supporter/requests.js";
import { renderSupporterContributions } from "./views/supporter/contributions.js";
import { renderSupporterAlliances } from "./views/supporter/alliances.js";
import { renderSupporterImpact } from "./views/supporter/impact.js";
import { renderSupporterSaved } from "./views/supporter/saved.js";
import { renderSupporterProfile } from "./views/supporter/profile.js";

import { renderNotifications } from "./views/shared/notifications.js";
import { renderSettings } from "./views/shared/settings.js";
import { renderMessages } from "./views/shared/messages.js";

const ASSOCIATION_ROUTES = {
  overview: renderAssociationOverview,
  projects: renderAssociationProjects,
  needs: renderAssociationNeeds,
  partners: renderAssociationPartners,
  agent: renderAssociationAgent,
  requests: renderAssociationRequests,
  alliances: renderAssociationAlliances,
  stories: renderAssociationStories,
  outcomes: renderAssociationOutcomes,
  profile: renderAssociationProfile,
  notifications: renderNotifications,
  settings: renderSettings,
  messages: renderMessages
};

const SUPPORTER_ROUTES = {
  overview: renderSupporterOverview,
  discover: renderSupporterDiscover,
  recommendations: renderSupporterRecommendations,
  requests: renderSupporterRequests,
  contributions: renderSupporterContributions,
  alliances: renderSupporterAlliances,
  impact: renderSupporterImpact,
  saved: renderSupporterSaved,
  profile: renderSupporterProfile,
  notifications: renderNotifications,
  settings: renderSettings,
  messages: renderMessages
};

const touredRoles = new Set();
let initialized = false;
let sidebarKeyHandler = null;

function parseLocation() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryString = ""] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  return {
    raw,
    segments,
    pathPart: `/${segments.join("/")}`,
    query: Object.fromEntries(new URLSearchParams(queryString).entries())
  };
}

function resolveView(role, segments) {
  const page = segments[1] || "overview";
  if (role === "association") {
    if (page === "projects") {
      const sub = segments[2];
      if (sub === "new") return { render: renderAssociationProjectNew, params: {} };
      if (sub) return { render: renderAssociationProjectDetail, params: { id: sub } };
      return { render: ASSOCIATION_ROUTES.projects, params: {} };
    }
    const render = ASSOCIATION_ROUTES[page];
    return render ? { render, params: {} } : null;
  }
  if (role === "supporter") {
    if (page === "projects") {
      if (segments[2]) return { render: renderSupporterProjectDetail, params: { id: segments[2] } };
      return null;
    }
    const render = SUPPORTER_ROUTES[page];
    return render ? { render, params: {} } : null;
  }
  return null;
}

function renderRoleGuard(requestedRole, currentRole) {
  const root = document.getElementById("app-root");
  if (!root) return;
  const requestedName = requestedRole === "association" ? "الجمعية" : "الجهة الداعمة";
  root.innerHTML = `
    <div class="role-guard">
      ${logoMarkup({ href: "./index.html" })}
      <span class="role-guard-icon">${icon("lock", { size: 26 })}</span>
      <h1>هذا المسار مخصص لدور آخر</h1>
      <p>أنت الآن في تجربة <strong>${currentRole === "association" ? "الجمعية" : "الجهة الداعمة"}</strong>، بينما الرابط يطلب تجربة <strong>${requestedName}</strong>. لحماية سياق المحاكاة، لن نعرض شاشة الدور الآخر دون تبديل صريح.</p>
      <div class="role-guard-actions">
        <a class="btn btn-primary" href="#/${currentRole}/overview">العودة إلى لوحتي</a>
        <button type="button" class="btn btn-outline" data-switch-guard="${requestedRole}">تبديل إلى ${requestedName}</button>
      </div>
      <p class="muted micro">تبديل الدور تجريبي فقط وليس مصادقة أمنية. البيانات محفوظة في هذا المتصفح.</p>
    </div>`;
  document.title = "مسار غير متاح — نيل";
  root.querySelector("[data-switch-guard]")?.addEventListener("click", () => {
    setSession(requestedRole);
    navigateTo(`/${requestedRole}/overview`);
  });
}

function renderShell({ role, viewResult, pageTitle, pathPart, state }) {
  const root = document.getElementById("app-root");
  if (!root) return;
  const html = viewResult?.html || "";
  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar(state, role, pathPart)}
      <div class="mobile-backdrop" data-sidebar-backdrop></div>
      <div class="app-main-wrap">
        ${renderTopbar(state, role, pageTitle, pathPart)}
        <main class="app-main" id="app-main" tabindex="-1">
          <div class="view-root" data-view-root>${html}</div>
        </main>
        <footer class="app-footer">
          <span>نيل — محاكاة تجريبية محلية لربط احتياجات الشباب بالجهات الداعمة.</span>
          <span>لا مدفوعات · لا إرسال بريد · لا ذكاء اصطناعي خارجي</span>
        </footer>
      </div>
    </div>`;
}

function bindShell() {
  const shell = document.querySelector(".app-shell");
  const backdrop = document.querySelector("[data-sidebar-backdrop]");
  const menuButton = document.querySelector('[data-action="toggle-sidebar"]');

  const setSidebar = (open) => {
    shell?.classList.toggle("sidebar-open", open);
    menuButton?.setAttribute("aria-expanded", String(open));
  };

  menuButton?.addEventListener("click", () => {
    setSidebar(!shell.classList.contains("sidebar-open"));
  });
  document.querySelector("[data-action=\"close-sidebar\"]")?.addEventListener("click", () => setSidebar(false));
  backdrop?.addEventListener("click", () => setSidebar(false));

  const root = document.getElementById("app-root");
  if (root) {
    root.onclick = (event) => {
      const notificationLink = event.target.closest("[data-notification-link]");
      if (notificationLink) {
        event.preventDefault();
        const id = notificationLink.dataset.notificationId;
        if (id) markNotificationRead(id, { silent: true });
        navigateTo(notificationLink.getAttribute("href"));
        return;
      }
      const sideLink = event.target.closest(".side-link");
      if (sideLink && window.innerWidth <= 1024) setSidebar(false);
    };
  }

  if (sidebarKeyHandler) document.removeEventListener("keydown", sidebarKeyHandler);
  sidebarKeyHandler = (event) => {
    if (event.key === "Escape" && shell?.classList.contains("sidebar-open")) {
      setSidebar(false);
    }
  };
  document.addEventListener("keydown", sidebarKeyHandler);
}

function renderNotFound(role, state) {
  return {
    title: "الصفحة غير موجودة",
    html: emptyState({
      iconName: "circle-help",
      title: "لم نجد هذه الصفحة",
      description: "الرابط غير معروف داخل المحاكاة. يمكنك العودة إلى لوحة التحكم أو استخدام القائمة.",
      action: `<a class="btn btn-primary" href="#/${role}/overview">العودة إلى النظرة العامة</a>`
    }),
    mount() {}
  };
}

export function renderApp({ isRouteChange = false } = {}) {
  const state = getState();
  const session = getSession();
  if (!session) {
    window.location.replace("./demo.html");
    return;
  }

  const location = parseLocation();
  const requestedRole = location.segments[0];
  if (!requestedRole || (requestedRole !== "association" && requestedRole !== "supporter")) {
    window.location.replace(`#/${session.role}/overview`);
    return;
  }

  if (requestedRole !== session.role) {
    closeModal();
    renderRoleGuard(requestedRole, session.role);
    return;
  }

  const resolved = resolveView(session.role, location.segments) || { render: () => renderNotFound(session.role, state), params: {} };
  let viewResult;
  try {
    viewResult = resolved.render({
      state,
      role: session.role,
      params: resolved.params || {},
      query: location.query,
      path: location.pathPart
    });
  } catch (error) {
    console.error(error);
    viewResult = {
      title: "خطأ في العرض",
      html: emptyState({
        iconName: "alert-triangle",
        title: "تعذر عرض الصفحة",
        description: "حدث خطأ غير متوقع في هذه المحاكاة. راجع وحدة التحكم أو أعد تحميل الصفحة.",
        action: `<a class="btn btn-primary" href="#/${session.role}/overview">العودة إلى النظرة العامة</a>`
      }),
      mount() {}
    };
  }

  const pageTitle = viewResult.title || "لوحة التحكم";
  renderShell({
    role: session.role,
    viewResult,
    pageTitle,
    pathPart: location.pathPart,
    state
  });

  bindShell();

  const root = document.querySelector("[data-view-root]");
  try {
    viewResult.mount?.(root);
  } catch (error) {
    console.error(error);
    showToast("حدث خطأ أثناء تفعيل عناصر الصفحة. أعد تحميل الصفحة.", { title: "خطأ في الصفحة", tone: "danger" });
  }

  document.title = `${pageTitle} — نيل`;

  if (isRouteChange) {
    closeModal();
    scrollMainTop();
    document.getElementById("app-main")?.focus({ preventScroll: true });
  }

  if (!touredRoles.has(session.role)) {
    touredRoles.add(session.role);
    if (!isTourDismissed(session.role)) {
      window.setTimeout(() => startTour(session.role), 700);
    }
  }
}

export function bootApp() {
  if (initialized) return;
  initialized = true;

  renderApp({ isRouteChange: true });

  window.addEventListener("hashchange", () => {
    renderApp({ isRouteChange: true });
  });

  window.addEventListener("neel:state-change", () => {
    const scrollY = window.scrollY;
    renderApp({ isRouteChange: false });
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  });
}
