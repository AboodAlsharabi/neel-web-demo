import { getCurrentOrganization, getState } from "../../store.js";
import { getProjectById, getProjectsForOrganization } from "../../services/projects.js";
import { getSurveySummary, getOutcomeRows } from "../../services/reporting.js";
import { escapeHtml, formatDate, formatNumber, navigateTo } from "../../utils.js";
import { pageHeader, emptyState, progressBar, note, statCard } from "../../components/ui.js";
import { badge, demoBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { openOutcomeModal } from "../shared/actions.js";

export function renderAssociationOutcomes(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const projects = getProjectsForOrganization(state, organization.id);
  const query = ctx.query || {};
  const project = getProjectById(state, query.project) || projects[0] || null;

  if (!project || project.organizationId !== organization.id) {
    return {
      title: "نتائج الشباب",
      html: `
        ${pageHeader({ eyebrow: "النتائج", title: "نتائج الشباب", description: "أنشئ مشروعًا أولًا لتسجيل النتائج ومصادرها." })}
        ${emptyState({
          iconName: "chart-no-axes-column",
          title: "لا يوجد مشروع",
          description: "النتائج مرتبطة بمشروع محدد، ولا تُنشأ أرقام عامة بلا سياق.",
          action: `<a class="btn btn-primary" href="#/association/projects/new">إنشاء مشروع</a>`
        })}
      `,
      mount() {}
    };
  }

  const rows = getOutcomeRows(state, project);
  const surveys = getSurveySummary(state, project.id);
  const recorded = rows.filter((row) => row.recorded);
  const participantRow = rows.find((row) => row.metric.key === "participants");
  const completedRow = rows.find((row) => row.metric.key === "training_completed");
  const internshipRow = rows.find((row) => row.metric.key === "internships");

  const recordedTotal = recorded.length;
  const sourceCount = recorded.filter((row) => row.source).length;

  return {
    title: "نتائج الشباب",
    html: `
      ${pageHeader({
        eyebrow: "النتائج",
        title: "نتائج الشباب",
        description: "سجل ما حدث فعلًا مقابل ما كان مستهدفًا، مع مصدر واضح لكل رقم. لا نستخدم نسب أثر أو أرقامًا افتراضية.",
        meta: `${demoBadge("نتائج تجريبية")}<span class="meta-dot"></span><span>${formatNumber(recordedTotal)} من ${formatNumber(rows.length)} مؤشرات مسجلة</span>`,
        actions: `
          <a class="btn btn-outline" href="#/association/stories?project=${project.id}">${icon("megaphone", { size: 16 })} قصة المشروع</a>
          <button type="button" class="btn btn-primary" data-add-outcome>${icon("plus", { size: 16 })} تسجيل نتيجة</button>
        `
      })}

      <section class="card">
        <div class="card-body">
          <div class="agent-project-bar">
            <div>
              <span class="field-label">المشروع</span>
              <label class="select-wrap select-wrap-wide">
                <select class="select" data-project-select>
                  ${projects.map((item) => `<option value="${item.id}"${item.id === project.id ? " selected" : ""}>${escapeHtml(item.title)}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="cluster">
              ${badge(`المستهدف ${formatNumber(project.targetYouth)} شابًا`, "outline")}
              ${badge(`${formatNumber(surveys.count)} رد استبيان`, "outline")}
            </div>
          </div>
        </div>
      </section>

      <div class="stat-grid stat-grid-4">
        ${statCard({
          iconName: "users",
          label: "المشاركون",
          value: participantRow?.actual ?? 0,
          note: participantRow?.recorded ? `من أصل ${formatNumber(participantRow.target)} مستهدفين` : "لم تُسجل بعد",
          tone: "brand"
        })}
        ${statCard({
          iconName: "graduation-cap",
          label: "أكملوا التدريب",
          value: completedRow?.actual ?? 0,
          note: completedRow?.recorded ? `من أصل ${formatNumber(completedRow.target)} مستهدفين` : "لم تُسجل بعد",
          tone: "info"
        })}
        ${statCard({
          iconName: "briefcase",
          label: "فرص تدريب عملي",
          value: internshipRow?.actual ?? 0,
          note: internshipRow?.recorded ? "نتيجة مسجلة بمصدر" : "لم تُسجل بعد",
          tone: "success"
        })}
        ${statCard({
          iconName: "file-check",
          label: "مؤشرات لها مصدر",
          value: sourceCount,
          note: `${formatNumber(recordedTotal)} مؤشرًا مسجلًا`,
          tone: "success"
        })}
      </div>

      ${recordedTotal === 0 ? note("لا نتائج مسجلة بعد", "لن تُملأ هذه الصفحة بأرقام افتراضية. سجّل النتيجة الفعلية ومصدرها عندما يتوفر ذلك.", { tone: "warning", iconName: "alert-circle" }) : ""}

      <section class="card">
        <div class="card-head">
          <div>
            <h2>الهدف مقابل النتيجة</h2>
            <p>لكل مؤشر هدف ونتيجة ومصدر. يمكن تحديث النتيجة دون اختراع نتائج غير موثقة.</p>
          </div>
          <span class="badge is-outline">${formatNumber(recordedTotal)} مسجل</span>
        </div>
        <div class="card-body table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>المؤشر</th>
                <th>الهدف</th>
                <th>النتيجة المسجلة</th>
                <th>التقدم</th>
                <th>المصدر</th>
                <th>آخر تحديث</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td data-label="المؤشر">
                        <div class="table-stack">
                          <strong>${icon(row.metric.icon, { size: 15 })} ${row.metric.label}</strong>
                          <span class="muted micro">${escapeHtml(row.metric.unit)}</span>
                        </div>
                      </td>
                      <td data-label="الهدف"><strong>${formatNumber(row.target)}</strong></td>
                      <td data-label="النتيجة">${row.recorded ? `<strong>${formatNumber(row.actual)}</strong>` : `<span class="muted">لم تُسجل</span>`}</td>
                      <td data-label="التقدم" style="min-width:130px">
                        ${progressBar(row.recorded && row.target ? (row.actual / row.target) * 100 : 0, row.recorded ? "success" : "brand", "", row.recorded ? `${Math.round((row.actual / row.target) * 100)}%` : "—")}
                      </td>
                      <td data-label="المصدر">
                        <span class="small">${row.recorded ? escapeHtml(row.source) : "—"}</span>
                        ${row.evidenceNote ? `<span class="muted micro">${escapeHtml(row.evidenceNote)}</span>` : ""}
                      </td>
                      <td data-label="آخر تحديث">${row.recordedAt ? formatDate(row.recordedAt) : "—"}</td>
                      <td data-label="إجراء">
                        <button type="button" class="btn btn-outline btn-sm" data-outcome="${row.metric.key}">${row.recorded ? "تحديث" : "تسجيل"}</button>
                      </td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>ملخص صوت الشباب</h2>
            <p>الاستبيان غير معرّف ويُعرض مجمعًا فقط.</p>
          </div>
          <a class="link-more" href="#/association/stories?project=${project.id}">عرض في القصة ${icon("chevron-left", { size: 13 })}</a>
        </div>
        <div class="card-body">
          ${
            surveys.count
              ? `<div class="survey-summary-grid">
                  <div class="survey-summary">
                    <span class="field-label">أكثر المهارات طلبًا</span>
                    ${surveys.skills.slice(0, 4).map((item) => `<div class="spread"><span>${escapeHtml(item.value)}</span><strong>${formatNumber(item.count)}</strong></div>`).join("")}
                  </div>
                  <div class="survey-summary">
                    <span class="field-label">مدى الفائدة</span>
                    ${surveys.usefulness.map((item) => `<div class="spread"><span>${escapeHtml(item.value)}</span><strong>${formatNumber(item.count)}</strong></div>`).join("")}
                  </div>
                </div>`
              : `<div class="mini-empty">${icon("clipboard-list", { size: 22 })}<div><strong>لا ردود بعد</strong><p>أضف ردًا تجريبيًا من صفحة قصة المشروع.</p></div></div>`
          }
        </div>
      </section>
    `,
    mount(root) {
      root.querySelector("[data-project-select]")?.addEventListener("change", (event) => {
        navigateTo(`/association/outcomes?project=${event.target.value}`);
      });
      root.querySelector("[data-add-outcome]")?.addEventListener("click", () => {
        openOutcomeModal({ project });
      });
      root.querySelectorAll("[data-outcome]").forEach((button) => {
        button.addEventListener("click", () => {
          openOutcomeModal({ project, defaultMetric: button.dataset.outcome });
        });
      });
    }
  };
}
