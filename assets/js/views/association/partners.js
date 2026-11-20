import { getCurrentOrganization, getState } from "../../store.js";
import {
  getNeedById,
  getNeedCoverage,
  getNeedsForProject,
  getProjectById,
  getProjectsForOrganization
} from "../../services/projects.js";
import { getActiveRequestForPair, getRequestCounterpartName } from "../../services/requests.js";
import { rankSupportersForNeed } from "../../services/matching.js";
import {
  escapeHtml,
  formatNumber,
  formatQty,
  navigateTo,
  normalizeArabic,
  truncate
} from "../../utils.js";
import { pageHeader, avatar, progressBar, emptyState, note } from "../../components/ui.js";
import { badge, coverageBadge, demoBadge, matchBadge, priorityBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { openMatchExplanation, openRequestComposer } from "../shared/actions.js";

function buildHref(query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const string = params.toString();
  return `#/association/partners${string ? `?${string}` : ""}`;
}

export function renderAssociationPartners(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const query = ctx.query || {};
  const projects = getProjectsForOrganization(state, organization.id);
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const allNeeds = projects.flatMap((project) =>
    getNeedsForProject(state, project.id).map((need) => ({
      need,
      project,
      coverage: getNeedCoverage(state, need)
    }))
  );

  const defaultNeed =
    allNeeds.find((item) => item.need.id === query.need && item.coverage.status !== "covered") ||
    allNeeds.find((item) => item.coverage.status === "uncovered") ||
    allNeeds.find((item) => item.coverage.status === "partial") ||
    allNeeds.find((item) => item.coverage.status === "in_talk") ||
    allNeeds[0] ||
    null;

  if (!defaultNeed) {
    return {
      title: "اكتشاف الجهات الداعمة",
      html: `
        ${pageHeader({
          eyebrow: "المشاريع والاحتياجات",
          title: "اكتشاف الجهات الداعمة",
          description: "أضف مشروعًا واحتياجات حتى نتمكن من ترشيح جهات مناسبة."
        })}
        ${emptyState({
          iconName: "users",
          title: "لا توجد احتياجات للترشيح",
          description: "أنشئ مشروعًا وأضف احتياجًا واحدًا على الأقل.",
          action: `<a class="btn btn-primary" href="#/association/projects/new">إنشاء مشروع</a>`
        })}
      `,
      mount() {}
    };
  }

  const need = defaultNeed.need;
  const project = defaultNeed.project;
  const coverage = defaultNeed.coverage;
  const ranked = rankSupportersForNeed(need, project, state.supporters);

  return {
    title: "اكتشاف الجهات الداعمة",
    html: `
      ${pageHeader({
        eyebrow: "المشاريع والاحتياجات",
        title: "من يمكن أن يساعد في هذا الاحتياج؟",
        description: "الترشيحات مبنية على تطابق نوع الدعم والمجال والمنطقة والقدرة المعلنة في البيانات المحلية. النتيجة مساعدة للقرار وليست تنبؤًا.",
        meta: `${demoBadge("درجة محاكاة تجريبية")}<span class="meta-dot"></span><span>${formatNumber(ranked.length)} جهة في الدليل</span>`,
        actions: `<a class="btn btn-outline" href="#/association/agent">${icon("sparkles", { size: 16 })} مساعد نيل</a>`
      })}

      <section class="card need-selector-card">
        <div class="card-body">
          <div class="need-selector-grid">
            <div>
              <span class="field-label">الاحتياج الذي تبحث له عن جهة</span>
              <label class="select-wrap select-wrap-wide">
                <select class="select" data-need-select aria-label="اختر الاحتياج">
                  ${projects
                    .map((item) => {
                      const needs = getNeedsForProject(state, item.id);
                      if (!needs.length) return "";
                      return `<optgroup label="${escapeHtml(item.title)}">
                        ${needs
                          .map((needItem) => {
                            const needCoverage = getNeedCoverage(state, needItem);
                            return `<option value="${needItem.id}"${needItem.id === need.id ? " selected" : ""}>${escapeHtml(needItem.title)} — ${needCoverage.status === "covered" ? "مكتمل" : needCoverage.status === "partial" ? "جزئي" : needCoverage.status === "in_talk" ? "قيد التواصل" : "غير مغطى"}</option>`;
                          })
                          .join("")}
                      </optgroup>`;
                    })
                    .join("")}
                </select>
              </label>
            </div>
            <div class="need-selector-summary">
              <div class="spread">
                <div>
                  <h2>${escapeHtml(need.title)}</h2>
                  <p class="muted small">${escapeHtml(project.title)} · ${escapeHtml(project.region)} · ${escapeHtml(project.category)}</p>
                </div>
                ${coverageBadge(coverage.status)}
              </div>
              <div class="need-selector-meta">
                <span>${badge(need.requiredQuantity != null ? formatQty(need.requiredQuantity, need.unit) : "تعهد وصفي", "outline")}</span>
                ${priorityBadge(need.priority)}
                <span class="muted micro">${formatNumber(coverage.activeRequests.length)} طلب نشط</span>
              </div>
              ${need.requiredQuantity != null ? progressBar(coverage.percent, coverage.status === "covered" ? "success" : "brand", "نسبة التغطية", `${formatNumber(coverage.percent)}%`) : ""}
              <a class="link-more" href="#/association/projects/${project.id}">فتح المشروع ${icon("chevron-left", { size: 13 })}</a>
            </div>
          </div>
        </div>
      </section>

      <div class="filter-bar">
        <div class="filter-search">
          ${icon("search", { size: 18 })}
          <input class="input" type="search" placeholder="ابحث باسم الجهة أو نوع الدعم" data-supporter-search aria-label="بحث في الجهات الداعمة">
        </div>
        <div class="results-meta" style="margin:0">
          <span data-results-count>${formatNumber(ranked.length)} جهة مرتبة</span>
        </div>
      </div>

      ${note("كيف نرتب الترشيحات؟", "نوع الدعم 45 درجة، المجال 25، المنطقة 15، القدرة المعلنة 15. لا نستخدم بيانات اتصال حقيقية، وكل الأرقام من الدليل التجريبي.", { iconName: "info" })}

      <div class="partner-grid" data-partner-grid>
        ${ranked
          .map(({ supporter, evaluation }) => {
            const existingRequest = getActiveRequestForPair(state, organization.id, supporter.id, need.id);
            const pendingOffer = coverage.pendingContributions.find((item) => item.supporterId === supporter.id);
            const previousContributions = state.contributions.filter(
              (contribution) => contribution.supporterId === supporter.id && contribution.projectId !== project.id
            ).length;
            return `
              <article class="partner-card" data-partner-card data-search="${escapeHtml(normalizeArabic(`${supporter.name} ${supporter.kind} ${supporter.regions.join(" ")} ${supporter.supportTypes.join(" ")}`))}">
                <div class="partner-card-head">
                  <div class="cluster">
                    ${avatar(supporter.name)}
                    <div>
                      <h2>${escapeHtml(supporter.name)}</h2>
                      <span>${escapeHtml(supporter.kind)} · ${escapeHtml(supporter.regions.join("، "))}</span>
                    </div>
                  </div>
                  ${matchBadge(evaluation.label, evaluation.tone)}
                </div>
                <div class="partner-score-row">
                  <span class="partner-score">${formatNumber(evaluation.score)}<small>/100</small></span>
                  <span class="muted micro">درجة تطابق تجريبية</span>
                </div>
                <div class="tag-row">
                  ${supporter.supportTypes
                    .slice(0, 5)
                    .map((type) => badge(type === need.type ? `${type === "devices" ? "أجهزة" : type === "training" ? "تدريب" : type === "internship" ? "تدريب عملي" : type === "expertise" ? "خبرة" : type === "services" ? "خدمات" : "تشغيل"} · مطلوب` : type, type === need.type ? "brand" : "outline"))
                    .join("")}
                </div>
                <div class="partner-reasons">
                  ${evaluation.reasons
                    .slice(0, 2)
                    .map((reason) => `<div class="partner-reason">${icon("check", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`)
                    .join("")}
                  ${evaluation.missing
                    .slice(0, 1)
                    .map((reason) => `<div class="partner-reason is-missing">${icon("alert-circle", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`)
                    .join("")}
                </div>
                <div class="partner-foot">
                  <div class="muted micro">
                    ${previousContributions ? `${formatNumber(previousContributions)} مساهمة سابقة داخل المحاكاة` : "لا مساهمات سابقة في المحاكاة"}
                  </div>
                  <div class="cluster">
                    <button type="button" class="btn btn-ghost btn-sm" data-explain="${supporter.id}">${icon("circle-help", { size: 14 })} لماذا؟</button>
                    ${
                      pendingOffer
                        ? `<a class="btn btn-secondary btn-sm" href="#/association/alliances">${icon("alert-circle", { size: 14 })} عرض بانتظارك</a>`
                        : existingRequest
                          ? `<a class="btn btn-outline btn-sm" href="#/association/messages?request=${encodeURIComponent(existingRequest.id)}">${icon("message-square", { size: 14 })} طلب نشط</a>`
                          : `<button type="button" class="btn btn-primary btn-sm" data-request="${supporter.id}">${icon("send", { size: 14 })} إعداد طلب</button>`
                    }
                  </div>
                </div>
              </article>`;
          })
          .join("")}
      </div>

      <div class="search-empty" data-search-empty hidden>
        ${emptyState({ iconName: "search", title: "لا توجد جهة بهذا الاسم", description: "جرّب كلمة أخرى أو امسح البحث." })}
      </div>
    `,
    mount(root) {
      root.querySelector("[data-need-select]")?.addEventListener("change", (event) => {
        navigateTo(buildHref({ need: event.target.value }));
      });

      const supporterById = new Map(state.supporters.map((supporter) => [supporter.id, supporter]));
      root.querySelectorAll("[data-request]").forEach((button) => {
        button.addEventListener("click", () => {
          const supporter = supporterById.get(button.dataset.request);
          if (supporter) openRequestComposer({ project, need, supporter });
        });
      });
      root.querySelectorAll("[data-explain]").forEach((button) => {
        button.addEventListener("click", () => {
          const supporter = supporterById.get(button.dataset.explain);
          if (supporter) openMatchExplanation({ project, need, supporter });
        });
      });

      const search = root.querySelector("[data-supporter-search]");
      const cards = [...root.querySelectorAll("[data-partner-card]")];
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
        if (count) count.textContent = `${visible.toLocaleString("ar-EG", { numberingSystem: "latn" })} جهة مرتبة`;
        if (empty) empty.hidden = visible > 0 || !value;
      });
    }
  };
}
