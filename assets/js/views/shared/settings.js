import {
  getCurrentOrganization,
  getCurrentSupporter,
  resetDemo,
  setSession
} from "../../store.js";
import { navigateTo } from "../../utils.js";
import { pageHeader } from "../../components/ui.js";
import { confirmDialog } from "../../components/modal.js";
import { showToast } from "../../components/toast.js";
import { startTour } from "../../components/tour.js";
import { icon } from "../../components/icons.js";

export function renderSettings(ctx) {
  const { state, role } = ctx;
  const org = getCurrentOrganization(state);
  const supporter = getCurrentSupporter(state);
  const roleName = role === "association" ? "جمعية" : "جهة داعمة";

  return {
    title: "الإعدادات",
    html: `
      ${pageHeader({
        eyebrow: "الحساب",
        title: "إعدادات المحاكاة",
        description: "غيّر الدور، أعد الجولة الإرشادية، أو أعد بيانات العرض إلى حالتها الأصلية."
      })}
      <div class="stack-16">
        <section class="card">
          <div class="card-head">
            <div>
              <h2>الدور الحالي</h2>
              <p>التبديل يحتفظ بالتغييرات المحلية ولا يمسحها.</p>
            </div>
            <span class="role-chip${role === "supporter" ? " is-supporter" : ""}">${icon(role === "association" ? "building-2" : "heart-handshake", { size: 14 })} ${roleName}</span>
          </div>
          <div class="card-body">
            <div class="settings-role-grid">
              <div class="settings-role${role === "association" ? " is-current" : ""}">
                <h3>لوحة الجمعية</h3>
                <p>${org?.name || "جمعية مهارات الغد"} — ${org?.city || "الرياض"}. إدارة المشاريع والاحتياجات والشراكات.</p>
                ${role === "association" ? '<span class="badge is-success">الدور الحالي</span>' : '<button type="button" class="btn btn-outline btn-sm" data-switch-role="association">الدخول كجمعية</button>'}
              </div>
              <div class="settings-role${role === "supporter" ? " is-current" : ""}">
                <h3>لوحة الجهة الداعمة</h3>
                <p>${supporter?.name || "شركة مدى التقنية"} — ${supporter?.kind || "شركة تقنية"}. اكتشاف المشاريع والمساهمة فيها.</p>
                ${role === "supporter" ? '<span class="badge is-success">الدور الحالي</span>' : '<button type="button" class="btn btn-outline btn-sm" data-switch-role="supporter">الدخول كجهة داعمة</button>'}
              </div>
            </div>
            <div class="note-strip" style="margin-block-start:14px">
              ${icon("info", { size: 18 })}
              <span>تبديل الدور تجريبي فقط، وليس مصادقة أو نظام صلاحيات أمني. البيانات محفوظة في المتصفح نفسه وتظهر للدورين.</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>الجولة الإرشادية</h2>
              <p>أربع خطوات قصيرة تشرح أهم مسارات هذا الدور.</p>
            </div>
          </div>
          <div class="card-body spread">
            <p class="muted small">يمكنك إعادة تشغيل الجولة في أي وقت. لن تظهر تلقائيًا بعد إغلاقها في هذه الجلسة.</p>
            <button type="button" class="btn btn-secondary" data-action="restart-tour">${icon("route", { size: 17 })} إعادة الجولة الإرشادية</button>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>الحفظ المحلي والخصوصية</h2>
              <p>بيانات المحاكاة تُحفظ في localStorage وتظل على هذا الجهاز فقط.</p>
            </div>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-block"><span>مفتاح التخزين</span><strong>neel-demo-v1:state</strong></div>
              <div class="info-block"><span>آخر تحديث تجريبي</span><strong dir="ltr">${new Date(state.meta.updatedAt).toLocaleString("ar", { numberingSystem: "latn" })}</strong></div>
              <div class="info-block"><span>المزامنة بين الأجهزة</span><strong>غير متاحة في هذه المحاكاة</strong></div>
              <div class="info-block"><span>الإرسال الخارجي</span><strong>معطل بالكامل</strong></div>
            </div>
          </div>
        </section>

        <section class="card settings-danger">
          <div class="card-head" style="border-color:#EFD2D7">
            <div>
              <h2>إعادة ضبط بيانات العرض</h2>
              <p>حذف كل المشاريع والطلبات والرسائل التي أضفتها وإعادة المحاكاة إلى بياناتها الأولية.</p>
            </div>
          </div>
          <div class="card-body spread">
            <p class="small">تأكد قبل المتابعة: لا يمكن التراجع عن المسح من داخل الواجهة.</p>
            <button type="button" class="btn btn-danger" data-action="reset-demo">${icon("refresh-cw", { size: 17 })} إعادة ضبط التجربة</button>
          </div>
        </section>
      </div>
    `,
    mount(root) {
      root.querySelectorAll("[data-switch-role]").forEach((button) => {
        button.addEventListener("click", () => {
          const nextRole = button.dataset.switchRole;
          setSession(nextRole);
          navigateTo(`/${nextRole}/overview`);
          showToast(`تم التبديل إلى تجربة ${nextRole === "association" ? "الجمعية" : "الجهة الداعمة"}. التغييرات المحلية محفوظة.`, {
            title: "تم تبديل الدور",
            tone: "success"
          });
        });
      });

      root.querySelector('[data-action="restart-tour"]')?.addEventListener("click", () => {
        startTour(role, 0, { force: true });
      });

      root.querySelector('[data-action="reset-demo"]')?.addEventListener("click", () => {
        confirmDialog({
          title: "إعادة ضبط بيانات العرض؟",
          message: "سيتم حذف جميع التغييرات المحلية وإعادة المشاريع والطلبات والمساهمات والرسائل إلى بيانات المحاكاة الأولية.",
          confirmLabel: "نعم، أعد الضبط",
          tone: "danger",
          onConfirm: () => {
            resetDemo({ keepSession: true });
            showToast("أُعيدت بيانات العرض إلى حالتها الأولية.", { title: "تمت إعادة الضبط", tone: "success" });
            navigateTo(`/${role}/overview`);
          }
        });
      });
    }
  };
}
