import { getCurrentSupporter, getState } from "../../store.js";
import { getSupporterImpact, getOverallCompletion } from "../../services/reporting.js";
import { getNeedById } from "../../services/projects.js";
import {
  escapeHtml,
  formatNumber,
  formatQty,
  truncate
} from "../../utils.js";
import { pageHeader, emptyState, progressBar, note } from "../../components/ui.js";
import { badge, contributionBadge, demoBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";

export function renderSupporterImpact() {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const impact = getSupporterImpact(state).filter((item) => item.total > 0);
  const allContributions = impact.flatMap((item) => item.contributions);
  const completion = getOverallCompletion(allContributions);
  const recordedOutcomes = impact.reduce(
    (total, item) => total + item.outcomes.filter((outcome) => outcome.actual != null).length,
    0
  );

  return {
    title: "أثر المساهمات",
    html: `
      ${pageHeader({
        eyebrow: "النتائج",
        title: "أثر المساهمات",
        description: "ماذا سُجل من مساهمات ونتائج في المشاريع المشتركة؟ نعرض النتائج كما وثقتها الجمعية، دون نسب سببية غير مثبتة.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>${formatNumber(impact.length)} مشروعًا</span>`,
        actions: `<a class="btn btn-outline" href="#/supporter/contributions">${icon("heart-handshake", { size: 16 })} مساهماتي</a>`
      })}

      ${note("قراءة مسؤولة للأثر", "المساهمة قد تساهم في نتيجة، لكن هذه المحاكاة لا تثبت أن مساهمتك وحدها سببتها. المصدر مذكور مع كل رقم.", { iconName: "shield-check" })}

      <div class="stat-grid stat-grid-4">
        ${[
          ["folder-open", "مشاريع مشتركة", impact.length, "brand"],
          ["handshake", "مساهمات مسجلة", allContributions.length, "info"],
          ["badge-check", "مساهمات مكتملة", completion.completed, "success"],
          ["chart-no-axes-column", "نتائج معلنة", recordedOutcomes, "success"]
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
        impact.length
          ? `<div class="impact-list">
              ${impact
                .map(({ project, contributions, outcomes, completed, total }) => {
                  const organization = state.organizations.find((item) => item.id === project.organizationId);
                  const recorded = outcomes.filter((outcome) => outcome.actual != null);
                  return `
                    <section class="card impact-card">
                      <div class="card-head">
                        <div>
                          <span class="muted micro">${escapeHtml(organization?.name || "جمعية")} · ${escapeHtml(project.region)}</span>
                          <h2><a class="plain-link" href="#/supporter/projects/${project.id}">${escapeHtml(project.title)}</a></h2>
                          <p>${escapeHtml(truncate(project.description, 140))}</p>
                        </div>
                        <div class="cluster">
                          ${badge(`${formatNumber(completed)}/${formatNumber(total)} اكتملت`, completed === total ? "success" : "outline")}
                          <a class="btn btn-outline btn-sm" href="#/supporter/projects/${project.id}">فتح المشروع</a>
                        </div>
                      </div>
                      <div class="card-body impact-card-body">
                        <div class="impact-contributions">
                          <h3>مساهماتك في هذا المشروع</h3>
                          <div class="stack-8">
                            ${contributions
                              .map((contribution) => {
                                const need = getNeedById(state, contribution.needId);
                                return `
                                  <div class="contribution-line">
                                    <span>${icon("handshake", { size: 14 })} <strong>${escapeHtml(need?.title || "احتياج")}</strong> — ${contribution.quantity != null ? formatQty(contribution.quantity, contribution.unit) : "تعهد وصفي"}</span>
                                    ${contribution.confirmed === false ? badge("بانتظار التأكيد", "warning") : contributionBadge(contribution.state)}
                                  </div>`;
                              })
                              .join("")}
                          </div>
                          ${total ? progressBar(total ? (completed / total) * 100 : 0, "success", "اكتمال التنفيذ", `${formatNumber(completed)}/${formatNumber(total)}`) : ""}
                        </div>
                        <div class="impact-outcomes">
                          <h3>نتائج معلنة بمصادرها</h3>
                          ${
                            recorded.length
                              ? `<div class="outcome-mini-list">
                                  ${recorded
                                    .map(
                                      (outcome) => `
                                        <div class="outcome-mini">
                                          <div class="spread">
                                            <span>${icon(outcome.metric.icon, { size: 14 })} ${outcome.label}</span>
                                            <strong>${formatNumber(outcome.actual)} / ${formatNumber(outcome.target)}</strong>
                                          </div>
                                          ${progressBar(outcome.percent, "success")}
                                          <span class="muted micro">المصدر: ${escapeHtml(outcome.source)}</span>
                                        </div>`
                                    )
                                    .join("")}
                                </div>`
                              : `<div class="mini-empty">${icon("chart-no-axes-column", { size: 20 })}<div><strong>لا نتائج معلنة</strong><p>لم تسجل الجمعية نتائج موثقة لهذا المشروع بعد.</p></div></div>`
                          }
                        </div>
                      </div>
                    </section>`;
                })
                .join("")}
            </div>`
          : emptyState({
              iconName: "chart-no-axes-column",
              title: "لا أثر مسجل بعد",
              description: "ابدأ بمساهمة في مشروع، وستظهر هنا حالتها والنتائج التي تعلنها الجمعية.",
              action: `<a class="btn btn-primary" href="#/supporter/discover">اكتشاف المشاريع</a>`
            })
      }
    `,
    mount() {}
  };
}
