export const SUPPORT_TYPES = [
  {
    key: "training",
    label: "تدريب",
    shortLabel: "تدريب",
    icon: "graduation-cap",
    description: "مدربون وورش ومحتوى تأهيلي"
  },
  {
    key: "devices",
    label: "أجهزة وخدمات تقنية",
    shortLabel: "أجهزة",
    icon: "cpu",
    description: "أجهزة حاسوب وبرامج ودعم تقني"
  },
  {
    key: "funding",
    label: "تكاليف تشغيل",
    shortLabel: "تشغيل",
    icon: "wallet",
    description: "تعهد وصفي بتغطية مصاريف التشغيل"
  },
  {
    key: "internship",
    label: "فرص تدريب عملي",
    shortLabel: "تدريب عملي",
    icon: "briefcase",
    description: "فرص تطبيقية ومهنية للشباب"
  },
  {
    key: "expertise",
    label: "خبرة واستشارات",
    shortLabel: "خبرة",
    icon: "lightbulb",
    description: "مراجعة المناهج والإرشاد"
  },
  {
    key: "services",
    label: "خدمات وبرامج",
    shortLabel: "خدمات",
    icon: "wrench",
    description: "برامج وأدوات وخدمات مساندة"
  }
];

export const SUPPORT_TYPE_MAP = Object.fromEntries(
  SUPPORT_TYPES.map((type) => [type.key, type])
);

export const CATEGORIES = [
  "المهارات الرقمية",
  "التأهيل المهني",
  "ريادة الأعمال",
  "التدريب المجتمعي",
  "تمكين الشباب"
];

export const REGIONS = ["الرياض", "جدة", "الدمام", "أبها"];

export const SUPPORTER_KINDS = [
  "شركة تقنية",
  "معهد تدريب",
  "مؤسسة مانحة",
  "جهة توظيف",
  "خبراء واستشاريون"
];

export const REQUEST_STATUSES = {
  draft: {
    key: "draft",
    label: "مسودة",
    tone: "neutral",
    icon: "file-text",
    description: "لم يُسجّل إرسال بعد"
  },
  sent: {
    key: "sent",
    label: "أُرسل",
    tone: "info",
    icon: "send",
    description: "تم تسجيله داخل المحاكاة بانتظار رد الجهة"
  },
  reviewing: {
    key: "reviewing",
    label: "قيد المراجعة",
    tone: "warning",
    icon: "clock",
    description: "الجهة تراجع الطلب"
  },
  interested: {
    key: "interested",
    label: "مهتم",
    tone: "brand",
    icon: "heart-handshake",
    description: "الجهة أبدت اهتمامًا وتحتاج تفاصيل أكثر"
  },
  meeting: {
    key: "meeting",
    label: "اجتماع مقترح",
    tone: "info",
    icon: "calendar",
    description: "تم اقتراح اجتماع لمتابعة التفاصيل"
  },
  agreed: {
    key: "agreed",
    label: "موافقة مبدئية",
    tone: "success",
    icon: "check-circle",
    description: "توجد مساهمة مسجلة داخل المحاكاة"
  },
  declined: {
    key: "declined",
    label: "اعتذار",
    tone: "danger",
    icon: "x-circle",
    description: "الجهة اعتذرت عن المشاركة"
  },
  closed: {
    key: "closed",
    label: "مغلق",
    tone: "neutral",
    icon: "archive",
    description: "أُغلق الطلب"
  }
};

export const ACTIVE_REQUEST_STATUSES = ["sent", "reviewing", "interested", "meeting"];

export const REQUEST_FLOW = ["draft", "sent", "reviewing", "interested", "meeting", "agreed"];

export const COVERAGE_STATUSES = {
  uncovered: {
    key: "uncovered",
    label: "غير مغطى",
    tone: "neutral",
    icon: "circle-dashed"
  },
  in_talk: {
    key: "in_talk",
    label: "قيد التواصل",
    tone: "info",
    icon: "message-square"
  },
  partial: {
    key: "partial",
    label: "مغطى جزئيًا",
    tone: "warning",
    icon: "circle-half"
  },
  covered: {
    key: "covered",
    label: "تم الاتفاق",
    tone: "success",
    icon: "badge-check"
  }
};

export const PRIORITIES = {
  high: { key: "high", label: "عالية", tone: "danger" },
  medium: { key: "medium", label: "متوسطة", tone: "warning" },
  low: { key: "low", label: "منخفضة", tone: "neutral" }
};

export const CONTRIBUTION_STATES = {
  not_started: { key: "not_started", label: "لم يبدأ", tone: "neutral" },
  in_progress: { key: "in_progress", label: "جارٍ", tone: "info" },
  completed: { key: "completed", label: "اكتمل", tone: "success" }
};

export const OUTCOME_METRICS = {
  participants: {
    key: "participants",
    label: "المشاركون",
    icon: "users",
    unit: "مشارك"
  },
  training_completed: {
    key: "training_completed",
    label: "أكملوا التدريب",
    icon: "graduation-cap",
    unit: "متدرب"
  },
  internships: {
    key: "internships",
    label: "فرص التدريب العملي",
    icon: "briefcase",
    unit: "فرصة"
  },
  interviews: {
    key: "interviews",
    label: "مقابلات أو فرص مهنية",
    icon: "handshake",
    unit: "فرصة"
  }
};

export const NAV_GROUPS = {
  association: [
    {
      title: "الرئيسية",
      items: [
        { label: "نظرة عامة", href: "/association/overview", icon: "layout-dashboard" },
        { label: "التنبيهات", href: "/association/notifications", icon: "bell", badge: "notifications" }
      ]
    },
    {
      title: "المشاريع والاحتياجات",
      items: [
        { label: "المشاريع", href: "/association/projects", icon: "folder-kanban" },
        { label: "ما الذي تحتاجه مشاريعنا؟", href: "/association/needs", icon: "list-checks" },
        { label: "اكتشاف الجهات الداعمة", href: "/association/partners", icon: "users" },
        { label: "مساعد نيل", href: "/association/agent", icon: "sparkles" }
      ]
    },
    {
      title: "التعاون",
      items: [
        { label: "طلبات التعاون", href: "/association/requests", icon: "inbox", badge: "requests" },
        { label: "الشراكات والمساهمات", href: "/association/alliances", icon: "handshake" },
        { label: "الرسائل", href: "/association/messages", icon: "message-square" },
        { label: "قصة المشروع", href: "/association/stories", icon: "megaphone" }
      ]
    },
    {
      title: "النتائج",
      items: [
        { label: "نتائج الشباب", href: "/association/outcomes", icon: "chart-no-axes-column" }
      ]
    },
    {
      title: "الحساب",
      items: [
        { label: "ملف الجمعية", href: "/association/profile", icon: "building-2" },
        { label: "الإعدادات", href: "/association/settings", icon: "settings" }
      ]
    }
  ],
  supporter: [
    {
      title: "الرئيسية",
      items: [
        { label: "نظرة عامة", href: "/supporter/overview", icon: "layout-dashboard" },
        { label: "التنبيهات", href: "/supporter/notifications", icon: "bell", badge: "notifications" }
      ]
    },
    {
      title: "الاكتشاف",
      items: [
        { label: "المشاريع", href: "/supporter/discover", icon: "search" },
        { label: "اقتراحات مناسبة", href: "/supporter/recommendations", icon: "sparkles" },
        { label: "المحفوظات", href: "/supporter/saved", icon: "bookmark" }
      ]
    },
    {
      title: "التعاون",
      items: [
        { label: "طلبات التعاون", href: "/supporter/requests", icon: "inbox", badge: "requests" },
        { label: "مساهماتي", href: "/supporter/contributions", icon: "heart-handshake" },
        { label: "الشراكات المشتركة", href: "/supporter/alliances", icon: "handshake" },
        { label: "الرسائل", href: "/supporter/messages", icon: "message-square" }
      ]
    },
    {
      title: "النتائج",
      items: [
        { label: "أثر المساهمات", href: "/supporter/impact", icon: "chart-no-axes-column" }
      ]
    },
    {
      title: "الحساب",
      items: [
        { label: "ملف الجهة", href: "/supporter/profile", icon: "building-2" },
        { label: "الإعدادات", href: "/supporter/settings", icon: "settings" }
      ]
    }
  ]
};

export const METRIC_COLORS = {
  covered: "var(--success)",
  partial: "#C58A2F",
  in_talk: "var(--info)",
  uncovered: "var(--border-strong)"
};
