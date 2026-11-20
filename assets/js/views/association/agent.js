import { commit, getCurrentOrganization, getState } from "../../store.js";
import {
  addNeedToProject,
  getNeedCoverage,
  getNeedsForProject,
  getProjectById,
  getProjectCoverage,
  getProjectRequests,
  getProjectsForOrganization
} from "../../services/projects.js";
import { rankSupportersForNeed } from "../../services/matching.js";
import {
  analyzeProject,
  generateOutreachDraft,
  suggestNextAction,
  summarizeProject
} from "../../services/ai-agent-mock.js";
import { SUPPORT_TYPE_MAP } from "../../constants.js";
import {
  escapeHtml,
  formatNumber,
  formatQty,
  navigateTo
} from "../../utils.js";
import { pageHeader, sectionTitle, emptyState, note, progressBar } from "../../components/ui.js";
import { badge, demoBadge, matchBadge, priorityBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";
import { openRequestComposer } from "../shared/actions.js";

const REJECTED_PREFIX = "neel-agent-rejected";

function readRejected(projectId) {
  try {
    return new Set(JSON.parse(window.sessionStorage.getItem(`${REJECTED_PREFIX}:${projectId}`) || "[]"));
  } catch {
    return new Set();
  }
}

function saveRejected(projectId, set) {
  try {
    window.sessionStorage.setItem(`${REJECTED_PREFIX}:${projectId}`, JSON.stringify([...set]));
  } catch {
    // Session storage can be unavailable; the agent still works for this render.
  }
}

export function renderAssociationAgent(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const projects = getProjectsForOrganization(state, organization.id);
  const query = ctx.query || {};
  const project = getProjectById(state, query.project) || projects[0] || null;

  if (!project || project.organizationId !== organization.id) {
    return {
      title: "مساعد نيل",
      html: `
        ${pageHeader({ eyebrow: "المساعد التجريبي", title: "مساعد نيل", description: "أنشئ مشروعًا أولًا ليبدأ المساعد في قراءة احتياجاته." })}
        ${emptyState({
          iconName: "sparkles",
          title: "لا يوجد مشروع لتحليله",
          description: "مساعد نيل يعمل على بيانات مشروع محلي. أنشئ مشروعًا ثم عد إلى هنا.",
          action: `<a class="btn btn-primary" href="#/association/projects/new">${icon("plus", { size: 16 })} إنشاء مشروع</a>`
        })}
      `,
      mount() {}
    };
  }

  const needs = getNeedsForProject(state, project.id);
  const requests = getProjectRequests(state, project.id);
  const projectCoverage = getProjectCoverage(state, project.id);
  const analysis = analyzeProject(project);
  const summary = summarizeProject(project, needs, state);
  const nextAction = suggestNextAction(project, requests, state.contributions, state, needs);
  const rejected = readRejected(project.id);
  const existingTypes = new Set(needs.map((need) => need.type));
  const suggestions = analysis.suggestions.filter((suggestion) => !rejected.has(suggestion.key));

  const openNeeds = needs.filter((need) => getNeedCoverage(state, need).status !== "covered");
  const needRecommendations = openNeeds
    .map((need) => {
      const ranked = rankSupportersForNeed(need, project, state.supporters);
      return { need, top: ranked.slice(0, 2) };
    })
    .sort((a, b) => (b.top[0]?.evaluation.score || 0) - (a.top[0]?.evaluation.score || 0));

  const supporterById = new Map(state.supporters.map((supporter) => [supporter.id, supporter]));

  return {
    title: "مساعد نيل",
    html: `
      ${pageHeader({
        eyebrow: "المساعد التجريبي",
        title: "مساعد نيل",
        description: "يقرأ وصف المشروع بوصفه قواعد ثابتة، ويقترح احتياجات أو شركاء أو خطوة تالية. كل اقتراح يحتاج اعتمادك.",
        meta: `${demoBadge("محاكاة بقواعد — ليست ذكاءً اصطناعيًا حقيقيًا")}<span class="meta-dot"></span><span>لا إرسال أو مولّد خارجي</span>`,
        actions: `<a class="btn btn-outline" href="#/association/projects/${project.id}">${icon("folder-open", { size: 16 })} فتح المشروع</a>`
      })}

      <section class="card">
        <div class="card-body">
          <div class="agent-project-bar">
            <div>
              <span class="field-label">المشروع الذي يعمل عليه المساعد</span>
              <label class="select-wrap select-wrap-wide">
                <select class="select" data-agent-project>
                  ${projects.map((item) => `<option value="${item.id}"${item.id === project.id ? " selected" : ""}>${escapeHtml(item.title)} — ${item.status === "published" ? "منشور" : "مسودة"}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="cluster">
              ${badge(`${formatNumber(projectCoverage.counts.unresolved)} احتياجًا مفتوحًا`, projectCoverage.counts.unresolved ? "warning" : "success")}
              <button type="button" class="btn btn-ghost btn-sm" data-copy-summary>${icon("copy", { size: 15 })} نسخ الملخص</button>
            </div>
          </div>
          <div class="agent-summary">
            <div class="agent-summary-main">
              <span class="agent-kicker">${icon("sparkles", { size: 15 })} قراءة المساعد</span>
              <p>${escapeHtml(summary.summary)}</p>
              <div class="agent-bullets">
                ${summary.bullets.map((bullet) => `<div>${icon("check", { size: 14 })}<span>${escapeHtml(bullet)}</span></div>`).join("")}
              </div>
              <p class="muted micro">${escapeHtml(summary.note)}</p>
            </div>
            <div class="next-action-card">
              <span class="agent-kicker">${icon("route", { size: 15 })} الخطوة التالية المقترحة</span>
              <h3>${escapeHtml(nextAction.title)}</h3>
              <p>${escapeHtml(nextAction.description)}</p>
              <a class="btn btn-primary btn-sm" href="${nextAction.link}">اتخاذ الخطوة ${icon("chevron-left", { size: 14 })}</a>
            </div>
          </div>
        </div>
      </section>

      <div class="dashboard-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <h2>اقتراحات الاحتياجات</h2>
              <p>مستخرجة من وصف المشروع. لم يُنشأ أي احتياج تلقائيًا.</p>
            </div>
            ${badge(`${formatNumber(suggestions.length)} اقتراحًا`, "outline")}
          </div>
          <div class="card-body">
            ${
              suggestions.length
                ? `<div class="stack-12">
                    ${suggestions
                      .map((suggestion) => {
                        const exists = existingTypes.has(suggestion.type);
                        const typeMeta = SUPPORT_TYPE_MAP[suggestion.type];
                        return `
                          <article class="agent-suggestion${exists ? " is-existing" : ""}" data-suggestion="${suggestion.key}">
                            <div class="agent-suggestion-head">
                              <span class="support-icon">${icon(typeMeta?.icon || "layers", { size: 18 })}</span>
                              <div>
                                <h3>${escapeHtml(suggestion.title)}</h3>
                                <span>${escapeHtml(typeMeta?.label || suggestion.type)} · ${suggestion.requiredQuantity != null ? formatQty(suggestion.requiredQuantity, suggestion.unit) : "كمية غير محددة"}</span>
                              </div>
                              ${exists ? badge("موجود مسبقًا", "success", "check") : priorityBadge(suggestion.priority)}
                            </div>
                            <p>${escapeHtml(suggestion.details)}</p>
                            <div class="agent-suggestion-note">${icon("info", { size: 14 })} ${escapeHtml(suggestion.note)}</div>
                            <div class="agent-suggestion-actions">
                              ${
                                exists
                                  ? `<span class="muted micro">لا حاجة لإضافته مرة أخرى. يمكنك تعديل الاحتياج من صفحة المشروع.</span>`
                                  : `<button type="button" class="btn btn-outline btn-sm" data-reject="${suggestion.key}">${icon("x", { size: 14 })} رفض</button>
                                     <button type="button" class="btn btn-primary btn-sm" data-accept="${suggestion.key}">${icon("check", { size: 14 })} اعتماد كاحتياج</button>`
                              }
                            </div>
                          </article>`;
                      })
                      .join("")}
                  </div>`
                : `<div class="mini-empty">${icon("check-circle", { size: 24 })}<div><strong>${analysis.suggestions.length ? "راجعت كل الاقتراحات" : "لا اقتراحات من النص الحالي"}</strong><p>${analysis.suggestions.length ? "يمكنك تعديل وصف المشروع ثم إعادة التحليل، أو إضافة احتياجات يدويًا." : "أضف احتياجات يدويًا من صفحة المشروع، أو حسّن وصف المشروع ثم عد إلى المساعد."}</p></div></div>`
            }
            ${
              analysis.uncertain.length
                ? `<div class="divider"></div>
                   <h3 class="small-strong">نقاط تحتاج مراجعة بشرية</h3>
                   <div class="partner-reasons">
                     ${analysis.uncertain.map((item) => `<div class="partner-reason is-missing">${icon("alert-circle", { size: 14 })}<span>${escapeHtml(item)}</span></div>`).join("")}
                   </div>`
                : ""
            }
            <div class="note-strip" style="margin-block-start:14px">
              ${icon("shield-check", { size: 18 })}
              <span>${escapeHtml(analysis.disclaimer)} لا نرسل بيانات إلى خدمة خارجية، ولا ننشئ التزامًا أو مبلغًا تلقائيًا.</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>شركاء قد يناسبون الاحتياجات</h2>
              <p>أعلى تطابق لكل احتياج مفتوح من بيانات الدليل.</p>
            </div>
            <a class="link-more" href="#/association/partners?project=${project.id}">كل الترشيحات ${icon("chevron-left", { size: 13 })}</a>
          </div>
          <div class="card-body">
            ${
              needRecommendations.length
                ? `<div class="stack-12">
                    ${needRecommendations
                      .slice(0, 4)
                      .map(
                        ({ need, top }) => `
                          <div class="agent-need-partners">
                            <div class="spread">
                              <strong>${escapeHtml(need.title)}</strong>
                              <span class="muted micro">${formatNumber(top.length)} جهة</span>
                            </div>
                            ${top
                              .map(
                                ({ supporter, evaluation }) => `
                                  <div class="agent-partner-row">
                                    <div>
                                      <strong>${escapeHtml(supporter.name)}</strong>
                                      <span>${escapeHtml(supporter.kind)} · ${escapeHtml(supporter.regions.join("، "))}</span>
                                    </div>
                                    <div class="cluster">
                                      ${matchBadge(evaluation.label, evaluation.tone)}
                                      <button type="button" class="btn btn-outline btn-sm" data-partner-request="${supporter.id}" data-need-id="${need.id}">${icon("send", { size: 13 })} إعداد طلب</button>
                                    </div>
                                  </div>`
                              )
                              .join("")}
                          </div>`
                      )
                      .join("")}
                  </div>`
                : `<div class="mini-empty">${icon("badge-check", { size: 24 })}<div><strong>لا احتياجات مفتوحة</strong><p>كل الاحتياجات مكتملة داخل المحاكاة. راجع النتائج أو أضف احتياجًا جديدًا.</p></div></div>`
            }
          </div>
        </section>
      </div>
    `,
    mount(root) {
      root.querySelector("[data-agent-project]")?.addEventListener("change", (event) => {
        navigateTo(`/association/agent?project=${event.target.value}`);
      });

      root.querySelector("[data-copy-summary]")?.addEventListener("click", async () => {
        const text = `${summary.summary}\n\n${summary.bullets.map((bullet) => `- ${bullet}`).join("\n")}\n\n${summary.note}`;
        try {
          await navigator.clipboard.writeText(text);
          showToast("نُسخ ملخص المشروع إلى الحافظة.", { title: "تم النسخ", tone: "success" });
        } catch {
          showToast("تعذر النسخ التلقائي في هذا المتصفح. يمكنك تحديد النص ونسخه يدويًا.", { title: "النسخ غير متاح", tone: "warning" });
        }
      });

      root.querySelectorAll("[data-reject]").forEach((button) => {
        button.addEventListener("click", () => {
          const set = readRejected(project.id);
          set.add(button.dataset.reject);
          saveRejected(project.id, set);
          const card = button.closest("[data-suggestion]");
          if (card) card.remove();
          showToast("رُفض الاقتراح داخل هذه الجلسة. لن يُضاف إلى المشروع.", { title: "تم الرفض", tone: "neutral" });
        });
      });

      root.querySelectorAll("[data-accept]").forEach((button) => {
        button.addEventListener("click", () => {
          const suggestion = analysis.suggestions.find((item) => item.key === button.dataset.accept);
          if (!suggestion) return;
          commit((currentState) => {
            addNeedToProject(currentState, project.id, {
              type: suggestion.type,
              title: suggestion.title,
              requiredQuantity: suggestion.requiredQuantity,
              unit: suggestion.unit,
              details: suggestion.details,
              priority: suggestion.priority
            });
          });
          showToast("اعتُمد الاقتراح كاحتياج داخل المشروع. يمكنك تعديله من صفحة المشروع.", { title: "تم الاعتماد", tone: "success" });
        });
      });

      root.querySelectorAll("[data-partner-request]").forEach((button) => {
        button.addEventListener("click", () => {
          const supporter = supporterById.get(button.dataset.partnerRequest);
          const need = needs.find((item) => item.id === button.dataset.needId);
          if (supporter && need) openRequestComposer({ project, need, supporter });
        });
      });
    }
  };
}
