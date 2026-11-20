import {
  getCurrentOrganization,
  getState
} from "../../store.js";
import {
  getAssociationMetrics
} from "../../services/reporting.js";
import {
  getProjectCoverage,
  getNeedsForProject
} from "../../services/projects.js";
import {
  getPendingOffersForRole,
  getRequestCounterpartName,
  needsAction
} from "../../services/requests.js";
import { METRIC_COLORS } from "../../constants.js";
import {
  escapeHtml,
  formatDate,
  formatDateTime,
  formatNumber,
  formatQty,
  truncate
} from "../../utils.js";
import { pageHeader, statCard, donutChart, progressBar, listRow, avatar, note } from "../../components/ui.js";
import { badge, demoBadge, requestBadge, coverageBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";

function activityLink(activity) {
  if (!activity?.relatedEntityId) return "#/association/notifications";
  if (activity.relatedEntityType === "project") {
    return `#/association/projects/${activity.relatedEntityId}`;
  }
  if (activity.relatedEntityType === "request") {
    return `#/association/messages?request=${encodeURIComponent(activity.relatedEntityId)}`;
  }
  if (activity.relatedEntityType === "contribution") {
    return "#/association/alliances";
  }
  if (activity.relatedEntityType === "survey") {
    return "#/association/stories";
  }
  return "#/association/notifications";
}

export function renderAssociationOverview() {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const metrics = getAssociationMetrics(state, organization.id);
  const pendingOffers = getPendingOffersForRole(state, "association");
  const actionRequests = metrics.requests.filter((request) => needsAction(request, "association"));

  const coverage = metrics.coverageCounts;
  const activeProjects = metrics.activeProjects.slice().sort((a, b) => {
    const aCoverage = getProjectCoverage(state, a.id);
    const bCoverage = getProjectCoverage(state, b.id);
    return bCoverage.counts.unresolved - aCoverage.counts.unresolved;
  });

  const activities = state.activities.slice(0, 6);

  return {
    title: "نظرة عامة",
    html: `
      ${pageHeader({
        eyebrow: "لوحة الجمعية",
        title: `أهلًا، ${organization.shortName || organization.name}`,
        description: "صورة عملية لما تحتاجه مشاريعك، ومن يمكن أن يساعد، وما الذي ينتظر خطوتك اليوم.",
        meta: `${demoBadge("بيانات تجريبية محلية")}<span class="meta-dot"></span><span>${escapeHtml(organization.city)}</span><span class="meta-dot"></span><span>آخر تحديث ${formatDate(state.meta.updatedAt)}</span>`,
        actions: `
          <a class="btn btn-outline" href="#/association/needs">${icon("list-checks", { size: 17 })} مراجعة الاحتياجات</a>
          <a class="btn btn-primary" href="#/association/projects/new">${icon("plus", { size: 17 })} مشروع جديد</a>
        `
      })}

      ${
        actionRequests.length || pendingOffers.length
          ? `<div class="focus-strip">
              <div class="focus-strip-copy">
                <span class="focus-kicker">${icon("target", { size: 15 })} يحتاج انتباهك</span>
                <strong>${formatNumber(actionRequests.length)} طلبًا و${formatNumber(pendingOffers.length)} عرض مساهمة بانتظار مراجعتك.</strong>
                <span>الخطوات التالية محددة داخل المحاكاة، ويمكنك فتح الطلب أو عرض المساهمة مباشرة.</span>
              </div>
              <div class="cluster">
                <a class="btn btn-primary btn-sm" href="#/association/requests">${icon("inbox", { size: 15 })} فتح الطلبات</a>
                ${pendingOffers.length ? `<a class="btn btn-outline btn-sm" href="#/association/alliances">${icon("handshake", { size: 15 })} مراجعة العروض</a>` : ""}
              </div>
            </div>`
          : ""
      }

      <div class="stat-grid">
        ${statCard({ iconName: "folder-kanban", label: "مشاريع منشورة", value: metrics.activeProjects.length, note: `${formatNumber(metrics.projects.length)} مشروعًا إجمالًا داخل المحاكاة`, tone: "brand", href: "#/association/projects" })}
        ${statCard({ iconName: "list-checks", label: "احتياجات غير مكتملة", value: metrics.unresolvedNeeds, note: `${formatNumber(metrics.uncoveredNeeds)} غير مغطاة · ${formatNumber(metrics.partialNeeds)} جزئية`, tone: "warning", href: "#/association/needs" })}
        ${statCard({ iconName: "inbox", label: "طلبات بانتظار رد", value: metrics.awaitingReply.length, note: `${formatNumber(metrics.requests.length)} طلب تعاون في المحاكاة`, tone: "info", href: "#/association/requests" })}
        ${statCard({ iconName: "handshake", label: "مساهمات مؤكدة", value: metrics.agreedContributionsCount, note: "لا ينتج عنها دفع أو تحويل مالي", tone: "success", href: "#/association/alliances" })}
      </div>

      <div class="dashboard-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <h2>تغطية الاحتياجات</h2>
              <p>الحالة مشتقة من المساهمات المؤكدة والطلبات النشطة، وليست حقلًا يدويًا.</p>
            </div>
            ${badge(`${formatNumber(coverage.total)} احتياجًا`, "neutral")}
          </div>
          <div class="card-body">
            <div class="donut-layout">
              ${donutChart(
                [
                  { label: "تم الاتفاق", value: coverage.covered, color: METRIC_COLORS.covered },
                  { label: "مغطى جزئيًا", value: coverage.partial, color: METRIC_COLORS.partial },
                  { label: "قيد التواصل", value: coverage.in_talk, color: METRIC_COLORS.in_talk },
                  { label: "غير مغطى", value: coverage.uncovered, color: METRIC_COLORS.uncovered }
                ],
                {
                  centerValue: `${formatNumber(coverage.covered)}/${formatNumber(coverage.total)}`,
                  centerLabel: "مكتمل",
                  ariaLabel: `تغطية الاحتياجات: ${coverage.covered} مكتمل، ${coverage.partial} جزئي، ${coverage.in_talk} قيد التواصل، ${coverage.uncovered} غير مغطى.`
                }
              )}
              <div class="donut-legend">
                ${[
                  ["covered", "تم الاتفاق", "badge-check"],
                  ["partial", "مغطى جزئيًا", "circle-half"],
                  ["in_talk", "قيد التواصل", "message-square"],
                  ["uncovered", "غير مغطى", "circle-dashed"]
                ]
                  .map(
                    ([key, label, iconName]) => `
                      <div class="legend-row">
                        <span class="legend-dot is-${key}">${icon(iconName, { size: 13 })}</span>
                        <span>${label}</span>
                        <strong>${formatNumber(coverage[key])}</strong>
                      </div>`
                  )
                  .join("")}
              </div>
            </div>
            ${note("كيف تُحسب؟", "الاحتياج الكمي يصبح «تم الاتفاق» عند اكتمال الكمية المؤكدة، ويظهر «مغطى جزئيًا» عند تأكيد جزء منها فقط.")}
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>ما الذي ينتظر خطوتك؟</h2>
              <p>طلبات مسودة أو ردود من الجهات تحتاج قرارًا.</p>
            </div>
            <a class="link-more" href="#/association/requests">كل الطلبات ${icon("chevron-left", { size: 13 })}</a>
          </div>
          <div class="card-body">
            ${
              actionRequests.length
                ? `<div class="action-list">
                    ${actionRequests
                      .slice(0, 4)
                      .map(
                        (request) => `
                          <a class="action-row" href="#/association/messages?request=${encodeURIComponent(request.id)}">
                            <span class="action-icon">${icon(request.status === "draft" ? "file-text" : "heart-handshake", { size: 18 })}</span>
                            <span class="action-main">
                              <strong>${escapeHtml(getRequestCounterpartName(state, request, "association"))}</strong>
                              <span>${escapeHtml(truncate(request.message, 90))}</span>
                            </span>
                            <span class="action-side">${requestBadge(request.status)}</span>
                          </a>`
                      )
                      .join("")}
                  </div>`
                : `<div class="mini-empty">${icon("check-circle", { size: 22 })}<div><strong>لا توجد طلبات معلقة</strong><p>كل الطلبات الحالية في حالة لا تتطلب إجراءً من الجمعية.</p></div></div>`
            }
            ${
              pendingOffers.length
                ? `<div class="divider"></div>
                   <div class="stack-8">
                     ${pendingOffers
                       .slice(0, 3)
                       .map(
                         (offer) => `
                           <div class="inline-alert">
                             ${icon("alert-triangle", { size: 17 })}
                             <span><strong>عرض مساهمة بانتظار التأكيد.</strong> ${escapeHtml(offer.description || "عرض تجريبي من جهة داعمة.")}</span>
                             <a class="link-more" href="#/association/alliances">مراجعة</a>
                           </div>`
                       )
                       .join("")}
                   </div>`
                : ""
            }
          </div>
        </section>
      </div>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>مشاريع تحتاج دعمًا</h2>
            <p>مرتبة حسب عدد الاحتياجات غير المكتملة.</p>
          </div>
          <a class="link-more" href="#/association/projects">كل المشاريع ${icon("chevron-left", { size: 13 })}</a>
        </div>
        <div class="card-body">
          ${
            activeProjects.length
              ? `<div class="project-mini-grid">
                  ${activeProjects
                    .slice(0, 4)
                    .map((project) => {
                      const projectCoverage = getProjectCoverage(state, project.id);
                      const needs = getNeedsForProject(state, project.id);
                      const topNeed = projectCoverage.remainingNeeds[0];
                      return `
                        <article class="project-mini">
                          <div class="spread">
                            <span class="badge is-outline">${escapeHtml(project.category)}</span>
                            <span class="muted micro">${escapeHtml(project.region)}</span>
                          </div>
                          <h3><a class="plain-link" href="#/association/projects/${project.id}">${escapeHtml(project.title)}</a></h3>
                          <p>${escapeHtml(truncate(project.description, 100))}</p>
                          <div class="progress-wrap">
                            ${progressBar(projectCoverage.progressPercent, projectCoverage.progressPercent >= 60 ? "success" : "brand", "اكتمال الاحتياجات", `${formatNumber(projectCoverage.counts.covered)}/${formatNumber(projectCoverage.counts.total)}`)}
                          </div>
                          <div class="meta-line">
                            ${badge(`${formatNumber(projectCoverage.counts.unresolved)} احتياجًا مفتوحًا`, "warning")}
                            ${badge(`${formatNumber(needs.length)} احتياجًا`, "neutral")}
                          </div>
                          ${
                            topNeed
                              ? `<div class="project-mini-need">
                                  <span>${escapeHtml(topNeed.need.title)}</span>
                                  ${coverageBadge(topNeed.coverage.status)}
                                </div>`
                              : `<div class="project-mini-need"><span>كل الاحتياجات مكتملة</span>${badge("مكتمل", "success", "check-circle")}</div>`
                          }
                          <a class="btn btn-outline btn-sm" href="#/association/projects/${project.id}">فتح المشروع ${icon("chevron-left", { size: 15 })}</a>
                        </article>`;
                    })
                    .join("")}
                </div>`
              : `<div class="mini-empty">${icon("folder-open", { size: 24 })}<div><strong>لا توجد مشاريع منشورة بعد</strong><p>أنشئ مشروعًا أو انشر مسودة لتظهر هنا وفي صفحة اكتشاف الجهات الداعمة.</p></div></div>`
          }
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>آخر النشاطات</h2>
            <p>سجل محلي يوضح ما جرى داخل المحاكاة.</p>
          </div>
        </div>
        <div class="card-body">
          ${
            activities.length
              ? `<div class="activity-list">
                  ${activities
                    .map(
                      (activity) => `
                        <a class="activity-row" href="${activityLink(activity)}">
                          <span class="activity-dot is-${activity.actorRole}"></span>
                          <div>
                            <p>${escapeHtml(activity.action)}</p>
                            <span>${formatDateTime(activity.createdAt)}</span>
                          </div>
                        </a>`
                    )
                    .join("")}
                </div>`
              : `<div class="mini-empty">${icon("database", { size: 22 })}<div><strong>لا يوجد نشاط بعد</strong><p>ستظهر هنا التحديثات التي تجريها داخل المحاكاة.</p></div></div>`
          }
        </div>
      </section>
    `,
    mount() {}
  };
}
