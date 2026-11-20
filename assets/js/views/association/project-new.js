import { commit, getCurrentOrganization, getState } from "../../store.js";
import { createProject } from "../../services/projects.js";
import { CATEGORIES, REGIONS, SUPPORT_TYPES } from "../../constants.js";
import {
  clearFormErrors,
  escapeHtml,
  getCheckedValues,
  navigateTo,
  setFormError,
  todayISO
} from "../../utils.js";
import { pageHeader, note } from "../../components/ui.js";
import { showToast } from "../../components/toast.js";
import { icon } from "../../components/icons.js";

const UNIT_FOR_TYPE = {
  training: "trainer",
  devices: "device",
  funding: "",
  internship: "opportunity",
  expertise: "session",
  services: "package"
};

const QUANTITY_REQUIRED = ["training", "devices", "internship"];

function needRow(index) {
  return `
    <div class="need-editor-row" data-need-row>
      <div class="need-editor-head">
        <span class="need-index">احتياج ${index}</span>
        <button type="button" class="icon-btn-plain" data-remove-need aria-label="حذف الاحتياج">${icon("trash", { size: 16 })}</button>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>نوع الدعم</label>
          <select class="select" data-need-field="type">
            ${SUPPORT_TYPES.map((type) => `<option value="${type.key}">${type.label}</option>`).join("")}
          </select>
        </div>
        <div class="field" data-field="needTitle">
          <label>عنوان الاحتياج</label>
          <input class="input" data-need-field="title" placeholder="مثال: 4 مدربين لمهارات البيانات">
          <p class="field-error"></p>
        </div>
        <div class="field" data-field="requiredQuantity">
          <label>الكمية المطلوبة <span class="req">*</span></label>
          <input class="input" type="number" min="1" step="1" data-need-field="requiredQuantity" placeholder="مثال: 4">
          <p class="field-error"></p>
        </div>
        <div class="field">
          <label>وحدة القياس</label>
          <input class="input" data-need-field="unit" value="trainer" readonly>
        </div>
        <div class="field">
          <label>الأولوية</label>
          <select class="select" data-need-field="priority">
            <option value="high">عالية</option>
            <option value="medium" selected>متوسطة</option>
            <option value="low">منخفضة</option>
          </select>
        </div>
        <div class="field">
          <label>الموعد المقترح</label>
          <input class="input" type="date" data-need-field="dueDate" min="${todayISO()}">
        </div>
        <div class="field span-2">
          <label>تفاصيل تساعد الجهة على الفهم</label>
          <textarea class="textarea" rows="2" data-need-field="details" placeholder="صف المؤهلات أو المواصفات أو طريقة التنفيذ."></textarea>
        </div>
      </div>
    </div>`;
}

export function renderAssociationProjectNew() {
  const state = getState();
  const organization = getCurrentOrganization(state);

  return {
    title: "مشروع جديد",
    html: `
      ${pageHeader({
        eyebrow: "مشروع جديد",
        title: "حوّل حاجة ميدانية إلى مشروع واضح",
        description: "أنشئ المشروع، أضف احتياجاته، ثم احفظه كمسودة أو انشره لاحقًا. النشر داخل المحاكاة يجعله ظاهرًا في صفحة اكتشاف الجهات الداعمة.",
        meta: `<span class="cluster">${icon("building-2", { size: 14 })} ${escapeHtml(organization.name)}</span><span class="meta-dot"></span><span>${escapeHtml(organization.city)}</span>`,
        actions: `<a class="btn btn-ghost" href="#/association/projects">${icon("arrow-right", { size: 16 })} رجوع للمشاريع</a>`
      })}

      ${note("قبل البدء", "هذه محاكاة محلية. لا تُدخل بيانات حقيقية أو أسماء مستفيدين أو معلومات حساسة.", { iconName: "shield-check" })}

      <form id="project-form" class="stack-16" novalidate>
        <section class="card">
          <div class="card-head">
            <div>
              <h2>بيانات المشروع</h2>
              <p>اكتب وصفًا واقعيًا يوضح الفئة المستهدفة والمدة والموارد المتاحة.</p>
            </div>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="field span-2" data-field="title">
                <label for="project-title">عنوان المشروع <span class="req">*</span></label>
                <input class="input" id="project-title" name="title" placeholder="مثال: تأهيل 100 شاب وشابة للمهارات الرقمية">
                <p class="field-error"></p>
              </div>
              <div class="field span-2" data-field="description">
                <label for="project-description">وصف المشروع <span class="req">*</span></label>
                <textarea class="textarea" id="project-description" name="description" rows="4" placeholder="ما الذي سيحدث؟ لمن؟ وما النتيجة المتوقعة؟ اذكر الموارد والاحتياجات بوضوح."></textarea>
                <p class="field-hint">كلما ذكرت الأعداد والموارد بوضوح، كانت مسودة مساعد نيل أدق.</p>
                <p class="field-error"></p>
              </div>
              <div class="field">
                <label for="project-category">المجال</label>
                <select class="select" id="project-category" name="category">
                  ${CATEGORIES.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label for="project-region">المنطقة</label>
                <select class="select" id="project-region" name="region">
                  ${REGIONS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
                </select>
              </div>
              <div class="field" data-field="targetYouth">
                <label for="project-target">عدد الشباب المستهدف <span class="req">*</span></label>
                <input class="input" id="project-target" name="targetYouth" type="number" min="1" step="1" value="50">
                <p class="field-error"></p>
              </div>
              <div class="field">
                <label for="project-duration">مدة المشروع</label>
                <input class="input" id="project-duration" name="duration" placeholder="مثال: 8 أسابيع">
              </div>
              <div class="field span-2">
                <label for="project-audience">الفئة المستهدفة</label>
                <input class="input" id="project-audience" name="audience" placeholder="مثال: شباب 18–24 سنة، خريجو الثانوية">
              </div>
              <div class="field span-2">
                <span class="field-label">الموارد المتاحة لدى الجمعية</span>
                <div class="check-grid">
                  ${["قاعة تدريب", "مدربون", "أجهزة حاسوب", "متابعة وإرشاد", "منصة تعلم", "شراكات توظيف"]
                    .map(
                      (value) => `
                        <label class="check">
                          <input type="checkbox" name="availableResources" value="${escapeHtml(value)}">
                          <span>${escapeHtml(value)}</span>
                        </label>`
                    )
                    .join("")}
                </div>
                <p class="field-hint">الموارد المتاحة لا تُحتسب كاحتياجات، لكنها تساعد على فهم سياق المشروع.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>ما الذي يحتاجه المشروع؟</h2>
              <p>أضف احتياجًا واحدًا على الأقل. الاحتياج الكمي يظهر لاحقًا بحالة تغطية مشتقة.</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-add-need>${icon("plus", { size: 15 })} إضافة احتياج</button>
          </div>
          <div class="card-body">
            <div class="stack-12" id="needs-list">${needRow(1)}</div>
            <div class="note-strip" style="margin-block-start:14px">
              ${icon("info", { size: 18 })}
              <span>لن تطلب المحاكاة دفعًا أو تحويلًا ماليًا. نوع «تكاليف تشغيل» يبقى تعهدًا وصفيًا داخل النموذج.</span>
            </div>
          </div>
        </section>

        <div class="form-actions">
          <a class="btn btn-ghost" href="#/association/projects">إلغاء</a>
          <button type="button" class="btn btn-outline" data-save="draft">${icon("file-text", { size: 16 })} حفظ كمسودة</button>
          <button type="button" class="btn btn-primary" data-save="published">${icon("send", { size: 16 })} نشر المشروع تجريبيًا</button>
        </div>
      </form>
    `,
    mount(root) {
      const form = root.querySelector("#project-form");
      const needsList = root.querySelector("#needs-list");
      let needCounter = 1;

      const renumber = () => {
        needsList.querySelectorAll("[data-need-row]").forEach((row, index) => {
          row.querySelector(".need-index").textContent = `احتياج ${index + 1}`;
        });
      };

      const bindNeedRow = (row) => {
        const typeSelect = row.querySelector('[data-need-field="type"]');
        const unitInput = row.querySelector('[data-need-field="unit"]');
        const quantityInput = row.querySelector('[data-need-field="requiredQuantity"]');
        const syncUnit = () => {
          const type = typeSelect.value;
          const unit = UNIT_FOR_TYPE[type] || "";
          unitInput.value = unit;
          unitInput.readOnly = true;
          const required = QUANTITY_REQUIRED.includes(type);
          quantityInput.required = required;
          quantityInput.closest(".field").querySelector(".req")?.classList.toggle("is-hidden", !required);
        };
        typeSelect.addEventListener("change", syncUnit);
        syncUnit();
        row.querySelector("[data-remove-need]")?.addEventListener("click", () => {
          if (needsList.querySelectorAll("[data-need-row]").length <= 1) {
            showToast("أبقِ احتياجًا واحدًا على الأقل داخل المشروع.", { title: "لا يمكن الحذف", tone: "warning" });
            return;
          }
          row.remove();
          renumber();
        });
      };

      needsList.querySelectorAll("[data-need-row]").forEach(bindNeedRow);

      root.querySelector("[data-add-need]")?.addEventListener("click", () => {
        needCounter += 1;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = needRow(needsList.querySelectorAll("[data-need-row]").length + 1);
        const row = wrapper.firstElementChild;
        needsList.append(row);
        bindNeedRow(row);
        row.querySelector('[data-need-field="title"]')?.focus();
      });

      const collectNeeds = () => {
        return [...needsList.querySelectorAll("[data-need-row]")].map((row) => {
          const get = (name) => row.querySelector(`[data-need-field="${name}"]`);
          return {
            type: get("type").value,
            title: get("title").value.trim(),
            requiredQuantity: get("requiredQuantity").value,
            unit: get("unit").value || null,
            priority: get("priority").value,
            dueDate: get("dueDate").value || null,
            details: get("details").value.trim(),
            row
          };
        });
      };

      const validate = () => {
        clearFormErrors(form);
        let valid = true;
        const title = form.querySelector("#project-title");
        const description = form.querySelector("#project-description");
        const target = form.querySelector("#project-target");
        if (title.value.trim().length < 8) {
          setFormError(title.closest(".field"), "اكتب عنوانًا واضحًا (8 أحرف على الأقل).");
          valid = false;
        }
        if (description.value.trim().length < 30) {
          setFormError(description.closest(".field"), "اكتب وصفًا أوضح (30 حرفًا على الأقل).");
          valid = false;
        }
        if (!Number(target.value) || Number(target.value) < 1) {
          setFormError(target.closest(".field"), "أدخل عددًا صحيحًا أكبر من صفر.");
          valid = false;
        }

        const needs = collectNeeds();
        needs.forEach((need) => {
          const titleRow = need.row.querySelector('[data-field="needTitle"]');
          const quantityRow = need.row.querySelector('[data-field="requiredQuantity"]');
          if (!need.title) {
            setFormError(titleRow, "عنوان الاحتياج مطلوب.");
            valid = false;
          }
          if (QUANTITY_REQUIRED.includes(need.type)) {
            if (!Number(need.requiredQuantity) || Number(need.requiredQuantity) < 1) {
              setFormError(quantityRow, "أدخل كمية أكبر من صفر.");
              valid = false;
            }
          }
        });

        if (!valid) {
          const firstError = form.querySelector(".field.has-error");
          firstError?.scrollIntoView({ block: "center", behavior: "smooth" });
          firstError?.querySelector("input, textarea, select")?.focus({ preventScroll: true });
        }
        return valid ? needs : null;
      };

      root.querySelectorAll("[data-save]").forEach((button) => {
        button.addEventListener("click", () => {
          const needs = validate();
          if (!needs) {
            showToast("راجع الحقول المحددة قبل حفظ المشروع.", { title: "بيانات تحتاج مراجعة", tone: "warning" });
            return;
          }
          const status = button.dataset.save;
          let created = null;
          commit((currentState) => {
            created = createProject(currentState, {
              organizationId: organization.id,
              title: form.querySelector("#project-title").value,
              description: form.querySelector("#project-description").value,
              category: form.querySelector("#project-category").value,
              region: form.querySelector("#project-region").value,
              targetYouth: form.querySelector("#project-target").value,
              duration: form.querySelector("#project-duration").value,
              audience: form.querySelector("#project-audience").value,
              status,
              showOnDiscover: status === "published",
              availableResources: getCheckedValues(form, "availableResources"),
              needs: needs.map(({ row, ...need }) => need)
            });
          });
          if (!created) {
            showToast("تعذر إنشاء المشروع. حاول مرة أخرى.", { title: "خطأ غير متوقع", tone: "danger" });
            return;
          }
          showToast(
            status === "published"
              ? "نُشر المشروع داخل المحاكاة وأصبح ظاهرًا في صفحة اكتشاف الجهات الداعمة."
              : "حُفظ المشروع كمسودة في هذا المتصفح. يمكنك إكماله ونشره لاحقًا.",
            { title: status === "published" ? "تم النشر التجريبي" : "تم حفظ المسودة", tone: "success" }
          );
          navigateTo(`/association/projects/${created.id}`);
        });
      });
    }
  };
}
