import { getCurrentSupporter, getState } from "../../store.js";
import { getSupporterProjects } from "../../services/projects.js";
import { getRequestsForRole } from "../../services/requests.js";
import {
  escapeHtml,
  formatDate,
  formatNumber,
  formatQty,
  truncate
} from "../../utils.js";
import { pageHeader, emptyState, progressBar } from "../../components/ui.js";
import { badge, demoBadge, requestBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";

export function renderSupporterAlliances() {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const projects = getSupporterProjects(state, supporter.id);
  const requests = getRequestsForRole(state, "supporter");
  const contributions = state.contributions.filter(
    (contribution) => contribution.supporterId === supporter.id && contribution.state !== "cancelled"
  );

  const organizations = [...new Set(projects.map((project) => project.organizationId))]
    .map((id) => state.organizations.find((organization) => organization.id === id))
    .filter(Boolean);

  const cards = projects
    .map((project) => {
      const projectContributions = contributions.filter((contribution) => contribution.projectId === project.id);
      const projectRequests = requests.filter((request) => request.projectId === project.id);
      const organization = state.organizations.find((item) => item.id === project.organizationId);
      const latestRequest = projectRequests[0] || null;
      return { project, organization, contributions: projectContributions, requests: projectRequests, latestRequest };
    })
    .sort((a, b) => b.contributions.length - a.contributions.length);

  return {
    title: "الشراكات المشتركة",
    html: `
      ${pageHeader({
        eyebrow: "التعاون",
        title: "الشراكات المشتركة",
        description: "المشاريع والجمعيات التي جمعتك بها مساهمة أو طلب تعاون. هذه شراكات محاكاة، وليست علاقات موقعة أو التزامات مالية.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>${formatNumber(organizations.length)} جهة</span><span class="meta-dot"></span><span>${formatNumber(projects.length)} مشروعًا</span>`
      })}

      <div class="stat-grid stat-grid-3">
        ${[
          ["building-2", "جهات تعاونت معها", organizations.length, "brand"],
          ["folder-open", "مشاريع مشتركة", projects.length, "info"],
          ["handshake", "مساهمات مسجلة", contributions.length, "success"]
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

      ${
        cards.length
          ? `<div class="alliance-grid">
              ${cards
                .map(
                  ({ project, organization, contributions: projectContributions, requests: projectRequests, latestRequest }) => {
                    const completed = projectContributions.filter((contribution) => contribution.state === "completed").length;
                    const total = projectContributions.length;
                    return `
                      <article class="alliance-card">
                        <div class="alliance-card-head">
                          <div class="cluster">
                            <span class="org-mark">${icon("building-2", { size: 20 })}</span>
                            <div>
                              <h2>${escapeHtml(organization?.name || "جمعية")}</h2>
                              <span>${escapeHtml(organization?.city || "")}</span>
                            </div>
                          </div>
                          ${badge(`${formatNumber(projectRequests.length)} طلبًا`, "outline")}
                        </div>
                        <div class="alliance-card-body">
                          <span class="muted micro">${escapeHtml(project.category)} · ${escapeHtml(project.region)}</span>
                          <h3><a class="plain-link" href="#/supporter/projects/${project.id}">${escapeHtml(project.title)}</a></h3>
                          <p class="alliance-desc">${escapeHtml(truncate(project.description, 120))}</p>
                          <div class="story-facts">
                            <div><strong>${formatNumber(total)}</strong><span>مساهمة</span></div>
                            <div><strong>${formatNumber(completed)}</strong><span>اكتملت</span></div>
                            <div><strong>${formatNumber(projectRequests.length)}</strong><span>طلب تعاون</span></div>
                          </div>
                          ${total ? progressBar(completed ? (completed / total) * 100 : 0, "success", "اكتمال مساهماتك", `${formatNumber(completed)}/${formatNumber(total)}`) : ""}
                          <div class="meta-line">
                            ${latestRequest ? requestBadge(latestRequest.status) : ""}
                            <span class="muted micro">${formatDate(latestRequest?.updatedAt || project.publishedAt)}</span>
                          </div>
                          <div class="tag-row">
                            ${projectContributions.slice(0, 3).map((contribution) => badge(contribution.quantity != null ? formatQty(contribution.quantity, contribution.unit) : "تعهد وصفي", "outline")).join("")}
                          </div>
                        </div>
                        <div class="alliance-card-foot">
                          ${latestRequest ? `<a class="btn btn-outline btn-sm" href="#/supporter/messages?request=${encodeURIComponent(latestRequest.id)}">${icon("message-square", { size: 14 })} المحادثة</a>` : ""}
                          <a class="btn btn-ghost btn-sm" href="#/supporter/projects/${project.id}">فتح المشروع ${icon("chevron-left", { size: 14 })}</a>
                        </div>
                      </article>`;
                  }
                )
                .join("")}
            </div>`
          : emptyState({
              iconName: "handshake",
              title: "لا شراكات بعد",
              description: "ستظهر هنا الجمعيات والمشاريع بعد أول عرض مساهمة أو طلب تعاون.",
              action: `<a class="btn btn-primary" href="#/supporter/discover">اكتشاف المشاريع</a>`
            })
      }
    `,
    mount() {}
  };
}
