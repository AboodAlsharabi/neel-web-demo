import { commit, getCurrentOrganization, getState } from "../../store.js";
import {
  confirmContribution,
  getPendingOffersForRole,
  updateContributionState
} from "../../services/requests.js";
import {
  getNeedCoverage,
  getNeedById,
  getProjectById,
  getProjectsForOrganization
} from "../../services/projects.js";
import {
  escapeHtml,
  formatDate,
  formatNumber,
  formatQty,
  navigateTo,
  normalizeArabic
} from "../../utils.js";
import { pageHeader, emptyState, progressBar, avatar } from "../../components/ui.js";
import { badge, contributionBadge, demoBadge, coverageBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";

export function renderAssociationAlliances(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const query = ctx.query || {};
  const projectFilter = query.project || "all";
  const statusFilter = query.status || "all";

  const projects = getProjectsForOrganization(state, organization.id);
  const projectIds = new Set(projects.map((project) => project.id));
  const pendingOffers = getPendingOffersForRole(state, "association");

  const contributions = state.contributions
    .filter((contribution) => projectIds.has(contribution.projectId) && contribution.state !== "cancelled")
    .filter((contribution) => {
      if (projectFilter !== "all" && contribution.projectId !== projectFilter) return false;
      if (statusFilter === "pending" && contribution.confirmed !== false) return false;
      if (statusFilter === "confirmed" && contribution.confirmed === false) return false;
      if (statusFilter === "completed" && contribution.state !== "completed") return false;
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt || b.agreedAt) - new Date(a.updatedAt || a.agreedAt));

  const confirmed = state.contributions.filter(
    (contribution) => projectIds.has(contribution.projectId) && contribution.confirmed !== false && contribution.state !== "cancelled"
  );
  const completed = confirmed.filter((contribution) => contribution.state === "completed").length;
  const inProgress = confirmed.filter((contribution) => contribution.state === "in_progress").length;

  const hrefFor = (next) => {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    return `#/association/alliances${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return {
    title: "الشراكات والمساهمات",
    html: `
      ${pageHeader({
        eyebrow: "التعاون",
        title: "الشراكات والمساهمات",
        description: "تأكيد العروض هنا هو ما يجعلها ضمن تغطية الاحتياج. لا ينتج عن أي مساهمة دفعة أو تحويل مالي في المحاكاة.",
        actions: `<a class="btn btn-outline" href="#/association/requests">${icon("inbox", { size: 16 })} طلبات التعاون</a>`
      })}

      <div class="stat-grid stat-grid-4">
        ${[
          ["alert-circle", "عروض بانتظار التأكيد", pendingOffers.length, "warning"],
          ["handshake", "مساهمات مؤكدة", confirmed.length, "success"],
          ["clock", "قيد التنفيذ", inProgress, "info"],
          ["badge-check", "اكتملت", completed, "success"]
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
        pendingOffers.length
          ? `<div class="note-strip is-warning">
              ${icon("alert-triangle", { size: 18 })}
              <div><strong>${formatNumber(pendingOffers.length)} عرض مساهمة لا يدخل في التغطية بعد.</strong> راجع الوصف والكمية ثم أكّد العرض ليُحتسب داخل الاحتياج.</div>
            </div>`
          : ""
      }

      <div class="filter-bar">
        <div class="filter-search">
          ${icon("search", { size: 18 })}
          <input class="input" type="search" placeholder="ابحث باسم الجهة أو الاحتياج" data-alliance-search aria-label="بحث في المساهمات">
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
              <option value="completed"${statusFilter === "completed" ? " selected" : ""}>مكتملة</option>
            </select>
          </label>
        </div>
      </div>

      ${(projectFilter !== "all" || statusFilter !== "all") ? `<div class="active-filter-strip">${icon("filter", { size: 14 })}<span>فلاتر مفعلة</span><a class="link-more" href="${hrefFor({})}">مسح ${icon("x", { size: 12 })}</a></div>` : ""}

      <div class="results-meta">
        <span data-results-count>${formatNumber(contributions.length)} مساهمة</span>
        <span>${formatNumber(pendingOffers.length)} عرض معلق</span>
      </div>

      ${
        contributions.length
          ? `<div class="alliance-grid" data-alliance-grid>
              ${contributions
                .map((contribution) => {
                  const supporter = state.supporters.find((item) => item.id === contribution.supporterId);
                  const project = getProjectById(state, contribution.projectId);
                  const need = getNeedById(state, contribution.needId);
                  const coverage = need ? getNeedCoverage(state, need) : null;
                  return `
                    <article class="alliance-card${contribution.confirmed === false ? " is-pending" : ""}" data-alliance-card data-search="${escapeHtml(normalizeArabic(`${supporter?.name || ""} ${need?.title || ""} ${project?.title || ""} ${contribution.description || ""}`))}">
                      <div class="alliance-card-head">
                        <div class="cluster">
                          ${avatar(supporter?.name || "جهة داعمة")}
                          <div>
                            <h2>${escapeHtml(supporter?.name || "جهة داعمة")}</h2>
                            <span>${escapeHtml(supporter?.kind || "جهة داعمة")}</span>
                          </div>
                        </div>
                        ${contribution.confirmed === false ? badge("بانتظار التأكيد", "warning", "alert-circle") : contributionBadge(contribution.state)}
                      </div>
                      <div class="alliance-card-body">
                        <div class="alliance-need">
                          <span>${escapeHtml(project?.title || "مشروع")}</span>
                          <strong>${escapeHtml(need?.title || "احتياج")}</strong>
                        </div>
                        <div class="alliance-qty">
                          <span>المساهمة</span>
                          <strong>${contribution.quantity != null ? formatQty(contribution.quantity, contribution.unit) : "تعهد وصفي"}</strong>
                        </div>
                        ${contribution.description ? `<p class="alliance-desc">${escapeHtml(contribution.description)}</p>` : ""}
                        ${coverage && need?.requiredQuantity != null ? progressBar(coverage.percent, coverage.status === "covered" ? "success" : "brand", "تغطية الاحتياج", `${formatNumber(coverage.percent)}%`) : ""}
                        <div class="meta-line">
                          ${coverage ? coverageBadge(coverage.status) : ""}
                          <span class="muted micro">${formatDate(contribution.proposedDate || contribution.agreedAt)}</span>
                        </div>
                      </div>
                      <div class="alliance-card-foot">
                        ${
                          contribution.confirmed === false
                            ? `<button type="button" class="btn btn-primary btn-sm" data-confirm="${contribution.id}">${icon("check", { size: 15 })} تأكيد المساهمة</button>`
                            : `<label class="select-wrap">
                                <span class="sr-only">حالة التنفيذ</span>
                                <select class="select select-sm" data-state="${contribution.id}">
                                  <option value="not_started"${contribution.state === "not_started" ? " selected" : ""}>لم يبدأ</option>
                                  <option value="in_progress"${contribution.state === "in_progress" ? " selected" : ""}>جارٍ</option>
                                  <option value="completed"${contribution.state === "completed" ? " selected" : ""}>اكتمل</option>
                                </select>
                              </label>`
                        }
                        <a class="btn btn-ghost btn-sm" href="#/association/projects/${contribution.projectId}">فتح المشروع ${icon("chevron-left", { size: 14 })}</a>
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
              title: "لا توجد مساهمات مطابقة",
              description: "ابدأ ترشيح جهة داعمة، أو عدّل الفلاتر لعرض مساهمات أخرى.",
              action: `<a class="btn btn-outline" href="#/association/needs">${icon("list-checks", { size: 16 })} فتح الاحتياجات</a>`
            })
      }
    `,
    mount(root) {
      root.querySelectorAll("[data-confirm]").forEach((button) => {
        button.addEventListener("click", () => {
          commit((currentState) => {
            confirmContribution(currentState, button.dataset.confirm, "association");
          });
          showToast("تم تأكيد عرض المساهمة وأصبحت جزءًا من تغطية الاحتياج.", { title: "تم التأكيد", tone: "success" });
        });
      });

      root.querySelectorAll("[data-state]").forEach((select) => {
        select.addEventListener("change", () => {
          commit((currentState) => {
            updateContributionState(currentState, select.dataset.state, select.value);
          });
          showToast("تم تحديث حالة تنفيذ المساهمة.", { title: "تم التحديث", tone: "success" });
        });
      });

      root.querySelectorAll("[data-filter]").forEach((select) => {
        select.addEventListener("change", () => {
          navigateTo(hrefFor({ ...query, [select.dataset.filter]: select.value }));
        });
      });

      const search = root.querySelector("[data-alliance-search]");
      const cards = [...root.querySelectorAll("[data-alliance-card]")];
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
