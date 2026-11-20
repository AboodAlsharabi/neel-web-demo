import { commit, getCurrentOrganization, getState } from "../../store.js";
import {
  addNeedToProject,
  getNeedCoverage,
  getProjectById,
  getProjectCoverage,
  getProjectOutcomes,
  getProjectRequests,
  getProjectSurveys,
  publishProject
} from "../../services/projects.js";
import {
  confirmContribution,
  getRequestCounterpartName,
  updateContributionState
} from "../../services/requests.js";
import {
  getOutcomeRows,
  getSurveySummary
} from "../../services/reporting.js";
import { METRIC_COLORS, OUTCOME_METRICS, SUPPORT_TYPES } from "../../constants.js";
import {
  escapeHtml,
  formatDate,
  formatAgreedOfRequired,
  formatDateTime,
  formatNumber,
  formatQty,
  navigateTo,
  todayISO
} from "../../utils.js";
import { pageHeader, donutChart, progressBar, emptyState, sectionTitle, note } from "../../components/ui.js";
import { badge, coverageBadge, contributionBadge, demoBadge, priorityBadge, projectStatusBadge, requestBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { openModal } from "../../components/modal.js";
import { showToast } from "../../components/toast.js";
import { openOutcomeModal, openSurveyModal } from "../shared/actions.js";

const UNIT_FOR_TYPE = {
  training: "trainer",
  devices: "device",
  funding: "",
  internship: "opportunity",
  expertise: "session",
  services: "package"
};

export function renderAssociationProjectDetail(ctx) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const project = getProjectById(state, ctx.params.id);

  if (!project || project.organizationId !== organization.id) {
    return {
      title: "المشروع غير موجود",
      html: emptyState({
        iconName: "folder-open",
        title: "لم نجد هذا المشروع",
        description: "قد يكون الرابط قديمًا أو أن المشروع ليس ضمن مشاريع هذه الجمعية.",
        action: `<a class="btn btn-primary" href="#/association/projects">العودة إلى المشاريع</a>`
      }),
      mount() {}
    };
  }

  const coverage = getProjectCoverage(state, project.id);
  const requests = getProjectRequests(state, project.id);
  const outcomes = getProjectOutcomes(state, project.id);
  const surveys = getSurveySummary(state, project.id);
  const outcomeRows = getOutcomeRows(state, project);
  const counts = coverage.counts;
  const projectContributions = state.contributions.filter(
    (contribution) => contribution.projectId === project.id && contribution.state !== "cancelled"
  );

  const requestsByNeed = new Map();
  requests.forEach((request) => {
    if (!requestsByNeed.has(request.needId)) requestsByNeed.set(request.needId, []);
    requestsByNeed.get(request.needId).push(request);
  });

  const contributionsByNeed = new Map();
  projectContributions.forEach((contribution) => {
    if (!contributionsByNeed.has(contribution.needId)) contributionsByNeed.set(contribution.needId, []);
    contributionsByNeed.get(contribution.needId).push(contribution);
  });

  const openNeeds = coverage.items.filter((item) => item.coverage.status !== "covered").length;
  const pendingOffers = projectContributions.filter((contribution) => contribution.confirmed === false);

  return {
    title: project.title,
    html: `
      ${pageHeader({
        eyebrow: "تفاصيل المشروع",
        title: escapeHtml(project.title),
        description: escapeHtml(project.description),
        meta: `
          ${projectStatusBadge(project.status)}
          ${demoBadge()}
          <span class="meta-dot"></span>
          <span class="cluster">${icon("map-pin", { size: 14 })} ${escapeHtml(project.region)}</span>
          <span class="meta-dot"></span>
          <span class="cluster">${icon("layers", { size: 14 })} ${escapeHtml(project.category)}</span>
          <span class="meta-dot"></span>
          <span class="cluster">${icon("users", { size: 14 })} ${formatNumber(project.targetYouth)} شابًا مستهدفًا</span>
        `,
        actions: `
          <a class="btn btn-ghost" href="#/association/projects">${icon("arrow-right", { size: 16 })} كل المشاريع</a>
          <a class="btn btn-outline" href="#/association/partners?project=${project.id}">${icon("users", { size: 16 })} ترشيح جهة داعمة</a>
          ${project.status === "draft" ? `<button type="button" class="btn btn-primary" data-action="publish-project">${icon("send", { size: 16 })} نشر المشروع</button>` : `<a class="btn btn-primary" href="#/association/stories?project=${project.id}">${icon("megaphone", { size: 16 })} قصة المشروع</a>`}
          <button type="button" class="btn btn-secondary" data-action="add-need">${icon("plus", { size: 16 })} احتياج جديد</button>
        `
      })}

      ${project.status === "draft" ? note("مسودة غير منشورة", "لن يظهر هذا المشروع في صفحة اكتشاف الجهات الداعمة قبل النشر. يمكنك إضافة الاحتياجات أولًا ثم النشر.", { tone: "warning", iconName: "file-text" }) : ""}

      ${
        pendingOffers.length
          ? `<div class="note-strip is-warning">
              ${icon("alert-triangle", { size: 18 })}
              <div><strong>${formatNumber(pendingOffers.length)} عرض مساهمة بانتظار تأكيدك.</strong> لن تُحتسب هذه العروض في التغطية حتى تؤكدها من قائمة الاحتياجات أدناه.</div>
            </div>`
          : ""
      }

      <section class="card open-needs-card">
        <div class="card-head">
          <div>
            <h2>ما زال المشروع يحتاجه</h2>
            <p>تُحدَّث هذه البطاقة من التغطية الفعلية بعد كل اتفاق أو طلب.</p>
          </div>
        </div>
        <div class="card-body">
          ${
            coverage.items.every((item) => item.coverage.status === "covered")
              ? `<p class="empty-inline">اكتملت كل الاحتياجات المتابعة في هذا المشروع.</p>`
              : `<div class="open-needs-list">
                  ${coverage.items
                    .filter((item) => item.coverage.status !== "covered")
                    .map(({ need, coverage: needCoverage }) => {
                      const quantityText = need.requiredQuantity != null
                        ? formatAgreedOfRequired(needCoverage.agreedQuantity, needCoverage.requiredQuantity, need.unit)
                        : "تعهد وصفي";
                      const statusText = needCoverage.status === "partial"
                        ? "مغطى جزئيًا"
                        : needCoverage.status === "in_talk"
                          ? "قيد التواصل"
                          : "لم يُغطَّ بعد";
                      const remainingText = need.requiredQuantity != null && needCoverage.remainingQuantity > 0
                        ? `${formatQty(needCoverage.remainingQuantity, need.unit)} متبقٍ`
                        : "";
                      return `
                        <div class="open-need-row">
                          <strong>${escapeHtml(need.title)}</strong>
                          <span>${quantityText} — ${statusText}${remainingText ? ` · ${remainingText}` : ""}</span>
                        </div>`;
                    })
                    .join("")}
                </div>`
          }
        </div>
      </section>

      <div class="stat-grid">
        ${[
          ["badge-check", "احتياجات مكتملة", counts.covered, "success", ""],
          ["message-square", "قيد التواصل", counts.in_talk, "info", ""],
          ["circle-half", "مغطى جزئيًا", counts.partial, "warning", ""],
          ["circle-dashed", "غير مغطى", counts.uncovered, "neutral", openNeeds ? `${formatNumber(openNeeds)} تحتاج خطوة` : "كل الاحتياجات مكتملة"]
        ]
          .map(
            ([iconName, label, value, tone, noteText]) => `
              <article class="stat-card">
                <div class="stat-top"><span class="stat-icon is-${tone === "neutral" ? "brand" : tone}">${icon(iconName, { size: 19 })}</span></div>
                <div class="stat-value">${formatNumber(value)}</div>
                <div class="stat-label">${label}</div>
                ${noteText ? `<div class="stat-note">${noteText}</div>` : ""}
              </article>`
          )
          .join("")}
      </div>

      <div class="dashboard-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <h2>تغطية المشروع</h2>
              <p>${formatNumber(counts.covered)} من ${formatNumber(counts.total)} احتياجًا مكتمل.</p>
            </div>
          </div>
          <div class="card-body">
            <div class="donut-layout">
              ${donutChart(
                [
                  { label: "تم الاتفاق", value: counts.covered, color: METRIC_COLORS.covered },
                  { label: "مغطى جزئيًا", value: counts.partial, color: METRIC_COLORS.partial },
                  { label: "قيد التواصل", value: counts.in_talk, color: METRIC_COLORS.in_talk },
                  { label: "غير مغطى", value: counts.uncovered, color: METRIC_COLORS.uncovered }
                ],
                {
                  centerValue: `${formatNumber(coverage.progressPercent)}%`,
                  centerLabel: "اكتمال",
                  ariaLabel: `تغطية المشروع ${counts.covered} مكتمل، ${counts.partial} جزئي، ${counts.in_talk} قيد التواصل، ${counts.uncovered} غير مغطى.`
                }
              )}
              <div class="donut-legend">
                <div class="legend-row"><span class="legend-dot is-covered">${icon("badge-check", { size: 13 })}</span><span>تم الاتفاق</span><strong>${formatNumber(counts.covered)}</strong></div>
                <div class="legend-row"><span class="legend-dot is-partial">${icon("circle-half", { size: 13 })}</span><span>مغطى جزئيًا</span><strong>${formatNumber(counts.partial)}</strong></div>
                <div class="legend-row"><span class="legend-dot is-in-talk">${icon("message-square", { size: 13 })}</span><span>قيد التواصل</span><strong>${formatNumber(counts.in_talk)}</strong></div>
                <div class="legend-row"><span class="legend-dot is-uncovered">${icon("circle-dashed", { size: 13 })}</span><span>غير مغطى</span><strong>${formatNumber(counts.uncovered)}</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>ملخص المشروع</h2>
              <p>كل الأرقام من بيانات المحاكاة المحلية.</p>
            </div>
          </div>
          <div class="card-body">
            <dl class="detail-list">
              <div><dt>الفئة المستهدفة</dt><dd>${escapeHtml(project.audience || "غير محددة")}</dd></div>
              <div><dt>المدة</dt><dd>${escapeHtml(project.duration || "غير محددة")}</dd></div>
              <div><dt>تاريخ الإنشاء</dt><dd>${formatDate(project.createdAt)}</dd></div>
              <div><dt>تاريخ النشر</dt><dd>${project.publishedAt ? formatDate(project.publishedAt) : "لم يُنشر بعد"}</dd></div>
              <div><dt>طلبات التعاون</dt><dd>${formatNumber(requests.length)} طلبًا</dd></div>
              <div><dt>مساهمات مسجلة</dt><dd>${formatNumber(projectContributions.length)}</dd></div>
            </dl>
            ${
              project.availableResources?.length
                ? `<div class="divider"></div><h3 class="small-strong">موارد متاحة لدى الجمعية</h3><div class="tag-row">${project.availableResources.map((resource) => badge(resource, "outline")).join("")}</div>`
                : ""
            }
            ${project.status === "published" ? `<div class="info-panel" style="margin-block-start:14px">${icon("eye", { size: 16 })}<span>هذا المشروع ظاهر في صفحة «اكتشاف الجهات الداعمة» للدور الآخر.</span></div>` : ""}
          </div>
        </section>
      </div>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>الاحتياجات</h2>
            <p>لكل احتياج حالة مشتقة ومسار مستقل. أضف احتياجًا أو رشّح جهة مناسبة.</p>
          </div>
          <span class="badge is-outline">${formatNumber(coverage.items.length)} احتياجًا</span>
        </div>
        <div class="card-body">
          ${
            coverage.items.length
              ? `<div class="stack-12">
                  ${coverage.items
                    .map(({ need, coverage: needCoverage }) => {
                      const needRequests = requestsByNeed.get(need.id) || [];
                      const needContributions = contributionsByNeed.get(need.id) || [];
                      const pending = needContributions.filter((contribution) => contribution.confirmed === false);
                      const confirmed = needContributions.filter((contribution) => contribution.confirmed !== false);
                      return `
                        <article class="need-card">
                          <div class="need-card-head">
                            <div class="need-card-title">
                              <span class="support-icon">${icon(SUPPORT_TYPES.find((type) => type.key === need.type)?.icon || "layers", { size: 19 })}</span>
                              <div>
                                <h3>${escapeHtml(need.title)}</h3>
                                <div class="meta-line">
                                  ${badge(SUPPORT_TYPES.find((type) => type.key === need.type)?.label || need.type, "outline")}
                                  ${priorityBadge(need.priority)}
                                  ${need.dueDate ? `<span class="muted micro">${icon("calendar", { size: 12 })} ${formatDate(need.dueDate)}</span>` : ""}
                                </div>
                              </div>
                            </div>
                            ${coverageBadge(needCoverage.status)}
                          </div>
                          ${need.details ? `<p class="need-details">${escapeHtml(need.details)}</p>` : ""}
                          <div class="need-coverage-row">
                            <div class="need-qty">
                              <span>${need.requiredQuantity != null ? "المطلوب" : "نوع التغطية"}</span>
                              <strong>${need.requiredQuantity != null ? formatQty(need.requiredQuantity, need.unit) : "تعهد وصفي"}</strong>
                            </div>
                            <div class="need-qty">
                              <span>تم الاتفاق</span>
                              <strong>${need.requiredQuantity != null ? formatQty(needCoverage.agreedQuantity, need.unit) : needCoverage.confirmedContributions.length ? "مساهمة مسجلة" : "لا يوجد"}</strong>
                            </div>
                            <div class="need-qty">
                              <span>طلبات نشطة</span>
                              <strong>${formatNumber(needCoverage.activeRequests.length)}</strong>
                            </div>
                            <div class="need-qty">
                              <span>عروض معلقة</span>
                              <strong>${formatNumber(needCoverage.pendingContributions.length)}</strong>
                            </div>
                          </div>
                          ${need.requiredQuantity != null ? progressBar(needCoverage.percent, needCoverage.status === "covered" ? "success" : "brand", "نسبة التغطية", `${formatNumber(needCoverage.percent)}%`) : ""}

                          ${
                            pending.length
                              ? `<div class="pending-offers">
                                  <div class="pending-offers-head">${icon("alert-circle", { size: 15 })} عروض بانتظار تأكيدك</div>
                                  ${pending
                                    .map(
                                      (offer) => `
                                        <div class="pending-offer-row">
                                          <div>
                                            <strong>${escapeHtml(state.supporters.find((item) => item.id === offer.supporterId)?.name || "جهة داعمة")}</strong>
                                            <span>${offer.quantity != null ? formatQty(offer.quantity, offer.unit) : "تعهد وصفي"} · ${escapeHtml(offer.description || "بدون وصف")}</span>
                                          </div>
                                          <button type="button" class="btn btn-secondary btn-sm" data-confirm-offer="${offer.id}">${icon("check", { size: 14 })} تأكيد</button>
                                        </div>`
                                    )
                                    .join("")}
                                </div>`
                              : ""
                          }

                          ${
                            confirmed.length
                              ? `<div class="contribution-line-list">
                                  ${confirmed
                                    .map(
                                      (contribution) => `
                                        <div class="contribution-line">
                                          <span>${icon("handshake", { size: 14 })} ${escapeHtml(state.supporters.find((item) => item.id === contribution.supporterId)?.name || "جهة داعمة")} — ${contribution.quantity != null ? formatQty(contribution.quantity, contribution.unit) : "تعهد وصفي"}</span>
                                          <span class="cluster">
                                            ${contributionBadge(contribution.state)}
                                            <select class="select select-sm" data-contribution-state="${contribution.id}" aria-label="تحديث حالة المساهمة">
                                              <option value="not_started"${contribution.state === "not_started" ? " selected" : ""}>لم يبدأ</option>
                                              <option value="in_progress"${contribution.state === "in_progress" ? " selected" : ""}>جارٍ</option>
                                              <option value="completed"${contribution.state === "completed" ? " selected" : ""}>اكتمل</option>
                                            </select>
                                          </span>
                                        </div>`
                                    )
                                    .join("")}
                                </div>`
                              : ""
                          }

                          <div class="need-card-actions">
                            <a class="btn btn-outline btn-sm" href="#/association/partners?project=${project.id}&need=${need.id}">${icon("users", { size: 15 })} ترشيح جهة</a>
                            <a class="btn btn-ghost btn-sm" href="#/association/requests?project=${project.id}&need=${need.id}">${icon("inbox", { size: 15 })} الطلبات (${formatNumber(needRequests.length)})</a>
                          </div>
                        </article>`;
                    })
                    .join("")}
                </div>`
              : emptyState({
                  iconName: "list-checks",
                  title: "لا توجد احتياجات بعد",
                  description: "أضف أول احتياج ليبدأ المشروع في الظهور كفرصة تعاون واضحة.",
                  action: `<button type="button" class="btn btn-primary" data-action="add-need">${icon("plus", { size: 16 })} إضافة احتياج</button>`
                })
          }
        </div>
      </section>

      <div class="dashboard-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <h2>طلبات التعاون</h2>
              <p>آخر الطلبات المرتبطة بهذا المشروع.</p>
            </div>
            <a class="link-more" href="#/association/requests?project=${project.id}">كل الطلبات ${icon("chevron-left", { size: 13 })}</a>
          </div>
          <div class="card-body">
            ${
              requests.length
                ? `<div class="compact-list">
                    ${requests
                      .slice(0, 5)
                      .map((request) => {
                        const need = state.needs.find((item) => item.id === request.needId);
                        return `
                          <a class="compact-row" href="#/association/messages?request=${encodeURIComponent(request.id)}">
                            <span class="compact-main">
                              <strong>${escapeHtml(getRequestCounterpartName(state, request, "association"))}</strong>
                              <span>${escapeHtml(need?.title || "احتياج")}</span>
                            </span>
                            <span class="compact-side">${requestBadge(request.status)}<small>${formatDate(request.createdAt)}</small></span>
                          </a>`;
                      })
                      .join("")}
                  </div>`
                : `<div class="mini-empty">${icon("inbox", { size: 22 })}<div><strong>لا توجد طلبات تعاون</strong><p>ابدأ بترشيح جهة داعمة من الاحتياجات أعلاه.</p></div></div>`
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>النتائج والشباب</h2>
              <p>أرقام مستهدفة ونتائج مسجلة تجريبيًا مع مصدرها.</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="add-outcome">${icon("plus", { size: 15 })} تسجيل نتيجة</button>
          </div>
          <div class="card-body">
            ${
              outcomes.length
                ? `<div class="outcome-mini-list">
                    ${outcomeRows
                      .filter((row) => row.recorded)
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
                : `<div class="mini-empty">${icon("chart-no-axes-column", { size: 22 })}<div><strong>لم تُسجل نتائج بعد</strong><p>افصل بين الهدف والنتيجة، وأضف مصدر المعلومة دائمًا.</p></div></div>`
            }
            ${
              surveys.count
                ? `<div class="divider"></div>
                   <div class="spread">
                     <div>
                       <h3 class="small-strong">استبيان غير معرّف</h3>
                       <p class="muted micro">${formatNumber(surveys.count)} ردًا مجمعًا، بدون أسماء أو هواتف.</p>
                     </div>
                     <a class="link-more" href="#/association/stories?project=${project.id}">عرض القصة ${icon("chevron-left", { size: 13 })}</a>
                   </div>`
                : `<div class="info-panel" style="margin-block-start:14px">${icon("shield-check", { size: 16 })} <span>يمكن جمع رأي الشباب عبر استبيان قصير غير معرّف فقط.</span></div>`
            }
            <div class="cluster" style="margin-block-start:14px">
              <button type="button" class="btn btn-ghost btn-sm" data-action="add-survey">${icon("clipboard-list", { size: 15 })} إضافة رد استبيان تجريبي</button>
            </div>
          </div>
        </section>
      </div>
    `,
    mount(root) {
      root.querySelector('[data-action="publish-project"]')?.addEventListener("click", () => {
        commit((currentState) => {
          publishProject(currentState, project.id);
        });
        showToast("نُشر المشروع داخل المحاكاة وأصبح ظاهرًا في صفحة الاكتشاف.", { title: "تم النشر", tone: "success" });
        navigateTo(`/association/projects/${project.id}`);
      });

      const addNeed = () => openAddNeedModal(project);
      root.querySelectorAll('[data-action="add-need"]').forEach((button) => {
        button.addEventListener("click", addNeed);
      });

      root.querySelector('[data-action="add-outcome"]')?.addEventListener("click", () => {
        openOutcomeModal({ project });
      });
      root.querySelector('[data-action="add-survey"]')?.addEventListener("click", () => {
        openSurveyModal({ project });
      });

      root.querySelectorAll("[data-confirm-offer]").forEach((button) => {
        button.addEventListener("click", () => {
          commit((currentState) => {
            confirmContribution(currentState, button.dataset.confirmOffer, "association");
          });
          showToast("تم تأكيد عرض المساهمة، وأصبحت الكمية ضمن تغطية الاحتياج.", { title: "تم التأكيد", tone: "success" });
        });
      });

      root.querySelectorAll("[data-contribution-state]").forEach((select) => {
        select.addEventListener("change", () => {
          commit((currentState) => {
            updateContributionState(currentState, select.dataset.contributionState, select.value);
          });
          showToast("تم تحديث حالة تنفيذ المساهمة داخل المحاكاة.", { title: "تم التحديث", tone: "success" });
        });
      });
    }
  };
}

function openAddNeedModal(project) {
  openModal({
    title: "إضافة احتياج للمشروع",
    description: project.title,
    size: "wide",
    body: `
      <form id="add-need-form" novalidate>
        <div class="form-grid">
          <div class="field">
            <label for="new-need-type">نوع الدعم</label>
            <select class="select" id="new-need-type" name="type">
              ${SUPPORT_TYPES.map((type) => `<option value="${type.key}">${type.label}</option>`).join("")}
            </select>
          </div>
          <div class="field" data-field="title">
            <label for="new-need-title">عنوان الاحتياج <span class="req">*</span></label>
            <input class="input" id="new-need-title" name="title" placeholder="مثال: 4 مدربين لمهارات البيانات">
            <p class="field-error"></p>
          </div>
          <div class="field">
            <label for="new-need-quantity">الكمية المطلوبة</label>
            <input class="input" id="new-need-quantity" name="requiredQuantity" type="number" min="1" step="1" placeholder="اتركه فارغًا للدعم الوصفي">
          </div>
          <div class="field">
            <label for="new-need-unit">وحدة القياس</label>
            <input class="input" id="new-need-unit" name="unit" value="trainer" readonly>
          </div>
          <div class="field">
            <label for="new-need-priority">الأولوية</label>
            <select class="select" id="new-need-priority" name="priority">
              <option value="high">عالية</option>
              <option value="medium" selected>متوسطة</option>
              <option value="low">منخفضة</option>
            </select>
          </div>
          <div class="field">
            <label for="new-need-date">الموعد المقترح</label>
            <input class="input" id="new-need-date" name="dueDate" type="date" min="${todayISO()}">
          </div>
          <div class="field span-2">
            <label for="new-need-details">تفاصيل الاحتياج</label>
            <textarea class="textarea" id="new-need-details" name="details" rows="3" placeholder="وصف المؤهلات أو المواصفات."></textarea>
          </div>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn btn-outline" data-cancel>إلغاء</button>
      <button type="button" class="btn btn-primary" data-submit>إضافة الاحتياج</button>
    `,
    onMount: ({ body, footer, close }) => {
      const type = body.querySelector("#new-need-type");
      const unit = body.querySelector("#new-need-unit");
      const syncType = () => {
        unit.value = UNIT_FOR_TYPE[type.value] || "";
      };
      type.addEventListener("change", syncType);
      syncType();
      footer.querySelector("[data-cancel]")?.addEventListener("click", close);
      footer.querySelector("[data-submit]")?.addEventListener("click", () => {
        const title = body.querySelector("#new-need-title");
        const field = body.querySelector('[data-field="title"]');
        field.classList.remove("has-error");
        field.querySelector(".field-error").textContent = "";
        if (title.value.trim().length < 4) {
          field.classList.add("has-error");
          field.querySelector(".field-error").textContent = "اكتب عنوانًا واضحًا للاحتياج.";
          title.focus();
          return;
        }
        commit((currentState) => {
          addNeedToProject(currentState, project.id, {
            type: type.value,
            title: title.value,
            requiredQuantity: body.querySelector("#new-need-quantity").value,
            unit: unit.value || null,
            priority: body.querySelector("#new-need-priority").value,
            dueDate: body.querySelector("#new-need-date").value || null,
            details: body.querySelector("#new-need-details").value
          });
        });
        close();
        showToast("أُضيف الاحتياج إلى المشروع داخل المحاكاة.", { title: "تمت الإضافة", tone: "success" });
      });
    }
  });
}
