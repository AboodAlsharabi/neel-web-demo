import { commit, getCurrentSupporter, getState } from "../../store.js";
import {
  getNeedCoverage,
  getNeedsForProject,
  getProjectById,
  getProjectCoverage,
  getProjectOutcomes,
  isProjectSaved,
  toggleSavedProject
} from "../../services/projects.js";
import { evaluateProjectForSupporter, evaluateSupporterForNeed } from "../../services/matching.js";
import { getRequestsForRole } from "../../services/requests.js";
import { OUTCOME_METRICS, SUPPORT_TYPE_MAP } from "../../constants.js";
import {
  escapeHtml,
  formatDate,
  formatNumber,
  formatQty,
  truncate
} from "../../utils.js";
import { pageHeader, progressBar, emptyState, note } from "../../components/ui.js";
import { badge, contributionBadge, coverageBadge, demoBadge, matchBadge, requestBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";
import { openContributionModal } from "../shared/actions.js";

export function renderSupporterProjectDetail(ctx) {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const project = getProjectById(state, ctx.params.id);
  if (!project || project.status !== "published") {
    return {
      title: "المشروع غير متاح",
      html: emptyState({
        iconName: "lock",
        title: "هذا المشروع غير متاح",
        description: "قد يكون المشروع مسودة أو غير منشور للاكتشاف. لا تظهر المسودات للجهات الداعمة.",
        action: `<a class="btn btn-primary" href="#/supporter/discover">العودة إلى الاكتشاف</a>`
      }),
      mount() {}
    };
  }

  const organization = state.organizations.find((item) => item.id === project.organizationId);
  const needs = getNeedsForProject(state, project.id);
  const coverage = getProjectCoverage(state, project.id);
  const match = evaluateProjectForSupporter(state, project, supporter);
  const saved = isProjectSaved(state, supporter.id, project.id);
  const supporterRequests = getRequestsForRole(state, "supporter").filter(
    (request) => request.projectId === project.id
  );
  const contributions = state.contributions.filter(
    (contribution) => contribution.supporterId === supporter.id && contribution.projectId === project.id
  );
  const outcomes = getProjectOutcomes(state, project.id);
  const recordedOutcomes = outcomes.filter((outcome) => outcome.actual != null);

  const requestByNeed = new Map();
  supporterRequests
    .filter((request) => !["declined", "closed"].includes(request.status))
    .forEach((request) => {
      if (!requestByNeed.has(request.needId)) requestByNeed.set(request.needId, request);
    });

  const contributionByNeed = new Map();
  contributions.forEach((contribution) => {
    if (!contributionByNeed.has(contribution.needId)) contributionByNeed.set(contribution.needId, contribution);
  });

  return {
    title: project.title,
    html: `
      ${pageHeader({
        eyebrow: "تفاصيل المشروع",
        title: escapeHtml(project.title),
        description: escapeHtml(project.description),
        meta: `${demoBadge()}
          <span class="meta-dot"></span><span>${escapeHtml(organization?.name || "جمعية")}</span>
          <span class="meta-dot"></span><span>${escapeHtml(project.region)} · ${escapeHtml(project.category)}</span>
          <span class="meta-dot"></span><span>${formatNumber(project.targetYouth)} شابًا مستهدفًا</span>`,
        actions: `
          <a class="btn btn-ghost" href="#/supporter/discover">${icon("arrow-right", { size: 16 })} كل المشاريع</a>
          <button type="button" class="btn btn-outline${saved ? " is-active" : ""}" data-toggle-save>${icon("bookmark", { size: 16 })} ${saved ? "محفوظ" : "حفظ"}</button>
          ${match.relevantNeeds?.length ? `<button type="button" class="btn btn-primary" data-offer-best>${icon("handshake", { size: 16 })} أستطيع المساهمة</button>` : ""}
        `
      })}

      ${note("قبل المساهمة", "كل مساهمة هنا تعهد تجريبي داخل المحاكاة، ولا ينتج عنها دفع أو تحويل مالي. تظهر للجمعية كعرض بانتظار تأكيدها.", { iconName: "shield-check" })}

      <div class="dashboard-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <h2>الاحتياجات المعلنة</h2>
              <p>${formatNumber(coverage.counts.unresolved)} احتياجًا مفتوحًا من أصل ${formatNumber(coverage.counts.total)}.</p>
            </div>
            ${progressBar(coverage.progressPercent, coverage.progressPercent >= 60 ? "success" : "brand", "", `${formatNumber(coverage.progressPercent)}%`)}
          </div>
          <div class="card-body">
            ${
              coverage.items.length
                ? `<div class="stack-12">
                    ${coverage.items
                      .map(({ need, coverage: needCoverage }) => {
                        const evaluation = evaluateSupporterForNeed(need, project, supporter);
                        const request = requestByNeed.get(need.id);
                        const contribution = contributionByNeed.get(need.id);
                        const isRelevant = supporter.supportTypes.includes(need.type);
                        return `
                          <article class="supporter-need-card${isRelevant ? " is-relevant" : ""}">
                            <div class="need-card-head">
                              <div class="need-card-title">
                                <span class="support-icon">${icon(SUPPORT_TYPE_MAP[need.type]?.icon || "layers", { size: 18 })}</span>
                                <div>
                                  <h3>${escapeHtml(need.title)}</h3>
                                  <div class="meta-line">
                                    ${badge(SUPPORT_TYPE_MAP[need.type]?.label || need.type, "outline")}
                                    ${isRelevant ? badge("ضمن نوع دعمك", "brand", "heart-handshake") : ""}
                                    ${need.requiredQuantity != null ? badge(formatQty(need.requiredQuantity, need.unit), "outline") : badge("تعهد وصفي", "outline")}
                                  </div>
                                </div>
                              </div>
                              ${coverageBadge(needCoverage.status)}
                            </div>
                            ${need.details ? `<p class="need-details">${escapeHtml(need.details)}</p>` : ""}
                            ${need.requiredQuantity != null ? progressBar(needCoverage.percent, needCoverage.status === "covered" ? "success" : "brand", "تم الاتفاق", `${formatNumber(needCoverage.percent)}%`) : ""}
                            <div class="supporter-need-match">
                              <span class="muted micro">مدى ملاءمة الاحتياج لجهتك</span>
                              ${matchBadge(evaluation.label, evaluation.tone)}
                            </div>
                            ${
                              contribution
                                ? `<div class="inline-alert is-success">
                                    ${icon(contribution.confirmed === false ? "clock" : "check-circle", { size: 16 })}
                                    <span><strong>${contribution.confirmed === false ? "عرضك بانتظار تأكيد الجمعية." : "لديك مساهمة مسجلة في هذا الاحتياج."}</strong> ${contribution.quantity != null ? formatQty(contribution.quantity, contribution.unit) : "تعهد وصفي"} ${contribution.confirmed === false ? "" : `· ${contributionBadge(contribution.state)}`}</span>
                                  </div>`
                                : ""
                            }
                            <div class="supporter-need-actions">
                              ${
                                request
                                  ? `<a class="btn btn-secondary btn-sm" href="#/supporter/requests?request=${encodeURIComponent(request.id)}">${icon("message-square", { size: 14 })} طلب من الجمعية · ${request.status === "agreed" ? "اتفاق" : "رد"}</a>`
                                  : ""
                              }
                              ${
                                needCoverage.status === "covered"
                                  ? badge("مكتمل داخل المحاكاة", "success", "check-circle")
                                  : isRelevant
                                    ? `<button type="button" class="btn ${request ? "btn-outline" : "btn-primary"} btn-sm" data-offer="${need.id}">${icon("handshake", { size: 14 })} ${contribution ? "تحديث عرض المساهمة" : "أستطيع المساهمة"}</button>`
                                    : `<span class="muted micro">يمكنك مراجعة التفاصيل، لكن نوع الدعم غير مطابق لملفك.</span>`
                              }
                            </div>
                          </article>`;
                      })
                      .join("")}
                  </div>`
                : emptyState({ iconName: "list-checks", title: "لا احتياجات معلنة", description: "هذا المشروع لا يعرض احتياجات قابلة للمساهمة حاليًا." })
            }
          </div>
        </section>

        <div class="stack-16">
          <section class="card">
            <div class="card-head">
              <div>
                <h2>لماذا يناسبك؟</h2>
                <p>درجة تطابق تجريبية مع أسباب قابلة للمراجعة.</p>
              </div>
              ${matchBadge(match.label, match.tone)}
            </div>
            <div class="card-body">
              <div class="match-score-hero">
                <strong>${formatNumber(match.score)}</strong>
                <span>من 100</span>
              </div>
              <div class="partner-reasons">
                ${match.reasons.map((reason) => `<div class="partner-reason">${icon("check", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`).join("")}
                ${match.missing.map((reason) => `<div class="partner-reason is-missing">${icon("alert-circle", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`).join("")}
              </div>
              <p class="muted micro">الدرجة تعتمد على نوع الدعم والمجال والمنطقة والقدرة المعلنة. لا تضمن نجاح التعاون.</p>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <h2>الجهة المنفذة</h2>
                <p>بيانات تجريبية من ملف الجمعية.</p>
              </div>
            </div>
            <div class="card-body">
              <div class="org-brief">
                <span class="org-mark">${icon("building-2", { size: 22 })}</span>
                <div>
                  <h3>${escapeHtml(organization?.name || "جمعية")}</h3>
                  <p>${escapeHtml(organization?.type || "")} · ${escapeHtml(organization?.city || "")}</p>
                </div>
              </div>
              <p class="small" style="margin-block-start:10px">${escapeHtml(truncate(organization?.about || "", 180))}</p>
              <div class="tag-row">${(organization?.fields || []).map((field) => badge(field, "outline")).join("")}</div>
              <dl class="detail-list" style="margin-block-start:12px">
                <div><dt>الفئة المستهدفة</dt><dd>${escapeHtml(project.audience || organization?.youthScope || "غير محددة")}</dd></div>
                <div><dt>المدة</dt><dd>${escapeHtml(project.duration || "غير محددة")}</dd></div>
                <div><dt>نُشر</dt><dd>${formatDate(project.publishedAt)}</dd></div>
              </dl>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <h2>أثر معلن</h2>
                <p>نتائج سجلتها الجمعية مع مصدرها.</p>
              </div>
            </div>
            <div class="card-body">
              ${
                recordedOutcomes.length
                  ? `<div class="outcome-mini-list">
                      ${recordedOutcomes
                        .map(
                          (outcome) => `
                            <div class="outcome-mini">
                              <div class="spread">
                                <span>${icon(OUTCOME_METRICS[outcome.metric]?.icon || "chart-no-axes-column", { size: 14 })} ${escapeHtml(OUTCOME_METRICS[outcome.metric]?.label || outcome.metric)}</span>
                                <strong>${formatNumber(outcome.actual)} / ${formatNumber(outcome.target)}</strong>
                              </div>
                              ${progressBar(outcome.target ? (outcome.actual / outcome.target) * 100 : 0, "success")}
                              <span class="muted micro">المصدر: ${escapeHtml(outcome.source)}</span>
                            </div>`
                        )
                        .join("")}
                    </div>`
                  : `<div class="mini-empty">${icon("chart-no-axes-column", { size: 22 })}<div><strong>لا نتائج معلنة بعد</strong><p>تظهر النتائج هنا فقط بعد تسجيل الجمعية لها مع مصدر.</p></div></div>`
              }
              <p class="muted micro" style="margin-block-start:10px">لا ندّعي أن مساهمتك وحدها سببت هذه النتائج.</p>
            </div>
          </section>
        </div>
      </div>
    `,
    mount(root) {
      root.querySelector("[data-toggle-save]")?.addEventListener("click", () => {
        let nextSaved = false;
        commit((currentState) => {
          nextSaved = toggleSavedProject(currentState, supporter.id, project.id);
        });
        showToast(nextSaved ? "حُفظ المشروع في المحفوظات." : "أُزيل المشروع من المحفوظات.", {
          title: nextSaved ? "تم الحفظ" : "تمت الإزالة",
          tone: "success"
        });
      });

      root.querySelectorAll("[data-offer]").forEach((button) => {
        button.addEventListener("click", () => {
          const need = needs.find((item) => item.id === button.dataset.offer);
          if (need) openContributionModal({ project, need });
        });
      });

      root.querySelector("[data-offer-best]")?.addEventListener("click", () => {
        const best = match.relevantNeeds?.find((item) => item.coverage.status !== "covered");
        if (best) openContributionModal({ project, need: best.need });
      });
    }
  };
}
