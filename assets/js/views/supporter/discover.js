import { commit, getCurrentSupporter, getState } from "../../store.js";
import {
  getDiscoverableProjects,
  getNeedsForProject,
  getProjectCoverage,
  isProjectSaved,
  toggleSavedProject
} from "../../services/projects.js";
import { rankProjectsForSupporter } from "../../services/matching.js";
import { CATEGORIES, REGIONS, SUPPORT_TYPES, SUPPORT_TYPE_MAP } from "../../constants.js";
import {
  escapeHtml,
  formatNumber,
  navigateTo,
  normalizeArabic,
  truncate
} from "../../utils.js";
import { pageHeader, progressBar, emptyState } from "../../components/ui.js";
import { badge, demoBadge, matchBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";

function buildHref(query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });
  return `#/supporter/discover${params.toString() ? `?${params.toString()}` : ""}`;
}

export function renderSupporterDiscover(ctx) {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const query = ctx.query || {};
  const supportFilter = query.support || "all";
  const regionFilter = query.region || "all";
  const categoryFilter = query.category || "all";
  const targetFilter = query.target || "all";
  const needsFilter = query.needs || "all";
  const sort = query.sort || "match";

  const matchesTarget = (targetYouth) => {
    if (targetFilter === "upTo50") return targetYouth <= 50;
    if (targetFilter === "from51to100") return targetYouth > 50 && targetYouth <= 100;
    if (targetFilter === "over100") return targetYouth > 100;
    return true;
  };

  const projects = getDiscoverableProjects(state).filter((project) => {
    if (regionFilter !== "all" && project.region !== regionFilter) return false;
    if (categoryFilter !== "all" && project.category !== categoryFilter) return false;
    if (!matchesTarget(Number(project.targetYouth))) return false;
    if (supportFilter !== "all") {
      const needs = getNeedsForProject(state, project.id);
      if (!needs.some((need) => need.type === supportFilter)) return false;
    }
    if (needsFilter === "unresolved") {
      const coverage = getProjectCoverage(state, project.id);
      if (!coverage.counts.unresolved) return false;
    }
    return true;
  });

  const ranked = rankProjectsForSupporter(state, projects, supporter);
  if (sort === "recent") {
    ranked.sort((a, b) => new Date(b.project.publishedAt || b.project.createdAt) - new Date(a.project.publishedAt || a.project.createdAt));
  } else if (sort === "unresolved") {
    ranked.sort((a, b) => getProjectCoverage(state, b.project.id).counts.unresolved - getProjectCoverage(state, a.project.id).counts.unresolved);
  }

  const allDiscoverable = getDiscoverableProjects(state);
  const savedCount = state.savedProjects.filter((item) => item.supporterId === supporter.id).length;

  return {
    title: "اكتشاف المشاريع",
    html: `
      ${pageHeader({
        eyebrow: "الاكتشاف",
        title: "اكتشف احتياجات يمكنك دعمها",
        description: "كل مشروع هنا منشور تجريبيًا ويعرض احتياجاته بوضوح. درجة التطابق تساعدك على المقارنة، وليست التزامًا أو ضمانًا.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>${formatNumber(allDiscoverable.length)} مشروعًا منشورًا</span><span class="meta-dot"></span><span>${formatNumber(savedCount)} محفوظًا</span>`,
        actions: `<a class="btn btn-outline" href="#/supporter/saved">${icon("bookmark", { size: 16 })} المحفوظات</a>`
      })}

      <div class="filter-bar">
        <div class="filter-search">
          ${icon("search", { size: 18 })}
          <input class="input" type="search" placeholder="ابحث باسم المشروع أو الوصف" data-discover-search aria-label="بحث في المشاريع">
        </div>
        <div class="filter-controls">
          <label class="select-wrap">
            <span class="sr-only">نوع الدعم</span>
            <select class="select" data-filter="support">
              <option value="all">كل أنواع الدعم</option>
              ${SUPPORT_TYPES.map((type) => `<option value="${type.key}"${supportFilter === type.key ? " selected" : ""}>${type.label}</option>`).join("")}
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">المنطقة</span>
            <select class="select" data-filter="region">
              <option value="all">كل المناطق</option>
              ${REGIONS.map((region) => `<option value="${escapeHtml(region)}"${regionFilter === region ? " selected" : ""}>${escapeHtml(region)}</option>`).join("")}
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">المجال</span>
            <select class="select" data-filter="category">
              <option value="all">كل المجالات</option>
              ${CATEGORIES.map((category) => `<option value="${escapeHtml(category)}"${categoryFilter === category ? " selected" : ""}>${escapeHtml(category)}</option>`).join("")}
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">عدد المستفيدين المستهدف</span>
            <select class="select" data-filter="target">
              <option value="all">كل الأحجام</option>
              <option value="upTo50"${targetFilter === "upTo50" ? " selected" : ""}>حتى 50 مستفيدًا</option>
              <option value="from51to100"${targetFilter === "from51to100" ? " selected" : ""}>من 51 إلى 100</option>
              <option value="over100"${targetFilter === "over100" ? " selected" : ""}>أكثر من 100</option>
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">الاحتياجات غير المغطاة</span>
            <select class="select" data-filter="needs">
              <option value="all">كل المشاريع</option>
              <option value="unresolved"${needsFilter === "unresolved" ? " selected" : ""}>لديها احتياجات غير مغطاة</option>
            </select>
          </label>
          <label class="select-wrap">
            <span class="sr-only">الترتيب</span>
            <select class="select" data-filter="sort">
              <option value="match"${sort === "match" ? " selected" : ""}>أنسب لك</option>
              <option value="recent"${sort === "recent" ? " selected" : ""}>الأحدث</option>
              <option value="unresolved"${sort === "unresolved" ? " selected" : ""}>الأكثر احتياجًا</option>
            </select>
          </label>
        </div>
      </div>

      <div class="results-meta">
        <span data-results-count>${formatNumber(ranked.length)} مشروعًا</span>
        <span>${supporter.name} · ${escapeHtml(supporter.kind)}</span>
        ${supportFilter !== "all" || regionFilter !== "all" || categoryFilter !== "all" || targetFilter !== "all" || needsFilter !== "all" ? `<a class="link-more" href="${buildHref({})}">مسح الفلاتر ${icon("x", { size: 13 })}</a>` : ""}
      </div>

      <div class="discover-grid" data-discover-grid>
        ${
          ranked.length
            ? ranked
                .map(({ project, match }) => {
                  const needs = getNeedsForProject(state, project.id);
                  const coverage = getProjectCoverage(state, project.id);
                  const saved = isProjectSaved(state, supporter.id, project.id);
                  const organization = state.organizations.find((item) => item.id === project.organizationId);
                  return `
                    <article class="discover-card" data-discover-card data-search="${escapeHtml(normalizeArabic(`${project.title} ${project.description} ${organization?.name || ""} ${project.region} ${project.category}`))}">
                      <div class="discover-card-cover">
                        <div class="spread">
                          <span class="badge is-outline">${escapeHtml(project.category)}</span>
                          <button type="button" class="save-btn${saved ? " is-saved" : ""}" data-save="${project.id}" aria-label="${saved ? "إزالة من المحفوظات" : "حفظ المشروع"}" aria-pressed="${saved}">
                            ${icon("bookmark", { size: 17 })}
                          </button>
                        </div>
                        <h2><a href="#/supporter/projects/${project.id}">${escapeHtml(project.title)}</a></h2>
                        <p>${escapeHtml(truncate(project.description, 130))}</p>
                        <div class="meta-line">
                          <span>${icon("map-pin", { size: 13 })} ${escapeHtml(project.region)}</span>
                          <span>${icon("building-2", { size: 13 })} ${escapeHtml(organization?.name || "جمعية")}</span>
                        </div>
                      </div>
                      <div class="discover-card-body">
                        <div class="spread">
                          ${match.score > 0 ? matchBadge(match.label, match.tone) : badge("لا تطابق واضح", "neutral")}
                          <span class="muted micro">${match.score > 0 ? `${formatNumber(match.score)}/100 تطابق` : "راجع التفاصيل"}</span>
                        </div>
                        <div class="discover-needs">
                          ${needs
                            .slice(0, 3)
                            .map((need) => {
                              const needCoverage = coverage.items.find((item) => item.need.id === need.id)?.coverage;
                              const relevant = supporter.supportTypes.includes(need.type);
                              return `<div class="discover-need-row">
                                <span>${icon(SUPPORT_TYPE_MAP[need.type]?.icon || "layers", { size: 14 })} ${escapeHtml(need.title)}</span>
                                ${relevant ? badge("نوع دعمك", "brand") : needCoverage ? badge(needCoverage.status === "covered" ? "مكتمل" : "مفتوح", needCoverage.status === "covered" ? "success" : "outline") : ""}
                              </div>`;
                            })
                            .join("")}
                          ${needs.length > 3 ? `<span class="muted micro">+${formatNumber(needs.length - 3)} احتياجات أخرى</span>` : ""}
                        </div>
                        ${progressBar(coverage.progressPercent, coverage.progressPercent >= 60 ? "success" : "brand", "تغطية الاحتياجات", `${formatNumber(coverage.progressPercent)}%`)}
                        ${
                          match.reasons.length
                            ? `<div class="partner-reasons">
                                ${match.reasons.slice(0, 2).map((reason) => `<div class="partner-reason">${icon("check", { size: 13 })}<span>${escapeHtml(reason)}</span></div>`).join("")}
                              </div>`
                            : ""
                        }
                      </div>
                      <div class="discover-card-foot">
                        <span class="muted micro">${formatNumber(coverage.counts.unresolved)} احتياجًا مفتوحًا</span>
                        <a class="btn btn-primary btn-sm" href="#/supporter/projects/${project.id}">عرض التفاصيل ${icon("chevron-left", { size: 14 })}</a>
                      </div>
                    </article>`;
                })
                .join("")
            : emptyState({
                iconName: "search",
                title: "لا مشاريع مطابقة",
                description: "جرّب تغيير نوع الدعم أو المنطقة، أو امسح الفلاتر لعرض كل المشاريع.",
                action: `<a class="btn btn-outline" href="${buildHref({})}">مسح الفلاتر</a>`
              })
        }
      </div>
      <div class="search-empty" data-search-empty hidden>
        ${emptyState({ iconName: "search", title: "لا نتائج لهذا البحث", description: "جرّب كلمة أخرى أو امسح البحث." })}
      </div>
    `,
    mount(root) {
      root.querySelectorAll("[data-save]").forEach((button) => {
        button.addEventListener("click", () => {
          let saved = false;
          commit((currentState) => {
            saved = toggleSavedProject(currentState, supporter.id, button.dataset.save);
          });
          showToast(saved ? "حُفظ المشروع في قائمتك المحلية." : "أُزيل المشروع من المحفوظات.", {
            title: saved ? "تم الحفظ" : "تمت الإزالة",
            tone: "success"
          });
        });
      });

      root.querySelectorAll("[data-filter]").forEach((select) => {
        select.addEventListener("change", () => {
          navigateTo(buildHref({ ...query, [select.dataset.filter]: select.value }));
        });
      });

      const search = root.querySelector("[data-discover-search]");
      const cards = [...root.querySelectorAll("[data-discover-card]")];
      const count = root.querySelector("[data-results-count]");
      const empty = root.querySelector("[data-search-empty]");
      search?.addEventListener("input", () => {
        const value = normalizeArabic(search.value || "");
        let visible = 0;
        cards.forEach((card) => {
          const matches = !value || card.dataset.search.includes(value);
          card.hidden = !matches;
          if (matches) visible += 1;
        });
        if (count) count.textContent = `${visible.toLocaleString("ar-EG", { numberingSystem: "latn" })} مشروعًا`;
        if (empty) empty.hidden = visible > 0 || !value;
      });
    }
  };
}
