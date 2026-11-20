# نموذج بيانات محاكاة نيل

يصف هذا الملف الكيانات المخزنة محليًا داخل `assets/js/store.js`، والعلاقات بينها، وحالات الطلبات، وطريقة اشتقاق التغطية. لا يوجد قاعدة بيانات مركزية؛ كل الحالة تُشتق من `seed-data.js` وتُحفظ في `localStorage`.

## مفاتيح التخزين

| المفتاح | المحتوى |
|---|---|
| `neel-demo-v1:state` | حالة المحاكاة الكاملة: الكيانات، الإعدادات، الإشعارات، النشاط، المحفوظات |
| `neel-demo-v1:session` | الدور الحالي: `association` أو `supporter` |
| `neel-demo-v1:flash` | رسالة عابرة تُستهلك عند التنقل |
| `neel-demo-v1:tour:<role>` | هل أُغلقت الجولة الإرشادية لهذا الدور في هذه الجلسة |
| `neel-agent-rejected:<projectId>` | مفاتيح اقتراحات المساعد المرفوضة لمشروع معين |

لا يُرسل أي من هذه المفاتيح إلى خادم.

## الكيانات الرئيسية

### organization (جمعية)

- `id`, `name`, `city`, `region`
- `categories`: مجالات العمل
- `about`, `youthScope`
- `contactEmail`, `contactPhone`: بيانات وهمية
- `profileCompletion`: نسبة اكتمال حقول الملف، وليست اعتمادًا رسميًا
- `demo: true`

### supporter (جهة داعمة)

- `id`, `name`, `kind`, `regions[]`, `categories[]`
- `supportTypes[]`: `training`, `devices`, `funding`, `internship`, `expertise`, `services`
- `capacity{}`: قدرات كمية معلنة لكل نوع
- `capacityNotes`, `email`: بيانات تجريبية
- `demo: true`

### project (مشروع شبابي)

- `id`, `organizationId`
- `title`, `description`, `category`, `region`
- `targetYouth`, `audience`, `duration`
- `status`: `draft` أو `published`
- `showOnDiscover`: يظهر فقط بعد النشر
- `availableResources[]`
- `createdAt`, `publishedAt`, `demo`

### need (احتياج مستقل)

- `id`, `projectId`
- `type`: نوع الدعم
- `title`, `details`
- `requiredQuantity`, `unit`: `null` للافتراض الوصفي
- `priority`, `dueDate`, `createdAt`, `demo`

### request (طلب تعاون)

- `id`, `projectId`, `needId`, `organizationId`, `supporterId`
- `initiatedBy`: `association` أو `supporter`
- `message`
- `status`: راجع قسم حالات الطلب
- `createdAt`, `updatedAt`, `lastContactAt`, `demo`

### contribution (مساهمة/تعهد)

- `id`, `projectId`, `needId`, `supporterId`, `requestId`
- `quantity`, `unit`, `description`
- `proposedDate`
- `state`: `not_started`, `in_progress`, `completed`, `cancelled`
- `confirmed`: `false` للعرض بانتظار تأكيد الجمعية، `true` بعد التأكيد أو تسجيل المساهمة ضمن طلب
- `agreedAt`, `updatedAt`, `demo`

### message (رسالة تجريبية)

- `id`, `requestId`
- `senderRole`: `association` أو `supporter`
- `body`, `createdAt`, `demo`

### outcome (نتيجة شباب)

- `id`, `projectId`, `metric`
- `target`, `actual`, `unit`
- `source`, `evidenceNote`, `recordedAt`, `demo`

### surveyResponse (استبيان غير معرّف)

- `id`, `projectId`
- `answer1` (المهارة الأكثر احتياجًا)
- `answer2` (هل كان التدريب مفيدًا؟)
- `answer3` (اقتراح التحسين)
- `demo`

### notification / activity / savedProjects / settings / meta

- `notification`: موجه لدور، له `link`، وعلامة `read`.
- `activity`: سجل أحداث محلي مرتبط بكيان.
- `savedProjects`: إدارة حفظ مشروع لجهة داعمة.
- `settings`: معرفات الدور الافتراضي مثل `ORG-001` و`SUP-002`.
- `meta`: إصدار وحالة تحديث تجريبية.

## العلاقات

```text
organization 1 ── N project
project      1 ── N need
project      1 ── N request
project      1 ── N contribution
need         1 ── N request
need         1 ── N contribution
request      1 ── N message
request      1 ── 0..1 contribution
supporter    1 ── N request / contribution
```

**قاعدة العرض:** الجهة الداعمة ترى فقط المشاريع المنشورة التي سمح لها بالنشر (`showOnDiscover === true`) واحتياجاتها وبياناتها العامة. لا تظهر رسائل الأطراف الأخرى في تفاصيل المشروع.

## حالات الطلب

الحالات العربية في الواجهة:

| المفتاح | المعنى |
|---|---|
| `draft` | مسودة |
| `sent` | أُرسل |
| `reviewing` | قيد المراجعة |
| `interested` | مهتمون |
| `meeting` | اجتماع |
| `agreed` | موافقة مبدئية |
| `declined` | اعتذار |
| `closed` | مغلق |

الانتقالات المسموحة في `assets/js/services/requests.js`:

```text
draft     → sent, closed
sent      → reviewing, interested, meeting, declined, closed
reviewing → interested, meeting, declined, closed
interested→ meeting, agreed, declined, closed
meeting   → agreed, declined, closed
agreed    → closed
declined  → (نهاية)
closed    → (نهاية)
```

الأدوار المصرح بها لكل انتقال محددة في جدول `STATUS_TRANSITIONS`. أي انتقال غير منطقي يُرفض ولا يُغير الحالة.

## اشتقاق تغطية الاحتياج

لا يوجد حقل `status` قابل للتحرير داخل كيان `need`. تُشتق التغطية من:

1. المساهمات المؤكدة (`confirmed !== false`) وغير الملغاة، ومجموع كمياتها.
2. الطلبات النشطة بحالات `sent`, `reviewing`, `interested`, `meeting`.

القواعد:

- `agreedQuantity = مجموع كميات المساهمات المؤكدة المرتبطة بالاحتياج`.
- `remainingQuantity = max(requiredQuantity - agreedQuantity, 0)`.
- إذا لم توجد مساهمات مؤكدة ولكن يوجد طلب نشط: الحالة `in_talk` (قيد التواصل).
- إذا كانت `agreedQuantity > 0` وأقل من المطلوب: الحالة `partial` (مغطى جزئيًا).
- إذا كانت `agreedQuantity >= requiredQuantity`: الحالة `covered` (تم الاتفاق).
- الاحتياج الوصفي بدون كمية يستخدم عدد المساهمات أو الطلبات لعرض حالة نوعية، ولا تُحسب له نسبة مضللة.

مثال العرض الثابت: مطلوب 20 جهازًا، لا مساهمات مؤكدة، وطلب `REQ-101` بحالة «قيد المراجعة». بعد أن تختار الجهة «مهتمون» ثم تسجل مساهمة 10 أجهزة مؤكدة:

```text
agreedQuantity = 10
remainingQuantity = 10
status = partial
```

وتظهر البطاقة: `10 من 20 جهازًا — مغطى جزئيًا · 10 أجهزة متبقٍ`.

## الهويات الافتراضية

- الجمعية: `ORG-001` «جمعية مهارات الغد».
- الجهة الداعمة: `SUP-002` «شركة مدى التقنية».
- المشروع: `PROJ-001`.
- احتياج الأجهزة: `NEED-102`.
- الطلب الأولي: `REQ-101` بحالة «قيد المراجعة».

## إعادة الضبط

`resetDemo({ keepSession: true })`:

1. يستبدل الحالة كاملة بنسخة من `seedData`.
2. يحذف رسائل `flash` وحالة رفض اقتراحات المساعد.
3. يحافظ على الدور الحالي افتراضيًا.
4. يعيد تعيين الجولات لكل دور.
5. يُحدّث الواجهة عبر حدث الحالة المحلي.

لا يمسح إعادة الضبط مفتاح الجلسة إلا عند تمرير `keepSession: false`، لكنه يعيد كل البيانات والعدادات والحالات الأخرى.
