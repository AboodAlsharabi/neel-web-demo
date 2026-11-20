import { commit, getCurrentSupporter, getState } from "../../store.js";
import { getSupporterMetrics } from "../../services/reporting.js";
import {
  CATEGORIES,
  REGIONS,
  SUPPORTER_KINDS,
  SUPPORT_TYPES
} from "../../constants.js";
import {
  clearFormErrors,
  escapeHtml,
  getCheckedValues,
  formatNumber,
  setFormError
} from "../../utils.js";
import { pageHeader, avatar, note } from "../../components/ui.js";
import { badge, demoBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";

const CAPACITY_FIELDS = [
  ["trainers", "مدربون", "مدربًا"],
  ["workshops", "ورش", "ورشة"],
  ["devices", "أجهزة", "جهازًا"],
  ["opportunities", "فرص تدريب عملي", "فرصة"],
  ["sessions", "جلسات خبرة", "جلسة"],
  ["packages", "حزم خدمات", "حزمة"],
  ["fundingPrograms", "برامج تمويل وصفي", "برنامجًا"]
];

export function renderSupporterProfile() {
  const state = getState();
  const supporter = getCurrentSupporter(state);
  const metrics = getSupporterMetrics(state);

  return {
    title: "ملف الجهة",
    html: `
      ${pageHeader({
        eyebrow: "الحساب",
        title: "ملف الجهة الداعمة",
        description: "هذا الملف هو أساس الترشيحات: نوع الدعم والمجالات والمناطق والقدرة المعلنة. حدّثه لتصبح الاقتراحات أدق.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>${escapeHtml(supporter.kind)}</span>`,
        actions: `<a class="btn btn-outline" href="#/supporter/settings">${icon("settings", { size: 16 })} الإعدادات</a>`
      })}

      <div class="profile-layout">
        <aside class="card profile-summary">
          <div class="card-body">
            ${avatar(supporter.name, { size: "lg" })}
            <h2>${escapeHtml(supporter.name)}</h2>
            <p>${escapeHtml(supporter.kind)} · ${escapeHtml(supporter.regions.join("، "))}</p>
            <div class="tag-row">
              ${supporter.supportTypes.map((type) => badge(SUPPORT_TYPES.find((item) => item.key === type)?.shortLabel || type, "brand")).join("")}
            </div>
            <div class="profile-stats">
              <div><strong>${formatNumber(metrics.suitableProjects.length)}</strong><span>مشروعًا مناسبًا</span></div>
              <div><strong>${formatNumber(metrics.incoming.length)}</strong><span>طلبًا واردًا</span></div>
              <div><strong>${formatNumber(metrics.confirmedContributions.length)}</strong><span>مساهمة مؤكدة</span></div>
            </div>
            <div class="divider"></div>
            <div class="info-panel">${icon("sparkles", { size: 16 })} <span>كلما كان الملف أوضح، كانت درجات التطابق أكثر قابلية للتفسير.</span></div>
          </div>
        </aside>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>بيانات الجهة</h2>
              <p>تُحفظ محليًا وتستخدم في الترشيح والمقارنة داخل المحاكاة.</p>
            </div>
          </div>
          <form id="supporter-profile-form" class="card-body" novalidate>
            <div class="form-grid">
              <div class="field span-2" data-field="name">
                <label for="sup-name">اسم الجهة <span class="req">*</span></label>
                <input class="input" id="sup-name" name="name" value="${escapeHtml(supporter.name)}">
                <p class="field-error"></p>
              </div>
              <div class="field">
                <label for="sup-kind">نوع الجهة</label>
                <select class="select" id="sup-kind" name="kind">
                  ${SUPPORTER_KINDS.map((kind) => `<option value="${escapeHtml(kind)}"${supporter.kind === kind ? " selected" : ""}>${escapeHtml(kind)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label for="sup-email">البريد التجريبي</label>
                <input class="input" id="sup-email" name="email" type="email" value="${escapeHtml(supporter.email || "")}" dir="ltr">
              </div>
              <div class="field span-2" data-field="about">
                <label for="sup-about">نبذة عن الجهة <span class="req">*</span></label>
                <textarea class="textarea" id="sup-about" name="about" rows="3">${escapeHtml(supporter.about || "")}</textarea>
                <p class="field-error"></p>
              </div>
              <div class="field span-2" data-field="supportTypes">
                <span class="field-label">أنواع الدعم التي تقدمها <span class="req">*</span></span>
                <div class="check-grid">
                  ${SUPPORT_TYPES.map(
                    (type) => `
                      <label class="check">
                        <input type="checkbox" name="supportTypes" value="${type.key}"${supporter.supportTypes.includes(type.key) ? " checked" : ""}>
                        <span>${icon(type.icon, { size: 15 })} ${type.label}</span>
                      </label>`
                  ).join("")}
                </div>
                <p class="field-error"></p>
              </div>
              <div class="field span-2" data-field="regions">
                <span class="field-label">المناطق التي تخدمها <span class="req">*</span></span>
                <div class="check-grid is-inline">
                  ${REGIONS.map(
                    (region) => `
                      <label class="check">
                        <input type="checkbox" name="regions" value="${escapeHtml(region)}"${supporter.regions.includes(region) ? " checked" : ""}>
                        <span>${escapeHtml(region)}</span>
                      </label>`
                  ).join("")}
                </div>
                <p class="field-error"></p>
              </div>
              <div class="field span-2">
                <span class="field-label">مجالات الاهتمام</span>
                <div class="check-grid">
                  ${CATEGORIES.map(
                    (category) => `
                      <label class="check">
                        <input type="checkbox" name="categories" value="${escapeHtml(category)}"${supporter.categories.includes(category) ? " checked" : ""}>
                        <span>${escapeHtml(category)}</span>
                      </label>`
                  ).join("")}
                </div>
              </div>
              <div class="field span-2">
                <label for="sup-capacity-notes">وصف القدرة المعلنة</label>
                <textarea class="textarea" id="sup-capacity-notes" name="capacityNotes" rows="2">${escapeHtml(supporter.capacityNotes || "")}</textarea>
                <p class="field-hint">لا تَعِد بأكثر مما تستطيع تقديمه فعلًا. الأرقام هنا تجريبية.</p>
              </div>
            </div>

            <div class="divider"></div>
            <h3 class="small-strong">القدرة الكمية المعلنة</h3>
            <p class="muted small" style="margin-block-end:10px">تُستخدم في حساب درجة التطابق فقط. اتركها صفرًا إذا لم تكن واضحة.</p>
            <div class="capacity-grid">
              ${CAPACITY_FIELDS.map(
                ([key, label, unit]) => `
                  <div class="field">
                    <label for="capacity-${key}">${label}</label>
                    <input class="input" id="capacity-${key}" name="capacity-${key}" type="number" min="0" step="1" value="${Number(supporter.capacity?.[key] || 0)}">
                    <p class="field-hint">${unit}</p>
                  </div>`
              ).join("")}
            </div>

            ${note("بيانات تجريبية", "لا تضع بيانات تواصل حقيقية أو أسماء شركاء غير موافقين. كل هذا الملف محلي ووهمي.", { tone: "warning", iconName: "shield-check" })}
            <div class="form-actions">
              <a class="btn btn-ghost" href="#/supporter/overview">إلغاء</a>
              <button type="submit" class="btn btn-primary">${icon("check", { size: 16 })} حفظ الملف</button>
            </div>
          </form>
        </section>
      </div>
    `,
    mount(root) {
      const form = root.querySelector("#supporter-profile-form");
      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        clearFormErrors(form);
        const name = form.querySelector("#sup-name");
        const about = form.querySelector("#sup-about");
        const supportTypesField = form.querySelector('[data-field="supportTypes"]');
        const regionsField = form.querySelector('[data-field="regions"]');
        let valid = true;
        if (name.value.trim().length < 3) {
          setFormError(name.closest(".field"), "اسم الجهة مطلوب.");
          valid = false;
        }
        if (about.value.trim().length < 20) {
          setFormError(about.closest(".field"), "اكتب نبذة أوضح (20 حرفًا على الأقل).");
          valid = false;
        }
        const supportTypes = getCheckedValues(form, "supportTypes");
        const regions = getCheckedValues(form, "regions");
        if (!supportTypes.length) {
          setFormError(supportTypesField, "اختر نوع دعم واحدًا على الأقل.");
          valid = false;
        }
        if (!regions.length) {
          setFormError(regionsField, "اختر منطقة واحدة على الأقل.");
          valid = false;
        }
        if (!valid) {
          showToast("راجع الحقول المحددة قبل الحفظ.", { title: "بيانات تحتاج مراجعة", tone: "warning" });
          return;
        }
        commit((currentState) => {
          const target = currentState.supporters.find((item) => item.id === supporter.id);
          if (!target) return;
          target.name = name.value.trim();
          target.kind = form.querySelector("#sup-kind").value;
          target.email = form.querySelector("#sup-email").value.trim();
          target.about = about.value.trim();
          target.supportTypes = supportTypes;
          target.regions = regions;
          target.categories = getCheckedValues(form, "categories");
          target.capacityNotes = form.querySelector("#sup-capacity-notes").value.trim();
          target.capacity = Object.fromEntries(
            CAPACITY_FIELDS.map(([key]) => [key, Number(form.querySelector(`#capacity-${key}`).value) || 0])
          );
        });
        showToast("حُفظ ملف الجهة داخل المحاكاة، وأُعيد حساب درجات التطابق.", { title: "تم الحفظ", tone: "success" });
      });
    }
  };
}
