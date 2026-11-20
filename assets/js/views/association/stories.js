import { getCurrentOrganization, getState, setSession } from "../../store.js";
import {
  getNeedsForProject,
  getProjectById,
  getProjectCoverage,
  getProjectsForOrganization
} from "../../services/projects.js";
import {
  getOutcomeRows,
  getSurveySummary
} from "../../services/reporting.js";
import {
  escapeHtml,
  formatDate,
  formatNumber,
  formatQty,
  navigateTo
} from "../../utils.js";
import { pageHeader, emptyState, progressBar, note } from "../../components/ui.js";
import { badge, demoBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";
import { confirmDialog } from "../../components/modal.js";
import { openOutcomeModal, openSurveyModal } from "../shared/actions.js";

export function renderAssociationStories(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const projects = getProjectsForOrganization(state, organization.id);
  const query = ctx.query || {};
  const project = getProjectById(state, query.project) || projects[0] || null;

  if (!project || project.organizationId !== organization.id) {
    return {
      title: "قصة المشروع",
      html: `
        ${pageHeader({ eyebrow: "النتائج", title: "قصة المشروع", description: "أنشئ مشروعًا أولًا لبناء قصة تجريبية من بياناته." })}
        ${emptyState({
          iconName: "megaphone",
          title: "لا يوجد مشروع",
          description: "قصة المشروع تُبنى من المشروع واحتياجاته ونتائجه المسجلة.",
          action: `<a class="btn btn-primary" href="#/association/projects/new">إنشاء مشروع</a>`
        })}
      `,
      mount() {}
    };
  }

  const needs = getNeedsForProject(state, project.id);
  const coverage = getProjectCoverage(state, project.id);
  const outcomeRows = getOutcomeRows(state, project);
  const recordedOutcomes = outcomeRows.filter((row) => row.recorded);
  const surveys = getSurveySummary(state, project.id);
  const contributions = state.contributions.filter(
    (contribution) =>
      contribution.projectId === project.id &&
      contribution.confirmed !== false &&
      contribution.state !== "cancelled"
  );
  const supporters = [...new Set(contributions.map((contribution) => contribution.supporterId))]
    .map((id) => state.supporters.find((supporter) => supporter.id === id))
    .filter(Boolean);

  const participantOutcome = outcomeRows.find((row) => row.metric.key === "participants");
  const completedOutcome = outcomeRows.find((row) => row.metric.key === "training_completed");
  const storyText = buildStoryText({
    project,
    organization,
    coverage,
    needs,
    supporters,
    participantOutcome,
    completedOutcome,
    recordedOutcomes
  });

  return {
    title: "قصة المشروع",
    html: `
      ${pageHeader({
        eyebrow: "النتائج",
        title: "قصة المشروع",
        description: "حوّل بيانات المشروع إلى ملخص واضح وقابل للمشاركة، مع فصل الهدف عن النتيجة المسجلة ومصدرها.",
        meta: `${demoBadge("قصة تجريبية")}<span class="meta-dot"></span><span>لا نشر تلقائي</span>`,
        actions: `<a class="btn btn-outline" href="#/association/outcomes?project=${project.id}">${icon("chart-no-axes-column", { size: 16 })} نتائج الشباب</a>`
      })}

      <section class="card">
        <div class="card-body">
          <div class="agent-project-bar">
            <div>
              <span class="field-label">اختر المشروع</span>
              <label class="select-wrap select-wrap-wide">
                <select class="select" data-story-project>
                  ${projects.map((item) => `<option value="${item.id}"${item.id === project.id ? " selected" : ""}>${escapeHtml(item.title)}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="cluster">
              ${badge(`${formatNumber(needs.length)} احتياجًا`, "outline")}
              <button type="button" class="btn btn-ghost btn-sm" data-copy-story>${icon("copy", { size: 15 })} نسخ القصة</button>
            </div>
          </div>
        </div>
      </section>

      <div class="dashboard-grid">
        <section class="card story-card">
          <div class="story-cover">
            <span class="story-kicker">${icon("megaphone", { size: 15 })} قصة من بيانات المحاكاة</span>
            <h2>${escapeHtml(project.title)}</h2>
            <p>${escapeHtml(project.description)}</p>
            <div class="story-meta">
              <span>${icon("map-pin", { size: 14 })} ${escapeHtml(project.region)}</span>
              <span>${icon("users", { size: 14 })} ${formatNumber(project.targetYouth)} شابًا مستهدفًا</span>
              <span>${icon("calendar", { size: 14 })} ${formatDate(project.publishedAt || project.createdAt)}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="story-block">
              <h3>الحاجة</h3>
              <p>${escapeHtml(project.description)}</p>
              <div class="tag-row">
                ${project.availableResources?.length ? project.availableResources.map((resource) => badge(resource, "outline")).join("") : badge("لم تُحدد موارد متاحة", "neutral")}
              </div>
            </div>
            <div class="story-block">
              <h3>ما جرى حتى الآن</h3>
              <div class="story-facts">
                <div><strong>${formatNumber(coverage.counts.covered)}/${formatNumber(coverage.counts.total)}</strong><span>احتياجات تم الاتفاق عليها</span></div>
                <div><strong>${formatNumber(contributions.length)}</strong><span>مساهمة مؤكدة داخل المحاكاة</span></div>
                <div><strong>${formatNumber(supporters.length)}</strong><span>جهة داعمة مشاركة</span></div>
                <div><strong>${formatNumber(surveys.count)}</strong><span>رد استبيان غير معرّف</span></div>
              </div>
              ${progressBar(coverage.progressPercent, coverage.progressPercent >= 60 ? "success" : "brand", "اكتمال الاحتياجات", `${formatNumber(coverage.progressPercent)}%`)}
            </div>
            <div class="story-block">
              <h3>الشركاء</h3>
              ${
                supporters.length
                  ? `<div class="tag-row">${supporters.map((supporter) => badge(supporter.name, "brand")).join("")}</div>`
                  : `<p class="muted small">لم تُسجل مساهمات مؤكدة بعد. لا نضيف أسماء أو شركاء غير موجودين في البيانات.</p>`
              }
            </div>
            <div class="story-block">
              <h3>نتائج الشباب</h3>
              ${
                recordedOutcomes.length
                  ? `<div class="outcome-mini-list">
                      ${recordedOutcomes
                        .map(
                          (row) => `
                            <div class="outcome-mini">
                              <div class="spread">
                                <span>${icon(row.metric.icon, { size: 15 })} ${row.metric.label}</span>
                                <strong>${formatNumber(row.actual)} / ${formatNumber(row.target)}</strong>
                              </div>
                              ${progressBar(row.target ? (row.actual / row.target) * 100 : 0, "success")}
                              <span class="muted micro">المصدر: ${escapeHtml(row.source)}</span>
                            </div>`
                        )
                        .join("")}
                    </div>`
                  : `<div class="info-panel">${icon("alert-circle", { size: 16 })} <span>لا توجد نتائج مسجلة بعد. لا نستخدم أرقامًا افتراضية أو وعودًا غير موثقة.</span></div>`
              }
            </div>
            <div class="story-contribution-action">
              <button type="button" class="btn btn-primary" data-story-contribute>${icon("handshake", { size: 17 })} أستطيع المساهمة</button>
              <p class="muted micro">يفتح هذا الزر تجربة الجهة الداعمة لتقديم عرض مساهمة محلي، دون إرسال خارجي.</p>
            </div>
          </div>
        </section>

        <div class="stack-16">
          <section class="card">
            <div class="card-head">
              <div>
                <h2>ملخص قابل للنسخ</h2>
                <p>نص جاهز للاستخدام في عرض داخلي أو تحديث تجريبي.</p>
              </div>
            </div>
            <div class="card-body">
              <pre class="story-text" data-story-text>${escapeHtml(storyText)}</pre>
              <button type="button" class="btn btn-secondary" style="margin-block-start:12px" data-copy-story>${icon("copy", { size: 15 })} نسخ النص</button>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <h2>صوت الشباب</h2>
                <p>ملخصات مجمعة من استبيان قصير وغير معرّف.</p>
              </div>
              <button type="button" class="btn btn-outline btn-sm" data-add-survey>${icon("plus", { size: 14 })} رد تجريبي</button>
            </div>
            <div class="card-body">
              ${
                surveys.count
                  ? `<div class="stack-12">
                      <div>
                        <h3 class="small-strong">أكثر المهارات طلبًا</h3>
                        <div class="tag-row">${surveys.skills.slice(0, 5).map((item) => badge(`${item.value} ×${formatNumber(item.count)}`, "outline")).join("")}</div>
                      </div>
                      <div>
                        <h3 class="small-strong">مدى الفائدة</h3>
                        <div class="tag-row">${surveys.usefulness.map((item) => badge(`${item.value} ×${formatNumber(item.count)}`, "outline")).join("")}</div>
                      </div>
                      ${
                        surveys.suggestions.length
                          ? `<div>
                              <h3 class="small-strong">اقتراحات</h3>
                              <ul class="plain-list">${surveys.suggestions.slice(0, 4).map((item) => `<li>${escapeHtml(item.value)} <span class="muted micro">×${formatNumber(item.count)}</span></li>`).join("")}</ul>
                            </div>`
                          : ""
                      }
                    </div>`
                  : `<div class="mini-empty">${icon("clipboard-list", { size: 22 })}<div><strong>لا ردود بعد</strong><p>أضف ردًا تجريبيًا، أو استخدم الاستبيان في مرحلة جمع آراء الشباب.</p></div></div>`
              }
              ${note("الخصوصية", "لا نجمع الأسماء أو الهواتف أو العمر الدقيق. الإجابات في هذه المحاكاة وهمية وتظهر مجمعة فقط.", { iconName: "shield-check" })}
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <h2>النتائج</h2>
                <p>الهدف والنتيجة والمصدر في مكان واحد.</p>
              </div>
              <button type="button" class="btn btn-outline btn-sm" data-add-outcome>${icon("plus", { size: 14 })} تسجيل نتيجة</button>
            </div>
            <div class="card-body">
              <div class="outcome-mini-list">
                ${outcomeRows
                  .map(
                    (row) => `
                      <div class="outcome-mini">
                        <div class="spread">
                          <span>${icon(row.metric.icon, { size: 15 })} ${row.metric.label}</span>
                          <strong>${row.recorded ? `${formatNumber(row.actual)} / ${formatNumber(row.target)}` : `الهدف ${formatNumber(row.target)}`}</strong>
                        </div>
                        ${progressBar(row.recorded && row.target ? (row.actual / row.target) * 100 : 0, row.recorded ? "success" : "brand")}
                        <span class="muted micro">${row.recorded ? `المصدر: ${escapeHtml(row.source)}` : "لم تُسجل نتيجة بعد"}</span>
                      </div>`
                  )
                  .join("")}
              </div>
            </div>
          </section>
        </div>
      </div>
    `,
    mount(root) {
      root.querySelector("[data-story-project]")?.addEventListener("change", (event) => {
        navigateTo(`/association/stories?project=${event.target.value}`);
      });
      root.querySelectorAll("[data-copy-story]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(storyText);
            showToast("نُسخت قصة المشروع إلى الحافظة.", { title: "تم النسخ", tone: "success" });
          } catch {
            showToast("تعذر النسخ التلقائي في هذا المتصفح.", { title: "النسخ غير متاح", tone: "warning" });
          }
        });
      });
      root.querySelector("[data-add-outcome]")?.addEventListener("click", () => {
        openOutcomeModal({ project });
      });
      root.querySelector("[data-add-survey]")?.addEventListener("click", () => {
        openSurveyModal({ project });
      });
      root.querySelector("[data-story-contribute]")?.addEventListener("click", () => {
        confirmDialog({
          title: "المتابعة كجهة داعمة؟",
          message: "ستنتقل إلى تجربة الجهة الداعمة لتقديم عرض مساهمة محلي على هذا المشروع. لن تُحذف بيانات الجمعية.",
          confirmLabel: "أستطيع المساهمة",
          tone: "brand",
          onConfirm: () => {
            setSession("supporter");
            navigateTo(`/supporter/projects/${project.id}`);
          }
        });
      });
    }
  };
}

function buildStoryText({ project, organization, coverage, needs, supporters, participantOutcome, completedOutcome, recordedOutcomes }) {
  const lines = [
    `قصة مشروع «${project.title}» — ${organization.name}`,
    "",
    project.description,
    "",
    `المنطقة: ${project.region} | المجال: ${project.category} | المستهدف: ${project.targetYouth} شابًا.`,
    `الاحتياجات: ${needs.length} احتياجًا، منها ${coverage.counts.covered} تم الاتفاق عليها و${coverage.counts.uncovered + coverage.counts.partial + coverage.counts.in_talk} ما زالت مفتوحة أو قيد التواصل.`,
    supporters.length ? `الجهات المشاركة: ${supporters.map((supporter) => supporter.name).join("، ")}.` : "لا توجد جهات مشاركة مؤكدة بعد.",
    ""
  ];
  if (participantOutcome?.recorded) {
    lines.push(`المشاركون: ${participantOutcome.actual} من أصل ${participantOutcome.target} (المصدر: ${participantOutcome.source}).`);
  }
  if (completedOutcome?.recorded) {
    lines.push(`أكملوا التدريب: ${completedOutcome.actual} من أصل ${completedOutcome.target} (المصدر: ${completedOutcome.source}).`);
  }
  if (!recordedOutcomes.length) {
    lines.push("لم تُسجل نتائج موثقة بعد، لذلك لا تتضمن القصة أرقام أثر غير مؤكدة.");
  }
  lines.push("");
  lines.push("هذه قصة محاكاة مبنية على البيانات المحلية، وليست ادعاءً بأثر موثق خارج النموذج.");
  return lines.join("\n");
}
