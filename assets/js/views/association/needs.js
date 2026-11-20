import { getCurrentOrganization, getState } from "../../store.js";
import {
  getNeedCoverage,
  getNeedsForProject,
  getProjectsForOrganization
} from "../../services/projects.js";
import { getNeedRequestSummary } from "../../services/projects.js";
import { COVERAGE_STATUSES, SUPPORT_TYPES } from "../../constants.js";
import {
  escapeHtml,
  formatDate,
  formatNumber,
  formatQty,
  navigateTo,
  normalizeArabic
} from "../../utils.js";
import { pageHeader, progressBar, emptyState } from "../../components/ui.js";
import { coverageBadge, priorityBadge, badge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";

function hrefFor(query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });
  const string = params.toString();
  return `#/association/needs${string ? `?${string}` : ""}`;
}

export function renderAssociationNeeds(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const query = ctx.query || {};
  const projectFilter = query.project || "all";
  const typeFilter = query.type || "all";
  const statusFilter = query.status || "all";

  const projects = getProjectsForOrganization(state, organization.id);
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const rows = projects
    .flatMap((project) =>
      getNeedsForProject(state, project.id).map((need) => ({
        need,
        project,
        coverage: getNeedCoverage(state, need),
        requests: getNeedRequestSummary(state, need)
      }))
    )
    .filter((row) => {
      if (projectFilter !== "all" && row.project.id !== projectFilter) return false;
      if (typeFilter !== "all" && row.need.type !== typeFilter) return false;
      if (statusFilter !== "all" && row.coverage.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const order = { uncovered: 0, partial: 1, in_talk: 2, covered: 3 };
      return order[a.coverage.status] - order[b.coverage.status];
    });

  const counts = projects
    .flatMap((project) => getNeedsForProject(state, project.id))
    .map((need) => getNeedCoverage(state, need));

  return {
    title: "الاحتياجات",
    html: `
      ${pageHeader({
        eyebrow: "المشاريع والاحتياجات",
        title: "ما الذي تحتاجه مشاريعنا؟",
        description: "عرض موحّد لكل الاحتياجات، مع حالة تغطية مشتقة من المساهمات والطلبات. لا تُعدّل الحالة يدويًا.",
        actions: `<a class="btn btn-outline" href="#/association/projects">${icon("folder-kanban", { size: 16 })} كل المشاريع</a>`
      })}

      <div class="stat-grid">
        ${[
          ["list-checks", "إجمالي الاحتياجات", counts.length, "brand"],
          ["circle-dashed", "غير مغطاة", counts.filter((item) => item.status === "uncovered").length, "warning"],
          ["circle-half", "مغطاة جزئيًا", counts.filter((item) => item.status === "partial").length, "warning"],
          ["badge-check", "تم الاتفاق", counts.filter((item) => item.status === "covered").length, "success"]
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

      <div class="filter-bar">
        <div class="filter-search">
          ${icon("search", { size: 18 })}
          <input class="input" type="search" placeholder="ابحث في الاحتياجات أو المشاريع" data-need-search aria-label="بحث في الاحتياجات">
        </div>
        <div class="filter-controls">
          <label class="select-wrap">
            <span class="sr-only">المشروع</span>
            <select class="select" data-filter="project">
              <option value="all">كل المشاريع</option>
              ${projects.map((project) => `<option value="${project.id}"${projectFilter === project.id ? " selected" : ""}>${escapeHtml(project.title)}</option>`).join("")}
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">نوع الدعم</span>
            <select class="select" data-filter="type">
              <option value="all">كل أنواع الدعم</option>
              ${SUPPORT_TYPES.map((type) => `<option value="${type.key}"${typeFilter === type.key ? " selected" : ""}>${type.label}</option>`).join("")}
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">حالة التغطية</span>
            <select class="select" data-filter="status">
              <option value="all">كل الحالات</option>
              ${Object.values(COVERAGE_STATUSES).map((status) => `<option value="${status.key}"${statusFilter === status.key ? " selected" : ""}>${status.label}</option>`).join("")}
            </select>
          </label>
        </div>
      </div>

      <div class="results-meta">
        <span data-results-count>${formatNumber(rows.length)} احتياجًا</span>
        <span>مرتبة حسب الأولوية التشغيلية: غير المغطى ثم الجزئي ثم قيد التواصل.</span>
        ${projectFilter !== "all" || typeFilter !== "all" || statusFilter !== "all" ? `<a class="link-more" href="${hrefFor({})}">مسح الفلاتر ${icon("x", { size: 13 })}</a>` : ""}
      </div>

      <section class="card">
        <div class="card-body table-wrap" data-needs-table>
          ${
            rows.length
              ? `<table class="table">
                  <thead>
                    <tr>
                      <th>الاحتياج</th>
                      <th>المشروع</th>
                      <th>المطلوب / المتفق</th>
                      <th>التغطية</th>
                      <th>الطلبات</th>
                      <th>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows
                      .map(
                        (row) => `
                          <tr data-need-row data-search="${escapeHtml(normalizeArabic(`${row.need.title} ${row.need.details} ${row.project.title} ${row.project.region}`))}">
                            <td data-label="الاحتياج">
                              <div class="table-stack">
                                <strong>${escapeHtml(row.need.title)}</strong>
                                <span class="cluster">${badge(SUPPORT_TYPES.find((type) => type.key === row.need.type)?.shortLabel || row.need.type, "outline")} ${priorityBadge(row.need.priority)}</span>
                              </div>
                            </td>
                            <td data-label="المشروع">
                              <a class="table-link" href="#/association/projects/${row.project.id}">${escapeHtml(row.project.title)}</a>
                              <span class="muted micro">${escapeHtml(row.project.region)}</span>
                            </td>
                            <td data-label="المطلوب / المتفق">
                              <div class="table-stack">
                                <strong>${row.need.requiredQuantity != null ? formatQty(row.need.requiredQuantity, row.need.unit) : "تعهد وصفي"}</strong>
                                <span class="muted micro">${row.need.requiredQuantity != null ? `${formatQty(row.coverage.agreedQuantity, row.need.unit)} تم الاتفاق` : `${formatNumber(row.coverage.confirmedContributions.length)} مساهمة`}</span>
                              </div>
                            </td>
                            <td data-label="التغطية">
                              <div class="table-stack" style="min-width:130px">
                                ${coverageBadge(row.coverage.status)}
                                ${row.need.requiredQuantity != null ? progressBar(row.coverage.percent, row.coverage.status === "covered" ? "success" : "brand", "", `${formatNumber(row.coverage.percent)}%`) : ""}
                              </div>
                            </td>
                            <td data-label="الطلبات">
                              <div class="table-stack">
                                <strong>${formatNumber(row.requests.total)}</strong>
                                <span class="muted micro">${formatNumber(row.requests.active)} نشط · ${formatNumber(row.requests.agreed)} اتفاق</span>
                              </div>
                            </td>
                            <td data-label="إجراء">
                              <div class="cluster">
                                <a class="btn btn-outline btn-sm" href="#/association/partners?project=${row.project.id}&need=${row.need.id}">ترشيح جهة</a>
                                <a class="btn btn-ghost btn-sm" href="#/association/requests?project=${row.project.id}&need=${row.need.id}">${icon("inbox", { size: 14 })}</a>
                              </div>
                            </td>
                          </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
                <div class="search-empty" data-search-empty hidden>
                  ${emptyState({ iconName: "search", title: "لا نتائج لهذا البحث", description: "جرّب كلمة أخرى أو امسح البحث." })}
                </div>`
              : emptyState({
                  iconName: "list-checks",
                  title: "لا توجد احتياجات مطابقة",
                  description: "عدّل الفلاتر أو أضف احتياجًا من صفحة المشروع.",
                  action: `<a class="btn btn-outline" href="#/association/projects">${icon("folder-kanban", { size: 16 })} فتح المشاريع</a>`
                })
          }
        </div>
      </section>
    `,
    mount(root) {
      const search = root.querySelector("[data-need-search]");
      const rows = [...root.querySelectorAll("[data-need-row]")];
      const count = root.querySelector("[data-results-count]");
      const empty = root.querySelector("[data-search-empty]");
      search?.addEventListener("input", () => {
        const value = normalizeArabic(search.value || "");
        let visible = 0;
        rows.forEach((row) => {
          const matches = !value || row.dataset.search.includes(value);
          row.hidden = !matches;
          if (matches) visible += 1;
        });
        if (count) count.textContent = `${visible.toLocaleString("ar-EG", { numberingSystem: "latn" })} احتياجًا`;
        if (empty) empty.hidden = visible > 0 || !value;
      });
      root.querySelectorAll("[data-filter]").forEach((select) => {
        select.addEventListener("change", () => {
          navigateTo(hrefFor({ ...query, [select.dataset.filter]: select.value }));
        });
      });
    }
  };
}
