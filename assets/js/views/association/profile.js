import { commit, getCurrentOrganization, getState } from "../../store.js";
import { getProjectsForOrganization, getProjectCoverage } from "../../services/projects.js";
import { getRequestsForRole } from "../../services/requests.js";
import { CATEGORIES, REGIONS } from "../../constants.js";
import {
  clearFormErrors,
  escapeHtml,
  getCheckedValues,
  setFormError,
  formatNumber
} from "../../utils.js";
import { pageHeader, avatar, note } from "../../components/ui.js";
import { badge, demoBadge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { showToast } from "../../components/toast.js";

export function renderAssociationProfile() {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const projects = getProjectsForOrganization(state, organization.id);
  const requests = getRequestsForRole(state, "association");
  const needs = projects.flatMap((project) => getProjectCoverage(state, project.id).items);

  return {
    title: "ملف الجمعية",
    html: `
      ${pageHeader({
        eyebrow: "الحساب",
        title: "ملف الجمعية",
        description: "هذا الملف يظهر داخل المحاكاة للجهات الداعمة عند فتح مشاريعك. حافظ على وصف واضح ومختصر.",
        meta: `${demoBadge()}<span class="meta-dot"></span><span>آخر تحديث ${new Date(state.meta.updatedAt).toLocaleDateString("ar", { numberingSystem: "latn" })}</span>`,
        actions: `<a class="btn btn-outline" href="#/association/settings">${icon("settings", { size: 16 })} الإعدادات</a>`
      })}

      <div class="profile-layout">
        <aside class="card profile-summary">
          <div class="card-body">
            ${avatar(organization.name, { size: "lg" })}
            <h2>${escapeHtml(organization.name)}</h2>
            <p>${escapeHtml(organization.type)} · ${escapeHtml(organization.city)}</p>
            <div class="tag-row">${organization.fields.map((field) => badge(field, "outline")).join("")}</div>
            <div class="profile-stats">
              <div><strong>${formatNumber(projects.length)}</strong><span>مشروعًا</span></div>
              <div><strong>${formatNumber(needs.length)}</strong><span>احتياجًا</span></div>
              <div><strong>${formatNumber(requests.length)}</strong><span>طلب تعاون</span></div>
            </div>
            <div class="divider"></div>
            <div class="info-panel">${icon("eye", { size: 16 })} <span>بيانات الملف تجريبية، ولا تُرسل إلى أي جهة خارجية.</span></div>
          </div>
        </aside>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>بيانات الملف</h2>
              <p>حدّث المعلومات داخل المحاكاة. التغييرات تُحفظ محليًا بعد الضغط على حفظ.</p>
            </div>
          </div>
          <form id="organization-profile-form" class="card-body" novalidate>
            <div class="form-grid">
              <div class="field span-2" data-field="name">
                <label for="org-name">اسم الجمعية <span class="req">*</span></label>
                <input class="input" id="org-name" name="name" value="${escapeHtml(organization.name)}">
                <p class="field-error"></p>
              </div>
              <div class="field">
                <label for="org-type">نوع الجهة</label>
                <input class="input" id="org-type" name="type" value="${escapeHtml(organization.type || "جمعية")}">
              </div>
              <div class="field">
                <label for="org-city">المدينة</label>
                <select class="select" id="org-city" name="city">
                  ${REGIONS.map((city) => `<option value="${escapeHtml(city)}"${organization.city === city ? " selected" : ""}>${escapeHtml(city)}</option>`).join("")}
                </select>
              </div>
              <div class="field span-2" data-field="about">
                <label for="org-about">نبذة عن الجمعية <span class="req">*</span></label>
                <textarea class="textarea" id="org-about" name="about" rows="4">${escapeHtml(organization.about)}</textarea>
                <p class="field-hint">اذكر الفئة التي تخدمها وما يميز تجربتك، بدون ادعاءات غير موثقة.</p>
                <p class="field-error"></p>
              </div>
              <div class="field span-2">
                <label for="org-youth">نطاق خدمة الشباب</label>
                <input class="input" id="org-youth" name="youthScope" value="${escapeHtml(organization.youthScope || "")}" placeholder="مثال: الشباب من 18 إلى 30 سنة">
              </div>
              <div class="field span-2">
                <span class="field-label">مجالات العمل</span>
                <div class="check-grid">
                  ${CATEGORIES.map(
                    (field) => `
                      <label class="check">
                        <input type="checkbox" name="fields" value="${escapeHtml(field)}"${organization.fields.includes(field) ? " checked" : ""}>
                        <span>${escapeHtml(field)}</span>
                      </label>`
                  ).join("")}
                </div>
              </div>
              <div class="field">
                <label for="org-email">البريد التجريبي</label>
                <input class="input" id="org-email" name="email" type="email" value="${escapeHtml(organization.email || "")}" dir="ltr" placeholder="demo@example.demo">
              </div>
              <div class="field">
                <label for="org-phone">الهاتف التجريبي</label>
                <input class="input" id="org-phone" name="phone" value="${escapeHtml(organization.phone || "")}" dir="ltr" placeholder="0500000000">
              </div>
              <div class="field span-2">
                <label for="org-website">الموقع التجريبي</label>
                <input class="input" id="org-website" name="website" value="${escapeHtml(organization.website || "")}" dir="ltr" placeholder="https://example.demo">
              </div>
            </div>
            ${note("لا تضع بيانات حقيقية", "هذه محاكاة عامة. استخدم بريدًا وهاتفًا تجريبيًا فقط، ولا تُدخل أسماء مستفيدين أو معلومات حساسة.", { tone: "warning", iconName: "shield-check" })}
            <div class="form-actions">
              <a class="btn btn-ghost" href="#/association/overview">إلغاء</a>
              <button type="submit" class="btn btn-primary">${icon("check", { size: 16 })} حفظ الملف</button>
            </div>
          </form>
        </section>
      </div>
    `,
    mount(root) {
      const form = root.querySelector("#organization-profile-form");
      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        clearFormErrors(form);
        const name = form.querySelector("#org-name");
        const about = form.querySelector("#org-about");
        let valid = true;
        if (name.value.trim().length < 3) {
          setFormError(name.closest(".field"), "اسم الجمعية مطلوب.");
          valid = false;
        }
        if (about.value.trim().length < 20) {
          setFormError(about.closest(".field"), "اكتب نبذة أوضح (20 حرفًا على الأقل).");
          valid = false;
        }
        if (!valid) {
          showToast("راجع الحقول المحددة قبل الحفظ.", { title: "بيانات تحتاج مراجعة", tone: "warning" });
          return;
        }
        commit((currentState) => {
          const target = currentState.organizations.find((item) => item.id === organization.id);
          if (!target) return;
          target.name = name.value.trim();
          target.type = form.querySelector("#org-type").value.trim() || "جمعية";
          target.city = form.querySelector("#org-city").value;
          target.about = about.value.trim();
          target.youthScope = form.querySelector("#org-youth").value.trim();
          target.fields = getCheckedValues(form, "fields");
          target.email = form.querySelector("#org-email").value.trim();
          target.phone = form.querySelector("#org-phone").value.trim();
          target.website = form.querySelector("#org-website").value.trim();
        });
        showToast("حُفظ ملف الجمعية داخل المحاكاة.", { title: "تم الحفظ", tone: "success" });
      });
    }
  };
}
