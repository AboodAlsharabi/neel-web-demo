import { getCurrentOrganization, getState } from "../../store.js";
import { getProjectCoverage, getProjectsForOrganization, getProjectRequests } from "../../services/projects.js";
import { CATEGORIES } from "../../constants.js";
import { escapeHtml, formatDate, formatNumber, normalizeArabic, truncate, navigateTo } from "../../utils.js";
import { pageHeader, progressBar, emptyState } from "../../components/ui.js";
import { badge, demoBadge, projectStatusBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";

function buildHref(query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });
  const string = params.toString();
  return `#/association/projects${string ? `?${string}` : ""}`;
}

export function renderAssociationProjects(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const query = ctx.query || {};
  const status = query.status || "all";
  const category = query.category || "all";
  const sort = query.sort || "recent";

  const allProjects = getProjectsForOrganization(state, organization.id);
  let projects = allProjects.filter((project) => {
    if (status !== "all" && project.status !== status) return false;
    if (category !== "all" && project.category !== category) return false;
    return true;
  });

  projects = projects.slice().sort((a, b) => {
    if (sort === "unresolved") {
      return getProjectCoverage(state, b.id).counts.unresolved - getProjectCoverage(state, a.id).counts.unresolved;
    }
    if (sort === "title") return a.title.localeCompare(b.title, "ar");
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const published = allProjects.filter((project) => project.status === "published").length;
  const drafts = allProjects.filter((project) => project.status === "draft").length;
  const totalNeeds = allProjects.reduce((sum, project) => sum + getProjectCoverage(state, project.id).counts.total, 0);

  return {
    title: "المشاريع",
    html: `
      ${pageHeader({
        eyebrow: "المشاريع والاحتياجات",
        title: "مشاريع الجمعية",
        description: "كل مشروع هنا مرتبط باحتياجاته وطلبات التعاون والمساهمات. انشر مشروعًا ليظهر في صفحة اكتشاف الجهات الداعمة.",
        actions: `<a class="btn btn-primary" href="#/association/projects/new">${icon("plus", { size: 17 })} مشروع جديد</a>`
      })}

      <div class="filter-bar">
        <div class="filter-search">
          ${icon("search", { size: 18 })}
          <input class="input" type="search" placeholder="ابحث باسم المشروع أو الوصف" data-project-search aria-label="بحث في المشاريع">
        </div>
        <div class="filter-controls">
          <label class="select-wrap">
            <span class="sr-only">الحالة</span>
            <select class="select" data-filter="status">
              <option value="all"${status === "all" ? " selected" : ""}>كل الحالات</option>
              <option value="published"${status === "published" ? " selected" : ""}>منشور (${published})</option>
              <option value="draft"${status === "draft" ? " selected" : ""}>مسودة (${drafts})</option>
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">المجال</span>
            <select class="select" data-filter="category">
              <option value="all"${category === "all" ? " selected" : ""}>كل المجالات</option>
              ${CATEGORIES.map((item) => `<option value="${escapeHtml(item)}"${category === item ? " selected" : ""}>${escapeHtml(item)}</option>`).join("")}
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">الترتيب</span>
            <select class="select" data-filter="sort">
              <option value="recent"${sort === "recent" ? " selected" : ""}>الأحدث</option>
              <option value="unresolved"${sort === "unresolved" ? " selected" : ""}>الأكثر احتياجًا</option>
              <option value="title"${sort === "title" ? " selected" : ""}>أبجديًا</option>
            </select>
          </label>
        </div>
      </div>

      <div class="results-meta">
        <span data-results-count>${formatNumber(projects.length)} مشروعًا</span>
        <span>${formatNumber(published)} منشور · ${formatNumber(drafts)} مسودة · ${formatNumber(totalNeeds)} احتياجًا</span>
        ${status !== "all" || category !== "all" || query.sort ? `<a class="link-more" href="${buildHref({})}">مسح الفلاتر ${icon("x", { size: 13 })}</a>` : ""}
      </div>

      <div class="project-grid" data-project-grid>
        ${
          projects.length
            ? projects
                .map((project) => {
                  const coverage = getProjectCoverage(state, project.id);
                  const requests = getProjectRequests(state, project.id);
                  const activeRequests = requests.filter((request) => !["declined", "closed"].includes(request.status)).length;
                  return `
                    <article class="project-card" data-project-card data-search="${escapeHtml(normalizeArabic(`${project.title} ${project.description} ${project.category} ${project.region}`))}">
                      <div class="project-card-head">
                        <div class="cluster">
                          ${projectStatusBadge(project.status)}
                          ${demoBadge()}
                        </div>
                        <span class="muted micro">${formatDate(project.createdAt)}</span>
                      </div>
                      <div class="project-card-body">
                        <div class="project-card-kicker">${icon("map-pin", { size: 13 })} ${escapeHtml(project.region)} · ${escapeHtml(project.category)}</div>
                        <h2><a href="#/association/projects/${project.id}">${escapeHtml(project.title)}</a></h2>
                        <p>${escapeHtml(truncate(project.description, 135))}</p>
                        <div class="progress-wrap">
                          ${progressBar(coverage.progressPercent, coverage.progressPercent >= 60 ? "success" : "brand", "تغطية الاحتياجات", `${formatNumber(coverage.counts.covered)}/${formatNumber(coverage.counts.total)}`)}
                        </div>
                        <div class="project-stats">
                          <span><strong>${formatNumber(coverage.counts.total)}</strong><small>احتياج</small></span>
                          <span><strong>${formatNumber(coverage.counts.unresolved)}</strong><small>مفتوح</small></span>
                          <span><strong>${formatNumber(activeRequests)}</strong><small>طلب نشط</small></span>
                          <span><strong>${formatNumber(project.targetYouth)}</strong><small>شابًا مستهدفًا</small></span>
                        </div>
                        ${coverage.counts.partial ? `<div class="meta-line">${badge(`${formatNumber(coverage.counts.partial)} احتياج مغطى جزئيًا`, "warning", "circle-half")}</div>` : ""}
                      </div>
                      <div class="project-card-foot">
                        <a class="btn btn-outline btn-sm" href="#/association/projects/${project.id}">${icon("folder-open", { size: 15 })} فتح المشروع</a>
                        ${project.status === "draft" ? `<a class="btn btn-ghost btn-sm" href="#/association/projects/${project.id}">${icon("send", { size: 15 })} إكمال النشر</a>` : `<span class="muted micro">${formatNumber(requests.length)} طلبًا إجمالًا</span>`}
                      </div>
                    </article>`;
                })
                .join("")
            : emptyState({
                iconName: "folder-open",
                title: "لا توجد مشاريع مطابقة",
                description: "جرّب تعديل الفلاتر أو أنشئ مشروعًا جديدًا لتبدأ رحلة الاحتياجات والتعاون.",
                action: `<a class="btn btn-primary" href="#/association/projects/new">${icon("plus", { size: 16 })} إنشاء مشروع</a>`
              })
        }
      </div>

      <div class="search-empty" data-search-empty hidden>
        ${emptyState({
          iconName: "search",
          title: "لا نتائج لهذا البحث",
          description: "جرّب كلمة أخرى أو امسح البحث لعرض كل المشاريع."
        })}
      </div>
    `,
    mount(root) {
      const search = root.querySelector("[data-project-search]");
      const cards = [...root.querySelectorAll("[data-project-card]")];
      const count = root.querySelector("[data-results-count]");
      const empty = root.querySelector("[data-search-empty]");
      const grid = root.querySelector("[data-project-grid]");

      const applySearch = () => {
        const value = normalizeArabic(search.value || "");
        let visible = 0;
        cards.forEach((card) => {
          const matches = !value || card.dataset.search.includes(value);
          card.hidden = !matches;
          if (matches) visible += 1;
        });
        if (count) count.textContent = `${visible.toLocaleString("ar-EG", { numberingSystem: "latn" })} مشروعًا`;
        if (empty) empty.hidden = visible > 0 || !value;
        if (grid) grid.hidden = visible === 0 && Boolean(value);
      };
      search?.addEventListener("input", applySearch);

      root.querySelectorAll("[data-filter]").forEach((select) => {
        select.addEventListener("change", () => {
          const next = { ...query, [select.dataset.filter]: select.value };
          navigateTo(buildHref(next));
        });
      });
    }
  };
}
