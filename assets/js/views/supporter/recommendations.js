import { commit, getCurrentSupporter, getState } from "../../store.js";
import { getSupporterMetrics } from "../../services/reporting.js";
import { getMatchFactorLabel, getMatchFactorMax } from "../../services/matching.js";
import { isProjectSaved, toggleSavedProject } from "../../services/projects.js";
import { escapeHtml, formatNumber, truncate } from "../../utils.js";
import { pageHeader, emptyState, note, progressBar } from "../../components/ui.js";
import { badge, demoBadge, matchBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";

export function renderSupporterRecommendations() {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const metrics = getSupporterMetrics(state);
  const suggestions = metrics.ranked.filter(
    (item) => item.match.score > 0 && item.match.relevantNeeds?.length
  );

  return {
    title: "اقتراحات مناسبة",
    html: `
      ${pageHeader({
        eyebrow: "الاكتشاف",
        title: "اقتراحات مبنية على ملف جهتك",
        description: "نطابق نوع الدعم والمجال والمنطقة والقدرة المعلنة. الاقتراح مساعدة للمقارنة، وليس ضمانًا للنجاح أو التزامًا.",
        meta: `${demoBadge("قواعد محاكاة تجريبية")}<span class="meta-dot"></span><span>${formatNumber(suggestions.length)} مشروعًا مقترحًا</span>`,
        actions: `<a class="btn btn-outline" href="#/supporter/profile">${icon("settings", { size: 16 })} تحديث ملف الجهة</a>`
      })}

      ${note("كيف نرشح؟", "نوع الدعم 45 درجة، المجال 25، المنطقة 15، القدرة المعلنة 15. لا نستخدم نموذج ذكاء اصطناعي حقيقي أو بيانات خارجية.", { iconName: "info" })}

      ${
        suggestions.length
          ? `<div class="recommendations-list">
              ${suggestions
                .map(({ project, match }) => {
                  const organization = state.organizations.find((item) => item.id === project.organizationId);
                  const saved = isProjectSaved(state, supporter.id, project.id);
                  const best = match.bestMatch;
                  const factors = ["type", "category", "region", "capacity"];
                  return `
                    <article class="recommendation-card">
                      <div class="recommendation-card-main">
                        <div class="spread">
                          <div class="cluster">
                            ${badge(project.category, "outline")}
                            ${badge(project.region, "outline")}
                          </div>
                          ${matchBadge(match.label, match.tone)}
                        </div>
                        <h2><a class="plain-link" href="#/supporter/projects/${project.id}">${escapeHtml(project.title)}</a></h2>
                        <p class="muted small">${escapeHtml(organization?.name || "جمعية")} · ${escapeHtml(truncate(project.description, 150))}</p>
                        <div class="partner-reasons">
                          ${match.reasons.slice(0, 3).map((reason) => `<div class="partner-reason">${icon("check", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`).join("")}
                          ${match.missing.slice(0, 1).map((reason) => `<div class="partner-reason is-missing">${icon("alert-circle", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`).join("")}
                        </div>
                        <div class="tag-row">
                          ${match.relevantNeeds
                            .slice(0, 4)
                            .map((item) => badge(item.need.title, item.coverage.status === "covered" ? "success" : "outline"))
                            .join("")}
                        </div>
                      </div>
                      <div class="recommendation-card-side">
                        <div class="match-score-hero compact">
                          <strong>${formatNumber(match.score)}</strong>
                          <span>درجة التطابق</span>
                        </div>
                        <div class="match-breakdown">
                          ${factors
                            .map(
                              (key) => `
                                <div class="match-factor">
                                  <span>${getMatchFactorLabel(key)}</span>
                                  <span class="bar-track"><span class="bar-fill" style="width:${Math.round(((best?.evaluation?.breakdown?.[key] || 0) / getMatchFactorMax(key)) * 100)}%"></span></span>
                                  <span>${formatNumber(best?.evaluation?.breakdown?.[key] || 0)}/${getMatchFactorMax(key)}</span>
                                </div>`
                            )
                            .join("")}
                        </div>
                        ${progressBar(match.relevantNeeds.length ? ((match.relevantNeeds.length - match.relevantNeeds.filter((item) => item.coverage.status === "covered").length) / match.relevantNeeds.length) * 100 : 100, "brand", "احتياجات مفتوحة", `${formatNumber(match.relevantNeeds.filter((item) => item.coverage.status !== "covered").length)}/${formatNumber(match.relevantNeeds.length)}`)}
                        <div class="cluster" style="margin-block-start:12px">
                          <button type="button" class="save-btn${saved ? " is-saved" : ""}" data-save="${project.id}" aria-label="${saved ? "إزالة من المحفوظات" : "حفظ المشروع"}" aria-pressed="${saved}">${icon("bookmark", { size: 17 })}</button>
                          <a class="btn btn-primary btn-sm" href="#/supporter/projects/${project.id}">فتح المشروع ${icon("chevron-left", { size: 14 })}</a>
                        </div>
                      </div>
                    </article>`;
                })
                .join("")}
            </div>`
          : emptyState({
              iconName: "sparkles",
              title: "لا اقتراحات واضحة بعد",
              description: "حدّث أنواع الدعم والمجالات والمناطق في ملف جهتك، ثم عد إلى هنا.",
              action: `<a class="btn btn-primary" href="#/supporter/profile">تحديث ملف الجهة</a>`
            })
      }
    `,
    mount(root) {
      root.querySelectorAll("[data-save]").forEach((button) => {
        button.addEventListener("click", () => {
          let saved = false;
          commit((currentState) => {
            saved = toggleSavedProject(currentState, supporter.id, button.dataset.save);
          });
          showToast(saved ? "حُفظ المشروع في قائمتك." : "أُزيل المشروع من المحفوظات.", {
            title: saved ? "تم الحفظ" : "تمت الإزالة",
            tone: "success"
          });
        });
      });
    }
  };
}
