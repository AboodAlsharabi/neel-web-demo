import { commit, getCurrentSupporter, getState } from "../../store.js";
import {
  getNeedsForProject,
  getProjectById,
  getProjectCoverage,
  toggleSavedProject
} from "../../services/projects.js";
import { evaluateProjectForSupporter } from "../../services/matching.js";
import { escapeHtml, formatDate, formatNumber, truncate } from "../../utils.js";
import { pageHeader, emptyState, progressBar } from "../../components/ui.js";
import { badge, demoBadge, matchBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";

export function renderSupporterSaved() {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const savedRows = state.savedProjects
    .filter((item) => item.supporterId === supporter.id)
    .map((item) => ({ ...item, project: getProjectById(state, item.projectId) }))
    .filter((item) => item.project)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    title: "المحفوظات",
    html: `
      ${pageHeader({
        eyebrow: "الاكتشاف",
        title: "المشاريع المحفوظة",
        description: "قائمة محلية للمشاريع التي تريد العودة إليها. حفظ المشروع لا يرسل إشعارًا للجمعية ولا ينشئ التزامًا.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>${formatNumber(savedRows.length)} مشروعًا</span>`,
        actions: `<a class="btn btn-outline" href="#/supporter/discover">${icon("search", { size: 16 })} استكشاف المزيد</a>`
      })}

      ${
        savedRows.length
          ? `<div class="discover-grid">
              ${savedRows
                .map(({ project }) => {
                  const needs = getNeedsForProject(state, project.id);
                  const coverage = getProjectCoverage(state, project.id);
                  const organization = state.organizations.find((item) => item.id === project.organizationId);
                  const match = evaluateProjectForSupporter(state, project, supporter);
                  const relevant = needs.filter((need) => supporter.supportTypes.includes(need.type));
                  return `
                    <article class="discover-card">
                      <div class="discover-card-cover">
                        <div class="spread">
                          <span class="badge is-outline">${escapeHtml(project.category)}</span>
                          <button type="button" class="save-btn is-saved" data-remove="${project.id}" aria-label="إزالة من المحفوظات">${icon("bookmark", { size: 17 })}</button>
                        </div>
                        <h2><a href="#/supporter/projects/${project.id}">${escapeHtml(project.title)}</a></h2>
                        <p>${escapeHtml(truncate(project.description, 120))}</p>
                        <div class="meta-line">
                          <span>${icon("map-pin", { size: 13 })} ${escapeHtml(project.region)}</span>
                          <span>${icon("building-2", { size: 13 })} ${escapeHtml(organization?.name || "جمعية")}</span>
                        </div>
                      </div>
                      <div class="discover-card-body">
                        <div class="spread">
                          ${match.score > 0 ? matchBadge(match.label, match.tone) : badge("راجع التفاصيل", "neutral")}
                          <span class="muted micro">${match.score > 0 ? `${formatNumber(match.score)}/100 تطابق` : ""}</span>
                        </div>
                        <div class="meta-line">
                          ${relevant.length ? badge(`${formatNumber(relevant.length)} احتياجًا من نوع دعمك`, "brand") : badge("لا تطابق نوعي حاليًا", "outline")}
                          <span class="muted micro">حُفظ ${formatDate(savedRows.find((row) => row.project.id === project.id)?.createdAt)}</span>
                        </div>
                        ${progressBar(coverage.progressPercent, coverage.progressPercent >= 60 ? "success" : "brand", "تغطية الاحتياجات", `${formatNumber(coverage.progressPercent)}%`)}
                      </div>
                      <div class="discover-card-foot">
                        <span class="muted micro">${formatNumber(coverage.counts.unresolved)} احتياجًا مفتوحًا</span>
                        <a class="btn btn-primary btn-sm" href="#/supporter/projects/${project.id}">عرض التفاصيل ${icon("chevron-left", { size: 14 })}</a>
                      </div>
                    </article>`;
                })
                .join("")}
            </div>`
          : emptyState({
              iconName: "bookmark",
              title: "لا مشاريع محفوظة",
              description: "اضغط أيقونة الحفظ في أي مشروع للعودة إليه لاحقًا.",
              action: `<a class="btn btn-primary" href="#/supporter/discover">اكتشاف المشاريع</a>`
            })
      }
    `,
    mount(root) {
      root.querySelectorAll("[data-remove]").forEach((button) => {
        button.addEventListener("click", () => {
          commit((currentState) => {
            toggleSavedProject(currentState, supporter.id, button.dataset.remove);
          });
          showToast("أُزيل المشروع من المحفوظات.", { title: "تمت الإزالة", tone: "success" });
        });
      });
    }
  };
}
