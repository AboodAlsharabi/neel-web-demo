import { icon } from "./icons.js";
import { dismissTour, isTourDismissed } from "../store.js";

const TOURS = {
  association: [
    {
      title: "ابدأ من مشروعك",
      body: "كل بطاقة مشروع تجمع الاحتياجات المنفصلة وحالة كل احتياج. افتح مشروع «تأهيل 100 شاب وشابة» لرؤية المثال الكامل.",
      action: { label: "افتح مشروع المثال", href: "#/association/projects/PROJ-001" }
    },
    {
      title: "حدد ما ينقص بدقة",
      body: "صفحة «ما الذي تحتاجه مشاريعنا؟» تجمع الاحتياجات من كل المشاريع، وتفصل بين غير المغطى وقيد التواصل والمغطى جزئيًا.",
      action: { label: "اعرض الاحتياجات", href: "#/association/needs" }
    },
    {
      title: "اطلب مساعدة مساعد نيل",
      body: "المساعد التجريبي يفصل وصف المشروع إلى احتياجات، ويقترح جهات مع سبب واضح، ويجهّز مسودة طلب قابلة للتعديل.",
      action: { label: "افتح المساعد", href: "#/association/agent" }
    },
    {
      title: "تابع حتى الاتفاق",
      body: "طلبات التعاون والشراكات تعرض الحالة والتعهدات والمتبقي. بدّل الدور لتجربة رد الجهة الداعمة على الطلب نفسه.",
      action: { label: "اعرض طلبات التعاون", href: "#/association/requests" }
    }
  ],
  supporter: [
    {
      title: "اضبط اهتمامات جهتك",
      body: "ملف الجهة يحدد أنواع الدعم والمجالات والمناطق. تغييرها يغيّر الاقتراحات التي تراها فورًا.",
      action: { label: "افتح ملف الجهة", href: "#/supporter/profile" }
    },
    {
      title: "اكتشف مشاريع قابلة للمشاركة",
      body: "استخدم الفلاتر لاختيار المجال والمدينة ونوع المساهمة المطلوبة، أو راجع الاقتراحات مع سبب الملاءمة.",
      action: { label: "استكشف المشاريع", href: "#/supporter/discover" }
    },
    {
      title: "افهم الاحتياج قبل المساهمة",
      body: "صفحة المشروع تفصل الاحتياجات والمتبقي وما تم الاتفاق عليه، وتتيح تقديم عرض مساهمة تجريبي.",
      action: { label: "افتح مشروع تدريب رقمي", href: "#/supporter/projects/PROJ-001" }
    },
    {
      title: "تابع مساهماتك وأثرها",
      body: "صفحة المساهمات تعرض الحالة والموعد، وصفحة الأثر تربط مساهمتك بنتائج المشروع دون الخلط بين المستهدف والمنجز.",
      action: { label: "اعرض المساهمات", href: "#/supporter/contributions" }
    }
  ]
};

let activeTour = null;

export function closeTour() {
  if (!activeTour) return;
  dismissTour(activeTour.role);
  activeTour.element.remove();
  activeTour = null;
}

export function startTour(role, step = 0, { force = false } = {}) {
  const steps = TOURS[role];
  if (!steps) return;
  if (!force && isTourDismissed(role)) return;
  if (activeTour) {
    activeTour.element.remove();
    activeTour = null;
  }

  const element = document.createElement("section");
  element.className = "tour-card";
  element.setAttribute("aria-label", "جولة تعريفية قصيرة");
  document.body.append(element);
  activeTour = { role, element, step, steps };

  const render = () => {
    const current = activeTour.steps[activeTour.step];
    const isLast = activeTour.step === activeTour.steps.length - 1;
    element.innerHTML = `
      <div class="tour-card-top">
        <span class="tour-step-count">${icon("route", { size: 14 })} جولة سريعة · ${activeTour.step + 1} من ${activeTour.steps.length}</span>
        <button type="button" class="icon-btn-plain" data-tour-close aria-label="إغلاق الجولة">${icon("x", { size: 16 })}</button>
      </div>
      <h2>${current.title}</h2>
      <p>${current.body}</p>
      <div class="tour-dots" aria-hidden="true">
        ${activeTour.steps.map((_, index) => `<span class="tour-dot${index === activeTour.step ? " is-active" : ""}"></span>`).join("")}
      </div>
      <div class="tour-actions">
        <div class="cluster">
          ${activeTour.step > 0 ? `<button type="button" class="btn btn-ghost btn-sm" data-tour-prev>السابق</button>` : ""}
          <a class="btn btn-outline btn-sm" href="${current.action.href}" data-tour-link>${current.action.label}</a>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-tour-next>${isLast ? "إنهاء" : "التالي"}</button>
      </div>`;
    element.querySelector("[data-tour-close]")?.addEventListener("click", closeTour);
    element.querySelector("[data-tour-link]")?.addEventListener("click", closeTour);
    element.querySelector("[data-tour-prev]")?.addEventListener("click", () => {
      activeTour.step = Math.max(activeTour.step - 1, 0);
      render();
    });
    element.querySelector("[data-tour-next]")?.addEventListener("click", () => {
      if (isLast) {
        closeTour();
        return;
      }
      activeTour.step += 1;
      render();
    });
  };

  render();
}
