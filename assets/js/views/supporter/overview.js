import { getCurrentSupporter, getState } from "../../store.js";
import {
  getSupporterMetrics,
  getSupporterImpact
} from "../../services/reporting.js";
import {
  getProjectCoverage,
  getNeedsForProject
} from "../../services/projects.js";
import {
  getRequestCounterpartName,
  needsAction
} from "../../services/requests.js";
import {
  escapeHtml,
  formatDate,
  formatNumber,
  formatQty,
  truncate
} from "../../utils.js";
import { pageHeader, statCard, progressBar, note } from "../../components/ui.js";
import { badge, contributionBadge, demoBadge, matchBadge, requestBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";

export function renderSupporterOverview() {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const metrics = getSupporterMetrics(state);
  const impact = getSupporterImpact(state).filter((item) => item.total > 0);
  const actionRequests = metrics.incoming.filter((request) => needsAction(request, "supporter"));
  const recommended = metrics.ranked
    .filter((item) => item.match.score > 0 && item.match.relevantNeeds.length)
    .slice(0, 3);

  return {
    title: "نظرة عامة",
    html: `
      ${pageHeader({
        eyebrow: "لوحة الجهة الداعمة",
        title: `أهلًا، ${supporter.name}`,
        description: "اكتشف احتياجات واضحة، افهم لماذا تناسبك، وسجّل مساهمة داخل المحاكاة دون التزامات مالية.",
        meta: `${demoBadge("بيانات تجريبية محلية")}<span class="meta-dot"></span><span>${escapeHtml(supporter.kind)}</span><span class="meta-dot"></span><span>${escapeHtml(supporter.regions.join("، "))}</span>`,
        actions: `
          <a class="btn btn-outline" href="#/supporter/recommendations">${icon("sparkles", { size: 17 })} الاقتراحات</a>
          <a class="btn btn-primary" href="#/supporter/discover">${icon("search", { size: 17 })} اكتشاف المشاريع</a>
        `
      })}

      <div class="supporter-strip">
        <div>
          <span class="focus-kicker">${icon("heart-handshake", { size: 15 })} مساحة الجهة الداعمة</span>
          <strong>كل مساهمة هنا تعهد داخل محاكاة، وليست دفعة أو تحويلًا ماليًا.</strong>
          <span>سجّل ما يمكنك تقديمه، وتابع حالة التنفيذ والنتائج المعلنة بمصادرها.</span>
        </div>
        <a class="btn btn-outline btn-sm" href="#/supporter/impact">${icon("chart-no-axes-column", { size: 15 })} أثر المساهمات</a>
      </div>

      <div class="stat-grid">
        ${statCard({ iconName: "sparkles", label: "مشاريع مناسبة", value: metrics.suitableProjects.length, note: "تطابق 60 أو أكثر مع احتياجات مفتوحة", tone: "brand", href: "#/supporter/recommendations" })}
        ${statCard({ iconName: "inbox", label: "طلبات تحتاج ردك", value: actionRequests.length, note: `${formatNumber(metrics.incoming.length)} طلبًا واردًا في المحاكاة`, tone: "info", href: "#/supporter/requests" })}
        ${statCard({ iconName: "clock", label: "مساهمات قيد التنفيذ", value: metrics.inProgress.length, note: "مؤكدة ولم تكتمل بعد", tone: "warning", href: "#/supporter/contributions" })}
        ${statCard({ iconName: "badge-check", label: "مساهمات مكتملة", value: metrics.completed.length, note: "اكتملت داخل المحاكاة", tone: "success", href: "#/supporter/contributions" })}
      </div>

      ${
        actionRequests.length
          ? `<div class="focus-strip">
              <div class="focus-strip-copy">
                <span class="focus-kicker">${icon("inbox", { size: 15 })} بانتظار ردك</span>
                <strong>${formatNumber(actionRequests.length)} طلب تعاون جديد أو قيد المراجعة.</strong>
                <span>افتح الطلب لترى الاحتياج والرسالة، ثم سجّل اهتمامك أو مساهمتك.</span>
              </div>
              <a class="btn btn-primary btn-sm" href="#/supporter/requests?direction=incoming">${icon("message-square", { size: 15 })} مراجعة الطلبات</a>
            </div>`
          : ""
      }

      <div class="dashboard-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <h2>مشاريع قد تناسبك</h2>
              <p>مرتبة حسب تطابق نوع الدعم والمجال والمنطقة والقدرة المعلنة.</p>
            </div>
            <a class="link-more" href="#/supporter/recommendations">كل الاقتراحات ${icon("chevron-left", { size: 13 })}</a>
          </div>
          <div class="card-body">
            ${
              recommended.length
                ? `<div class="stack-12">
                    ${recommended
                      .map(
                        ({ project, match }) => `
                          <article class="recommendation-row">
                            <div class="recommendation-main">
                              <div class="spread">
                                <h3><a class="plain-link" href="#/supporter/projects/${project.id}">${escapeHtml(project.title)}</a></h3>
                                ${matchBadge(match.label, match.tone)}
                              </div>
                              <p>${escapeHtml(truncate(project.description, 110))}</p>
                              <div class="meta-line">
                                ${badge(project.category, "outline")}
                                ${badge(project.region, "outline")}
                                <span class="muted micro">${formatNumber(match.relevantNeeds.length)} احتياجًا مفتوحًا</span>
                              </div>
                              <div class="partner-reasons">
                                ${match.reasons.slice(0, 2).map((reason) => `<div class="partner-reason">${icon("check", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`).join("")}
                              </div>
                            </div>
                            <div class="recommendation-side">
                              <span class="match-score-sm">${formatNumber(match.score)}<small>/100</small></span>
                              <a class="btn btn-outline btn-sm" href="#/supporter/projects/${project.id}">فتح المشروع</a>
                            </div>
                          </article>`
                      )
                      .join("")}
                  </div>`
                : `<div class="mini-empty">${icon("sparkles", { size: 24 })}<div><strong>لا توجد اقتراحات واضحة بعد</strong><p>حدّث ملف جهتك أو استكشف كل المشاريع المنشورة.</p></div></div>`
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>مساهماتي الأخيرة</h2>
              <p>حالة كل تعهد وما يجري عليه.</p>
            </div>
            <a class="link-more" href="#/supporter/contributions">عرض الكل ${icon("chevron-left", { size: 13 })}</a>
          </div>
          <div class="card-body">
            ${
              metrics.contributions.length
                ? `<div class="compact-list">
                    ${metrics.contributions
                      .slice(0, 4)
                      .map((contribution) => {
                        const project = state.projects.find((item) => item.id === contribution.projectId);
                        const need = state.needs.find((item) => item.id === contribution.needId);
                        return `
                          <a class="compact-row" href="#/supporter/projects/${contribution.projectId}">
                            <span class="compact-main">
                              <strong>${escapeHtml(need?.title || "احتياج")}</strong>
                              <span>${escapeHtml(project?.title || "مشروع")} · ${contribution.quantity != null ? formatQty(contribution.quantity, contribution.unit) : "تعهد وصفي"}</span>
                            </span>
                            <span class="compact-side">
                              ${contribution.confirmed === false ? badge("بانتظار التأكيد", "warning") : contributionBadge(contribution.state)}
                              <small>${formatDate(contribution.updatedAt || contribution.agreedAt)}</small>
                            </span>
                          </a>`;
                      })
                      .join("")}
                  </div>`
                : `<div class="mini-empty">${icon("handshake", { size: 24 })}<div><strong>لا مساهمات بعد</strong><p>ابدأ من مشروع يناسب نوع الدعم الذي تقدمه.</p><a class="link-more" href="#/supporter/discover">اكتشاف المشاريع ${icon("chevron-left", { size: 12 })}</a></div></div>`
            }
            ${note("كيف تُحسب التغطية؟", "المساهمة غير المؤكدة تظهر كعرض بانتظار الجمعية. بعد التأكيد تدخل في تغطية الاحتياج.", { iconName: "info" })}
          </div>
        </section>
      </div>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>أثر مسجل في المحاكاة</h2>
            <p>النتائج تُعرض كما سجلتها الجمعية، مع مصدرها. لا ندّعي أن المساهمة وحدها سببتها.</p>
          </div>
          <a class="link-more" href="#/supporter/impact">تفاصيل الأثر ${icon("chevron-left", { size: 13 })}</a>
        </div>
        <div class="card-body">
          ${
            impact.length
              ? `<div class="impact-mini-grid">
                  ${impact
                    .slice(0, 3)
                    .map(({ project, contributions, outcomes }) => {
                      const recorded = outcomes.filter((outcome) => outcome.actual != null);
                      return `
                        <article class="impact-mini">
                          <span class="muted micro">${escapeHtml(project.region)} · ${escapeHtml(project.category)}</span>
                          <h3><a class="plain-link" href="#/supporter/projects/${project.id}">${escapeHtml(project.title)}</a></h3>
                          <div class="meta-line">${badge(`${formatNumber(contributions.length)} مساهمة`, "outline")}${recorded.length ? badge(`${formatNumber(recorded.length)} نتيجة معلنة`, "success") : badge("لا نتائج مسجلة", "neutral")}</div>
                          ${recorded.length ? `<div class="impact-mini-values">${recorded.slice(0, 2).map((outcome) => `<span><strong>${formatNumber(outcome.actual)}</strong> ${escapeHtml(outcome.label)}</span>`).join("")}</div>` : `<p class="muted small">لم تُسجل الجمعية نتائج موثقة لهذا المشروع بعد.</p>`}
                        </article>`;
                    })
                    .join("")}
                </div>`
              : `<div class="mini-empty">${icon("chart-no-axes-column", { size: 24 })}<div><strong>لا أثر مسجل بعد</strong><p>ستظهر النتائج هنا بعد تسجيل الجمعية لها وتوثيق مصدرها.</p></div></div>`
          }
        </div>
      </section>
    `,
    mount() {}
  };
}
