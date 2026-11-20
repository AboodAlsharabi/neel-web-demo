import { getCurrentSupporter, getState } from "../../store.js";
import { getNeedCoverage, getProjectById, getNeedById } from "../../services/projects.js";
import { getRequestById } from "../../services/requests.js";
import {
  escapeHtml,
  formatDate,
  formatNumber,
  formatQty,
  navigateTo,
  normalizeArabic
} from "../../utils.js";
import { pageHeader, emptyState, progressBar } from "../../components/ui.js";
import { badge, contributionBadge, demoBadge, requestBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";

export function renderSupporterContributions(ctx) {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const query = ctx.query || {};
  const statusFilter = query.status || "all";
  const projectFilter = query.project || "all";

  const allContributions = state.contributions
    .filter((contribution) => contribution.supporterId === supporter.id && contribution.state !== "cancelled")
    .sort((a, b) => new Date(b.updatedAt || b.agreedAt) - new Date(a.updatedAt || a.agreedAt));

  const contributions = allContributions.filter((contribution) => {
    if (projectFilter !== "all" && contribution.projectId !== projectFilter) return false;
    if (statusFilter === "pending" && contribution.confirmed !== false) return false;
    if (statusFilter === "confirmed" && contribution.confirmed === false) return false;
    if (statusFilter === "completed" && contribution.state !== "completed") return false;
    if (statusFilter === "in_progress" && contribution.state !== "in_progress") return false;
    return true;
  });

  const projectIds = [...new Set(allContributions.map((contribution) => contribution.projectId))];
  const projects = projectIds.map((id) => getProjectById(state, id)).filter(Boolean);
  const confirmed = allContributions.filter((contribution) => contribution.confirmed !== false);
  const completed = confirmed.filter((contribution) => contribution.state === "completed").length;
  const inProgress = confirmed.filter((contribution) => contribution.state === "in_progress").length;
  const pending = allContributions.filter((contribution) => contribution.confirmed === false).length;

  const hrefFor = (next) => {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    return `#/supporter/contributions${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return {
    title: "مساهماتي",
    html: `
      ${pageHeader({
        eyebrow: "التعاون",
        title: "مساهماتي",
        description: "كل تعهد سجلته جهتك، وحالته داخل المحاكاة. العروض غير المؤكدة لا تدخل في تغطية الاحتياج.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>${formatNumber(allContributions.length)} مساهمة</span>`,
        actions: `<a class="btn btn-outline" href="#/supporter/discover">${icon("search", { size: 16 })} اكتشاف مشاريع</a>`
      })}

      <div class="stat-grid stat-grid-4">
        ${[
          ["alert-circle", "بانتظار التأكيد", pending, "warning"],
          ["handshake", "مؤكدة", confirmed.length, "success"],
          ["clock", "قيد التنفيذ", inProgress, "info"],
          ["badge-check", "مكتملة", completed, "success"]
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

      ${pending ? `<div class="note-strip is-warning">${icon("alert-triangle", { size: 18 })}<div><strong>${formatNumber(pending)} عرض بانتظار تأكيد الجمعية.</strong> يظهر العرض في ملفك، لكنه لا يُحتسب ضمن التغطية حتى تؤكده الجمعية.</div></div>` : ""}

      <div class="filter-bar">
        <div class="filter-search">
          ${icon("search", { size: 18 })}
          <input class="input" type="search" placeholder="ابحث في المساهمات" data-contribution-search aria-label="بحث في المساهمات">
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
            <span class="sr-only">الحالة</span>
            <select class="select" data-filter="status">
              <option value="all">كل الحالات</option>
              <option value="pending"${statusFilter === "pending" ? " selected" : ""}>بانتظار التأكيد</option>
              <option value="confirmed"${statusFilter === "confirmed" ? " selected" : ""}>مؤكدة</option>
              <option value="in_progress"${statusFilter === "in_progress" ? " selected" : ""}>قيد التنفيذ</option>
              <option value="completed"${statusFilter === "completed" ? " selected" : ""}>مكتملة</option>
            </select>
          </label>
        </div>
      </div>

      <div class="results-meta">
        <span data-results-count>${formatNumber(contributions.length)} مساهمة</span>
        ${projectFilter !== "all" || statusFilter !== "all" ? `<a class="link-more" href="${hrefFor({})}">مسح الفلاتر ${icon("x", { size: 13 })}</a>` : ""}
      </div>

      ${
        contributions.length
          ? `<div class="alliance-grid" data-contribution-grid>
              ${contributions
                .map((contribution) => {
                  const project = getProjectById(state, contribution.projectId);
                  const need = getNeedById(state, contribution.needId);
                  const organization = state.organizations.find((item) => item.id === project?.organizationId);
                  const request = getRequestById(state, contribution.requestId);
                  const coverage = need ? getNeedCoverage(state, need) : null;
                  return `
                    <article class="alliance-card${contribution.confirmed === false ? " is-pending" : ""}" data-contribution-card data-search="${escapeHtml(normalizeArabic(`${project?.title || ""} ${need?.title || ""} ${organization?.name || ""} ${contribution.description || ""}`))}">
                      <div class="alliance-card-head">
                        <div class="cluster">
                          <span class="org-mark">${icon("building-2", { size: 20 })}</span>
                          <div>
                            <h2>${escapeHtml(organization?.name || "جمعية")}</h2>
                            <span>${escapeHtml(project?.title || "مشروع")}</span>
                          </div>
                        </div>
                        ${contribution.confirmed === false ? badge("بانتظار التأكيد", "warning", "alert-circle") : contributionBadge(contribution.state)}
                      </div>
                      <div class="alliance-card-body">
                        <div class="alliance-need">
                          <span>الاحتياج</span>
                          <strong>${escapeHtml(need?.title || "احتياج")}</strong>
                        </div>
                        <div class="alliance-qty">
                          <span>المساهمة المسجلة</span>
                          <strong>${contribution.quantity != null ? formatQty(contribution.quantity, contribution.unit) : "تعهد وصفي"}</strong>
                        </div>
                        ${contribution.description ? `<p class="alliance-desc">${escapeHtml(contribution.description)}</p>` : ""}
                        ${coverage && need?.requiredQuantity != null ? progressBar(coverage.percent, coverage.status === "covered" ? "success" : "brand", "تغطية الاحتياج", `${formatNumber(coverage.percent)}%`) : ""}
                        <div class="meta-line">
                          ${request ? requestBadge(request.status) : ""}
                          <span class="muted micro">${icon("calendar", { size: 12 })} ${formatDate(contribution.proposedDate || contribution.agreedAt)}</span>
                        </div>
                      </div>
                      <div class="alliance-card-foot">
                        ${request ? `<a class="btn btn-outline btn-sm" href="#/supporter/messages?request=${encodeURIComponent(request.id)}">${icon("message-square", { size: 14 })} المحادثة</a>` : ""}
                        <a class="btn btn-ghost btn-sm" href="#/supporter/projects/${contribution.projectId}">فتح المشروع ${icon("chevron-left", { size: 14 })}</a>
                      </div>
                    </article>`;
                })
                .join("")}
            </div>
            <div class="search-empty" data-search-empty hidden>
              ${emptyState({ iconName: "search", title: "لا نتائج لهذا البحث", description: "جرّب كلمة أخرى أو امسح البحث." })}
            </div>`
          : emptyState({
              iconName: "handshake",
              title: "لا مساهمات مطابقة",
              description: "ابدأ من مشروع يناسب نوع الدعم الذي تقدمه، وسجّل عرض مساهمة داخل المحاكاة.",
              action: `<a class="btn btn-primary" href="#/supporter/discover">اكتشاف المشاريع</a>`
            })
      }
    `,
    mount(root) {
      root.querySelectorAll("[data-filter]").forEach((select) => {
        select.addEventListener("change", () => {
          navigateTo(hrefFor({ ...query, [select.dataset.filter]: select.value }));
        });
      });
      const search = root.querySelector("[data-contribution-search]");
      const cards = [...root.querySelectorAll("[data-contribution-card]")];
      const empty = root.querySelector("[data-search-empty]");
      const count = root.querySelector("[data-results-count]");
      search?.addEventListener("input", () => {
        const value = normalizeArabic(search.value || "");
        let visible = 0;
        cards.forEach((card) => {
          const matches = !value || card.dataset.search.includes(value);
          card.hidden = !matches;
          if (matches) visible += 1;
        });
        if (count) count.textContent = `${visible.toLocaleString("ar-EG", { numberingSystem: "latn" })} مساهمة`;
        if (empty) empty.hidden = visible > 0 || !value;
      });
    }
  };
}
