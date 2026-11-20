import { commit, getCurrentOrganization, getState } from "../../store.js";
import {
  createRequest,
  createSupporterOffer,
  getActiveRequestForPair,
  recordContribution
} from "../../services/requests.js";
import { getNeedCoverage } from "../../services/projects.js";
import { generateOutreachDraft } from "../../services/ai-agent-mock.js";
import { evaluateSupporterForNeed, getMatchFactorLabel, getMatchFactorMax } from "../../services/matching.js";
import { recordOutcome, addSurveyResponse } from "../../services/reporting.js";
import { openModal } from "../../components/modal.js";
import { showToast } from "../../components/toast.js";
import { badge } from "../../components/status-badge.js";
import { icon } from "../../components/icons.js";
import { escapeHtml, formatQty, formatNumber, todayISO } from "../../utils.js";
import { infoPanel } from "../../components/ui.js";

export function openRequestComposer({ project, need, supporter, onDone = null }) {
  const state = getState();
  const organization = getCurrentOrganization(state);
  const coverage = getNeedCoverage(state, need);
  const existing = getActiveRequestForPair(state, project.organizationId, supporter.id, need.id);
  const draft = generateOutreachDraft(project, need, supporter, organization);
  const remainingText = need.requiredQuantity
    ? `${coverage.remainingQuantity ?? need.requiredQuantity} من ${formatQty(need.requiredQuantity, need.unit)} متبقٍ في هذا الاحتياج.`
    : "هذا احتياج وصفي، ولن يُطلب مبلغ مالي في المحاكاة.";

  openModal({
    title: "إعداد طلب تعاون تجريبي",
    description: `${supporter.name} · ${need.title}`,
    size: "wide",
    body: `
      ${existing ? `<div class="note-strip is-warning">${icon("alert-triangle", { size: 18 })}<span>يوجد طلب نشط بالفعل مع هذه الجهة لهذا الاحتياج. يمكنك متابعته من صفحة طلبات التعاون.</span></div>` : ""}
      <div class="info-grid" style="margin-block:14px 16px">
        <div class="info-block"><span>المشروع</span><strong>${escapeHtml(project.title)}</strong></div>
        <div class="info-block"><span>الاحتياج</span><strong>${escapeHtml(need.title)}</strong></div>
        <div class="info-block"><span>نوع الدعم</span><strong>${escapeHtml(summarySupport(need.type))}</strong></div>
        <div class="info-block"><span>المتبقي</span><strong>${escapeHtml(remainingText)}</strong></div>
      </div>
      <div class="note-strip" style="margin-block-end:14px">
        ${icon("sparkles", { size: 18 })}
        <span><strong>مسودة مقترحة:</strong> يمكنك تعديلها بالكامل. لم تُرسل أي رسالة خارج هذا النموذج.</span>
      </div>
      <form id="request-composer-form" novalidate>
        <div class="field" data-field="message">
          <label for="request-message">نص الطلب أو الرسالة</label>
          <textarea class="textarea" id="request-message" name="message" rows="8" required autofocus>${escapeHtml(draft.body)}</textarea>
          <p class="field-hint">سيُحفظ النص داخل المحاكاة فقط، ولن يصل إلى بريد أو واتساب.</p>
          <p class="field-error"></p>
        </div>
      </form>
      ${supporter.supportTypes.includes(need.type) ? "" : infoPanel("هذه الجهة لا تذكر نوع الدعم المطلوب في ملفها، ويمكن مراجعة ذلك قبل الإرسال.", { tone: "", iconName: "alert-circle" })}
    `,
    footer: `
      <button type="button" class="btn btn-outline" data-cancel>إلغاء</button>
      <button type="button" class="btn btn-secondary" data-save-draft ${existing ? "disabled" : ""}>حفظ كمسودة</button>
      <button type="button" class="btn btn-primary" data-send ${existing ? "disabled" : ""}>${icon("send", { size: 17 })} إرسال داخل المحاكاة</button>
    `,
    onMount: ({ body, footer, close }) => {
      const messageField = body.querySelector('[data-field="message"]');
      const messageInput = body.querySelector("#request-message");
      const messageError = messageField.querySelector(".field-error");
      const submit = (send) => {
        const message = messageInput.value.trim();
        messageField.classList.remove("has-error");
        messageError.textContent = "";
        if (message.length < 20) {
          messageField.classList.add("has-error");
          messageError.textContent = "اكتب رسالة أوضح (20 حرفًا على الأقل).";
          messageInput.focus();
          return;
        }
        let created = null;
        commit((currentState) => {
          const result = createRequest(currentState, {
            projectId: project.id,
            needId: need.id,
            supporterId: supporter.id,
            message,
            initiatedBy: "association",
            status: send ? "sent" : "draft"
          });
          created = result;
        });
        if (created?.existing) {
          messageField.classList.add("has-error");
          messageError.textContent = "يوجد طلب نشط بالفعل مع هذه الجهة لهذا الاحتياج.";
          return;
        }
        close();
        showToast(
          send
            ? "تم تسجيل طلب التعاون داخل المحاكاة، ولم تُرسل رسالة بريد إلكتروني."
            : "تم حفظ المسودة في هذا المتصفح.",
          { title: send ? "تم تسجيل الطلب" : "تم حفظ المسودة", tone: "success" }
        );
        onDone?.(created?.request || null);
      };
      footer.querySelector("[data-cancel]")?.addEventListener("click", close);
      footer.querySelector("[data-save-draft]")?.addEventListener("click", () => submit(false));
      footer.querySelector("[data-send]")?.addEventListener("click", () => submit(true));
    }
  });
}

function summarySupport(type) {
  const labels = {
    training: "تدريب",
    devices: "أجهزة وخدمات تقنية",
    funding: "تكاليف تشغيل",
    internship: "فرص تدريب عملي",
    expertise: "خبرة واستشارات",
    services: "خدمات وبرامج"
  };
  return labels[type] || type;
}

export function openContributionModal({ project, need, request = null, onDone = null }) {
  const state = getState();
  const supporter = state.supporters.find((item) => item.id === state.settings.supporterId);
  const coverage = getNeedCoverage(state, need);
  const defaultQuantity = need.requiredQuantity
    ? Math.max(coverage.remainingQuantity || 0, 0)
    : "";
  const isDirectOffer = !request;

  openModal({
    title: isDirectOffer ? "تقديم عرض مساهمة تجريبي" : "تسجيل اتفاق مساهمة",
    description: `${project.title} · ${need.title}`,
    size: "default",
    body: `
      <div class="info-grid" style="margin-block-end:16px">
        <div class="info-block"><span>الاحتياج</span><strong>${escapeHtml(need.title)}</strong></div>
        <div class="info-block"><span>نوع المساهمة</span><strong>${escapeHtml(summarySupport(need.type))}</strong></div>
        <div class="info-block"><span>المطلوب</span><strong>${need.requiredQuantity ? formatQty(need.requiredQuantity, need.unit) : "دعم وصفي"}</strong></div>
        <div class="info-block"><span>تم الاتفاق</span><strong>${need.requiredQuantity ? formatQty(coverage.agreedQuantity, need.unit) : coverage.confirmedContributions.length ? "تعهد مسجل" : "لا يوجد"}</strong></div>
        <div class="info-block"><span>المتبقي</span><strong>${need.requiredQuantity ? formatQty(coverage.remainingQuantity, need.unit) : "وصفي"}</strong></div>
      </div>
      ${
        isDirectOffer
          ? `<div class="note-strip">${icon("info", { size: 18 })}<span>سيُسجل العرض للجمعية كتعهد تجريبي بانتظار تأكيدها، ولا ينتج عنه دفع أو تحويل مالي.</span></div>`
          : `<div class="note-strip is-success">${icon("check-circle", { size: 18 })}<span>هذه مساهمة مرتبطة بطلب تعاون قائم. سيظهر أثرها في حالة الاحتياج مباشرة.</span></div>`
      }
      <form id="contribution-form" novalidate style="margin-block-start:16px">
        <div class="form-grid">
          <div class="field" data-field="quantity">
            <label for="contribution-quantity">ما ستقدمه الجهة ${need.requiredQuantity ? `<span class="req">*</span>` : ""}</label>
            <input class="input" type="number" min="1" step="1" id="contribution-quantity" name="quantity" value="${defaultQuantity}" placeholder="${need.requiredQuantity ? "أدخل الكمية" : "اتركه فارغًا للتعهد الوصفي"}">
            <p class="field-hint">${need.requiredQuantity ? `الوحدة: ${escapeHtml(need.unit === "device" ? "جهاز" : need.unit || "وحدة")}` : "يمكن أن يبقى التعهد وصفيًا دون رقم."}</p>
            <p class="field-error"></p>
          </div>
          <div class="field">
            <label for="contribution-date">الموعد المقترح</label>
            <input class="input" type="date" id="contribution-date" name="proposedDate" min="${todayISO()}">
          </div>
          <div class="field span-2">
            <label for="contribution-description">وصف المساهمة</label>
            <textarea class="textarea" id="contribution-description" name="description" rows="3" placeholder="مثال: توفير 10 أجهزة حاسوب للتدريب لمدة البرنامج.">${isDirectOffer ? "" : "مساهمة تجريبية مرتبطة بالطلب."}</textarea>
            <p class="field-hint">وصف واضح يساعد الجمعية على فهم ما تم الاتفاق عليه.</p>
          </div>
          ${
            isDirectOffer
              ? `<div class="field span-2">
                  <label for="offer-message">ملاحظة للجمعية (اختياري)</label>
                  <textarea class="textarea" id="offer-message" name="message" rows="2" placeholder="ملاحظة قصيرة توضح العرض."></textarea>
                </div>`
              : ""
          }
        </div>
      </form>
      ${badge(isDirectOffer ? "عرض بانتظار تأكيد الجمعية" : "سيُحدث حالة الاحتياج", "info", "info")}
    `,
    footer: `
      <button type="button" class="btn btn-outline" data-cancel>إلغاء</button>
      <button type="button" class="btn btn-primary" data-submit>${icon(isDirectOffer ? "send" : "check", { size: 17 })} ${isDirectOffer ? "إرسال العرض داخل المحاكاة" : "تأكيد المساهمة"}</button>
    `,
    onMount: ({ body, footer, close }) => {
      const form = body.querySelector("#contribution-form");
      const quantityField = body.querySelector('[data-field="quantity"]');
      const quantityInput = body.querySelector("#contribution-quantity");
      const quantityError = quantityField.querySelector(".field-error");
      footer.querySelector("[data-cancel]")?.addEventListener("click", close);

      footer.querySelector("[data-submit]")?.addEventListener("click", () => {
        const quantityValue = quantityInput.value.trim();
        const quantity = quantityValue === "" ? null : Number(quantityValue);
        quantityField.classList.remove("has-error");
        quantityError.textContent = "";
        if (need.requiredQuantity && (!Number.isFinite(quantity) || quantity <= 0)) {
          quantityField.classList.add("has-error");
          quantityError.textContent = "أدخل كمية أكبر من صفر.";
          quantityInput.focus();
          return;
        }
        if (need.requiredQuantity && quantity > coverage.remainingQuantity) {
          quantityField.classList.add("has-error");
          quantityError.textContent = `المتبقي في هذا الاحتياج ${formatQty(coverage.remainingQuantity, need.unit)} فقط.`;
          quantityInput.focus();
          return;
        }
        const description = body.querySelector("#contribution-description")?.value.trim() || "";
        const proposedDate = body.querySelector("#contribution-date")?.value || null;
        const message = body.querySelector("#offer-message")?.value.trim() || "";
        if (!description) {
          const desc = body.querySelector("#contribution-description");
          desc?.focus();
          showToast("أضف وصفًا قصيرًا للمساهمة قبل الحفظ.", { title: "وصف المساهمة مطلوب", tone: "warning" });
          return;
        }

        let result = null;
        commit((currentState) => {
          if (request) {
            result = recordContribution(currentState, {
              requestId: request.id,
              quantity,
              unit: need.unit,
              description,
              proposedDate,
              state: "not_started",
              confirmed: true,
              actorRole: "supporter"
            });
          } else {
            result = createSupporterOffer(currentState, {
              projectId: project.id,
              needId: need.id,
              quantity,
              description,
              proposedDate,
              message
            });
          }
        });
        if (!result || result.blocked) {
          close();
          showToast("هذا الطلب في حالة متقدمة، ولا يمكن تحويله إلى عرض جديد من هنا. تابع المساهمة من صفحة الطلب.", {
            title: "لا يمكن تقديم العرض",
            tone: "warning"
          });
          return;
        }
        close();
        showToast(
          isDirectOffer
            ? "تم تسجيل عرض المساهمة داخل المحاكاة. سيظهر للجمعية بانتظار التأكيد، ولم تُرسل رسالة خارجية."
            : "تم تسجيل المساهمة وتحديث حالة الاحتياج داخل المحاكاة.",
          { title: "تم الحفظ", tone: "success" }
        );
        onDone?.(result);
      });
    }
  });
}

export function openMatchExplanation({ project, need, supporter }) {
  const evaluation = evaluateSupporterForNeed(need, project, supporter);
  const factors = ["type", "category", "region", "capacity"];
  openModal({
    title: "لماذا رشحنا هذه الجهة؟",
    description: `${supporter.name} · ${need.title}`,
    size: "default",
    body: `
      <div class="cluster" style="justify-content:space-between;margin-block-end:14px">
        <span class="match-label${evaluation.tone === "success" ? "" : evaluation.tone === "info" ? " is-medium" : " is-low"}">${icon("sparkles", { size: 13 })} ${evaluation.label}</span>
        <span class="muted small">درجة تجريبية: ${formatNumber(evaluation.score)} من 100</span>
      </div>
      <div class="match-breakdown">
        ${factors
          .map(
            (key) => `
              <div class="match-factor">
                <span>${getMatchFactorLabel(key)}</span>
                <span class="bar-track"><span class="bar-fill" style="width:${Math.round((evaluation.breakdown[key] / getMatchFactorMax(key)) * 100)}%"></span></span>
                <span style="text-align:end">${formatNumber(evaluation.breakdown[key])}/${getMatchFactorMax(key)}</span>
              </div>`
          )
          .join("")}
      </div>
      <div class="divider"></div>
      <h3 style="font-size:var(--fs-sm);margin-block-end:7px">أسباب الترشيح من البيانات المسجلة</h3>
      <div class="partner-reasons" style="margin-block-start:0">
        ${evaluation.reasons.map((reason) => `<div class="partner-reason">${icon("check", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`).join("")}
      </div>
      ${
        evaluation.missing.length
          ? `<h3 style="font-size:var(--fs-sm);margin-block:14px 7px">معلومات لا تكفي أو تحتاج مراجعة</h3>
             <div class="partner-reasons" style="margin-block-start:0">
               ${evaluation.missing.map((reason) => `<div class="partner-reason is-missing">${icon("alert-circle", { size: 14 })}<span>${escapeHtml(reason)}</span></div>`).join("")}
             </div>`
          : ""
      }
      <div class="note-strip" style="margin-block-start:14px">
        ${icon("info", { size: 18 })}
        <span>هذه درجة محاكاة تجريبية مبنية على نوع الدعم والمجال والمنطقة والقدرة المعلنة في البيانات المحلية. ليست تنبؤًا بنجاح التعاون ولا دقة ذكاء اصطناعي مثبتة.</span>
      </div>
    `,
    footer: `<button type="button" class="btn btn-primary" data-close>فهمت</button>`,
    onMount: ({ footer, close }) => {
      footer.querySelector("[data-close]")?.addEventListener("click", close);
    }
  });
}

export function openOutcomeModal({ project, defaultMetric = "participants", onDone = null }) {
  const metrics = [
    ["participants", "المشاركون"],
    ["training_completed", "أكملوا التدريب"],
    ["internships", "فرص التدريب العملي"],
    ["interviews", "مقابلات أو فرص مهنية"]
  ];
  openModal({
    title: "تسجيل نتيجة شباب",
    description: project.title,
    size: "default",
    body: `
      <div class="note-strip is-warning" style="margin-block-end:16px">
        ${icon("info", { size: 18 })}
        <span>افصل بين الرقم المستهدف والنتيجة المسجلة تجريبيًا. كل نتيجة تحتاج مصدرًا واضحًا للمعلومة.</span>
      </div>
      <form id="outcome-form" novalidate>
        <div class="form-grid">
          <div class="field span-2">
            <label for="outcome-metric">المؤشر</label>
            <select class="select" id="outcome-metric" name="metric">
              ${metrics.map(([value, label]) => `<option value="${value}"${value === defaultMetric ? " selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
          <div class="field" data-field="target">
            <label for="outcome-target">الرقم المستهدف</label>
            <input class="input" id="outcome-target" name="target" type="number" min="0" value="${project.targetYouth || 0}">
            <p class="field-error"></p>
          </div>
          <div class="field" data-field="actual">
            <label for="outcome-actual">النتيجة المسجلة تجريبيًا</label>
            <input class="input" id="outcome-actual" name="actual" type="number" min="0" value="0">
            <p class="field-error"></p>
          </div>
          <div class="field span-2">
            <label for="outcome-source">مصدر المعلومة</label>
            <input class="input" id="outcome-source" name="source" value="تقرير الجمعية التجريبي" placeholder="مثال: كشف حضور، تقرير شريك">
          </div>
          <div class="field span-2">
            <label for="outcome-note">ملاحظة أو دليل مختصر</label>
            <textarea class="textarea" id="outcome-note" name="evidenceNote" rows="2" placeholder="اشرح باختصار كيف جُمعت النتيجة."></textarea>
          </div>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn btn-outline" data-cancel>إلغاء</button>
      <button type="button" class="btn btn-primary" data-submit>حفظ النتيجة</button>
    `,
    onMount: ({ body, footer, close }) => {
      footer.querySelector("[data-cancel]")?.addEventListener("click", close);
      footer.querySelector("[data-submit]")?.addEventListener("click", () => {
        const metric = body.querySelector("#outcome-metric").value;
        const target = body.querySelector("#outcome-target").value;
        const actual = body.querySelector("#outcome-actual").value;
        const source = body.querySelector("#outcome-source").value.trim();
        const evidenceNote = body.querySelector("#outcome-note").value.trim();
        if (target === "" || actual === "") {
          showToast("أدخل الرقم المستهدف والنتيجة المسجلة.", { title: "بيانات ناقصة", tone: "warning" });
          return;
        }
        if (Number(actual) > Number(target)) {
          showToast("النتيجة المسجلة أكبر من الهدف. راجع الأرقام قبل الحفظ.", { title: "تحقق من الأرقام", tone: "warning" });
          return;
        }
        if (!source) {
          body.querySelector("#outcome-source").focus();
          showToast("أضف مصدر المعلومة.", { title: "المصدر مطلوب", tone: "warning" });
          return;
        }
        commit((currentState) => {
          recordOutcome(currentState, {
            projectId: project.id,
            metric,
            target: Number(target),
            actual: Number(actual),
            source,
            evidenceNote
          });
        });
        close();
        showToast("تم حفظ النتيجة ومصدرها داخل المحاكاة.", { title: "تم تسجيل النتيجة", tone: "success" });
        onDone?.();
      });
    }
  });
}

export function openSurveyModal({ project, onDone = null }) {
  openModal({
    title: "استبيان قصير وغير معرّف",
    description: project.title,
    size: "default",
    body: `
      <div class="note-strip" style="margin-block-end:16px">
        ${icon("shield-check", { size: 18 })}
        <span>لا نجمع الأسماء أو الهواتف أو العمر الدقيق. الإجابات تجريبية وتُعرض مجمعة فقط.</span>
      </div>
      <form id="survey-form" novalidate>
        <div class="form-grid">
          <div class="field span-2" data-field="answer1">
            <label for="survey-skill">ما المهارة الأكثر احتياجًا؟</label>
            <input class="input" id="survey-skill" name="answer1" placeholder="مثال: التعامل مع البيانات" required>
            <p class="field-error"></p>
          </div>
          <div class="field span-2">
            <span class="field-label">هل كان التدريب مفيدًا؟</span>
            <div class="radio-row">
              ${["نعم", "إلى حد ما", "لا"].map((value, index) => `
                <label class="radio-chip">
                  <input type="radio" name="answer2" value="${value}"${index === 0 ? " checked" : ""}>
                  <span>${value}</span>
                </label>`).join("")}
            </div>
          </div>
          <div class="field span-2">
            <label for="survey-suggestion">ما التحسين المقترح؟</label>
            <textarea class="textarea" id="survey-suggestion" name="answer3" rows="2" placeholder="اقتراح قصير (اختياري)"></textarea>
          </div>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn btn-outline" data-cancel>إلغاء</button>
      <button type="button" class="btn btn-primary" data-submit>حفظ الإجابة</button>
    `,
    onMount: ({ body, footer, close }) => {
      footer.querySelector("[data-cancel]")?.addEventListener("click", close);
      footer.querySelector("[data-submit]")?.addEventListener("click", () => {
        const answer1 = body.querySelector("#survey-skill").value.trim();
        if (!answer1) {
          const field = body.querySelector('[data-field="answer1"]');
          field.classList.add("has-error");
          field.querySelector(".field-error").textContent = "أدخل المهارة الأكثر احتياجًا.";
          body.querySelector("#survey-skill").focus();
          return;
        }
        const answer2 = body.querySelector('input[name="answer2"]:checked')?.value || "نعم";
        const answer3 = body.querySelector("#survey-suggestion").value.trim();
        commit((currentState) => {
          addSurveyResponse(currentState, {
            projectId: project.id,
            answer1,
            answer2,
            answer3
          });
        });
        close();
        showToast("أُضيف الرد بشكل غير معرّف إلى ملخص الاستبيان.", { title: "تم حفظ الإجابة", tone: "success" });
        onDone?.();
      });
    }
  });
}
