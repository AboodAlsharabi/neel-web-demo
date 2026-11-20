import { getNeedCoverage, getNeedsForProject } from "./projects.js";
import { rankSupportersForNeed } from "./matching.js";
import { formatQty, supportLabel } from "../utils.js";

function parseQuantity(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function detectNeed(text, key) {
  const detectors = {
    training: /مدرب|مدربين|مدربون|ورش|مسار تدريبي|تدريب مهني/,
    devices: /جهاز|أجهزة|حاسوب|حاسبات|لابتوب/,
    funding: /تشغيل|مصاريف|تكاليف|ميزانية|تمويل/,
    internship: /تدريب عملي|فرص تدريب|فرص مهنية|توظيف|مقابلات/,
    expertise: /خبرة|استشار|مراجعة منهج|مراجعة محتوى|إرشاد/,
    services: /برامج|خدمات|أدوات|منصة|حزم/
  };
  return detectors[key]?.test(text) || false;
}

export function analyzeProject(projectOrDescription, availableResources = []) {
  const isProject = Boolean(projectOrDescription && typeof projectOrDescription === "object");
  const project = isProject ? projectOrDescription : null;
  const description = isProject
    ? `${project.description || ""} ${(project.availableResources || []).join(" ")}`
    : String(projectOrDescription || "");
  const text = `${description} ${availableResources.join(" ")}`;
  const suggestions = [];
  const uncertain = [];
  const understood = [];

  if (detectNeed(text, "training")) {
    const quantity = parseQuantity(text, [
      /(\d+)\s*(?:مدرب|مدربين|مدربون)/,
      /(\d+)\s*(?:ورشة|ورش)/
    ]);
    suggestions.push({
      key: "training",
      type: "training",
      title: quantity ? "مدربون للمسار التدريبي" : "مدربون وورش تدريب",
      details: "تغطية المدربين أو الورش المطلوبة للمسار التدريبي.",
      requiredQuantity: quantity,
      unit: quantity ? "trainer" : "trainer",
      priority: "high",
      note: quantity ? "العدد مذكور في وصف المشروع." : "لم يحدد النص عدد المدربين؛ يمكن تعديل الكمية قبل الاعتماد."
    });
  }

  if (detectNeed(text, "devices")) {
    const quantity = parseQuantity(text, [
      /(\d+)\s*(?:جهاز|أجهزة|حاسوب|حاسبات|لابتوب)/
    ]);
    suggestions.push({
      key: "devices",
      type: "devices",
      title: "أجهزة حاسوب للتدريب",
      details: "أجهزة للاستخدام داخل الأنشطة التدريبية، مع توضيح الغرض والمدة.",
      requiredQuantity: quantity,
      unit: "device",
      priority: "high",
      note: quantity ? "العدد مذكور في وصف المشروع." : "لم يحدد النص عدد الأجهزة؛ يمكن تعديل الكمية قبل الاعتماد."
    });
  }

  if (detectNeed(text, "funding")) {
    suggestions.push({
      key: "funding",
      type: "funding",
      title: "تكاليف تشغيل البرنامج",
      details: "تعهد وصفي لتغطية مصاريف التشغيل والمواد، دون اختراع ميزانية أو مبلغ في المحاكاة.",
      requiredQuantity: null,
      unit: null,
      priority: "medium",
      note: "الاحتياج المالي يبقى وصفيًا في هذه المحاكاة."
    });
  }

  if (detectNeed(text, "internship")) {
    const quantity = parseQuantity(text, [/(\d+)\s*(?:فرصة|فرص)/]);
    suggestions.push({
      key: "internship",
      type: "internship",
      title: "فرص تدريب عملي",
      details: "فرص تطبيقية قصيرة للشباب بعد التدريب أو أثناءه.",
      requiredQuantity: quantity,
      unit: "opportunity",
      priority: "medium",
      note: quantity ? "العدد مذكور في وصف المشروع." : "لم يحدد النص عدد الفرص؛ يمكن تعديل الكمية قبل الاعتماد."
    });
  }

  if (detectNeed(text, "expertise")) {
    const quantity = parseQuantity(text, [/(\d+)\s*(?:جلسة|جلسات)/]);
    suggestions.push({
      key: "expertise",
      type: "expertise",
      title: "خبرة أو استشارات",
      details: "مراجعة المنهج أو جلسات إرشاد حسب ما يذكره وصف المشروع.",
      requiredQuantity: quantity,
      unit: quantity ? "session" : null,
      priority: "medium",
      note: quantity ? "العدد مذكور في وصف المشروع." : "يمكن ترك الكمية وصفية إن لم تكن محددة."
    });
  }

  if (detectNeed(text, "services")) {
    const quantity = parseQuantity(text, [/(\d+)\s*(?:حزمة|حزم)/]);
    suggestions.push({
      key: "services",
      type: "services",
      title: "خدمات أو برامج مساندة",
      details: "خدمات تقنية أو برامج تدعم تنفيذ المشروع.",
      requiredQuantity: quantity,
      unit: quantity ? "package" : null,
      priority: "medium",
      note: quantity ? "العدد مذكور في وصف المشروع." : "لم يحدد النص الكمية؛ يمكن تعديلها قبل الاعتماد."
    });
  }

  if (project?.region) {
    understood.push(`المدينة: ${project.region} (من بيانات المشروع).`);
  } else if (/الرياض|جدة|الدمام|أبها/.test(text)) {
    const city = text.match(/الرياض|جدة|الدمام|أبها/)?.[0];
    understood.push(`المدينة: ${city}.`);
  } else {
    uncertain.push("لم تحدد المدينة في النص؛ أضفها قبل الاعتماد إن كانت مطلوبة للترشيح.");
  }

  if (project?.targetYouth) {
    understood.push(`عدد المستفيدين المستهدف: ${project.targetYouth}.`);
  } else {
    const target = text.match(/(\d+)\s*(?:شاب|شابة|مشارك|مستفيد)/);
    if (target) understood.push(`عدد المستفيدين المستهدف: ${target[1]}.`);
    else uncertain.push("لم يظهر عدد المستفيدين المستهدف بوضوح في النص.");
  }

  if (/قاعة|مساحة|فريق إشراف|منسق/.test(text)) {
    understood.push("تعرفنا على موارد متوفرة مثل القاعة أو فريق الإشراف.");
  }

  if (suggestions.length) {
    understood.push(`تعرفنا على ${suggestions.length} أنواع دعم مطلوبة يمكن فصلها إلى احتياجات مستقلة.`);
  } else {
    uncertain.push("لم نتعرف على احتياج واضح. اكتب ما يوفره المشروع وما ينقصه بصورة مباشرة.");
  }

  const needsWithMissingQuantity = suggestions.filter(
    (suggestion) => suggestion.requiredQuantity == null && suggestion.type !== "funding"
  );
  if (needsWithMissingQuantity.length) {
    uncertain.push("بعض الاحتياجات لا تحدد كمية؛ راجعها وعدّلها قبل الاعتماد. لم نخترع أرقامًا غير مذكورة.");
  }

  return {
    summary: suggestions.length
      ? `فهمنا أن المشروع يحتاج ${suggestions.length} أنواع من الدعم، ويمكن التعامل مع كل نوع كاحتياج مستقل.`
      : "لم نستخرج احتياجات واضحة من النص الحالي.",
    suggestions,
    understood,
    uncertain,
    disclaimer: "محاكاة ذكية بقواعد تجريبية — النتائج تحتاج مراجعة بشرية."
  };
}

export function recommendPartners(project, needs, availablePartners) {
  return needs.map((need) => ({
    need,
    partners: rankSupportersForNeed(need, project, availablePartners)
  }));
}

export function generateOutreachDraft(project, need, partner, organization) {
  const orgName = organization?.name || "الجمعية";
  const quantity = need.requiredQuantity
    ? formatQty(need.requiredQuantity, need.unit)
    : "ما يتوفر لديكم من دعم وصفي";
  const resources = (project.availableResources || []).join("، ");
  const base = `السلام عليكم فريق ${partner.name}،\n\nنحن في ${orgName} نعمل على مشروع «${project.title}» في ${project.region}، ونستهدف ${project.targetYouth} من الشباب.\n\n`;
  const closing = `\n\nهل يمكننا مناقشة إمكانية المشاركة داخل نطاق ما تعلنه جهتكم؟ هذه مسودة محاكاة ولم تُرسل خارج النموذج.\n\nشكرًا لكم.`;

  if (partner.supportTypes.includes("training") || partner.kind.includes("معهد")) {
    return {
      kind: "training",
      subject: `تعاون تدريبي مقترح — ${project.title}`,
      body: `${base}نحتاج إلى ${quantity} ضمن احتياج «${need.title}». ${need.details}\n\nالموارد المتوفرة لدينا: ${resources || "غير محددة"}. نرغب في معرفة الموضوعات والساعات والمخرجات المتوقعة والقدرة المعلنة لجهتكم.${closing}`
    };
  }
  if (partner.supportTypes.includes("devices") || partner.kind.includes("شركة تقنية")) {
    return {
      kind: "devices",
      subject: `إمكانية توفير أجهزة — ${project.title}`,
      body: `${base}نحتاج إلى ${quantity} ضمن احتياج «${need.title}». ${need.details}\n\nنرغب في معرفة نوع الأجهزة المتاحة، ومدة الاستخدام المقترحة، وطريقة التسليم والتجهيز داخل النموذج التجريبي.${closing}`
    };
  }
  if (partner.supportTypes.includes("internship") || partner.kind.includes("توظيف")) {
    return {
      kind: "internship",
      subject: `فرص تدريب عملي — ${project.title}`,
      body: `${base}نبحث عن ${quantity} ضمن احتياج «${need.title}». ${need.details}\n\nنرغب في معرفة المهارات المستهدفة ومدة التجربة وطريقة المتابعة، دون تحديد التزامات خارج هذا النموذج.${closing}`
    };
  }
  if (partner.supportTypes.includes("funding")) {
    return {
      kind: "funding",
      subject: `بحث تعاون لتكاليف التشغيل — ${project.title}`,
      body: `${base}لدينا احتياج «${need.title}»: ${need.details}\n\nنرغب في معرفة أوجه الصرف التي يمكن أن تدعمها جهتكم وآلية المتابعة، على أن يبقى ذلك تعهدًا وصفيًا داخل المحاكاة دون تحويل أموال.${closing}`
    };
  }
  return {
    kind: "general",
    subject: `تعاون مقترح — ${project.title}`,
    body: `${base}نحتاج إلى ${quantity} ضمن احتياج «${need.title}». ${need.details}\n\nنرغب في معرفة ما يمكن أن تقدمه جهتكم ومتى تكون متاحة.${closing}`
  };
}

export function suggestNextAction(project, requests, commitments, state, needs = []) {
  const interested = requests.find((request) => request.status === "interested");
  if (interested) {
    const supporterName =
      state?.supporters.find((supporter) => supporter.id === interested.supporterId)?.name || "الجهة المهتمة";
    return {
      title: "اقترح موعد اجتماع",
      description: `${supporterName} أبدت الاهتمام. الخطوة التالية هي اقتراح موعد اجتماع لتوضيح التفاصيل.`,
      link: "#/association/requests",
      tone: "brand",
      type: "meeting"
    };
  }

  const pending = commitments.find((contribution) => contribution.confirmed === false);
  if (pending) {
    const need = state?.needs.find((item) => item.id === pending.needId);
    return {
      title: "راجع عرض مساهمة",
      description: `يوجد عرض مساهمة بانتظار التأكيد في «${need?.title || "احتياج"}».`,
      link: `#/association/alliances?project=${encodeURIComponent(project.id)}`,
      tone: "warning",
      type: "confirm-offer"
    };
  }

  const partiallyCovered = needs
    .map((need) => ({ need, coverage: state ? getNeedCoverage(state, need) : null }))
    .find((item) => item.coverage?.status === "partial");
  if (partiallyCovered) {
    return {
      title: "أكمل ما تبقّى من الاحتياج",
      description: `تبقّى ${partiallyCovered.coverage.remainingQuantity} من ${formatQty(partiallyCovered.coverage.requiredQuantity, partiallyCovered.need.unit)} في «${partiallyCovered.need.title}». يمكن البحث عن جهة مكملة.`,
      link: `#/association/partners?need=${encodeURIComponent(partiallyCovered.need.id)}`,
      tone: "warning",
      type: "remaining"
    };
  }

  const openNeed = needs.find((need) => state && getNeedCoverage(state, need).status === "uncovered");
  if (openNeed) {
    return {
      title: "رشّح شريكًا للاحتياج التالي",
      description: `ما زال «${openNeed.title}» بلا تغطية. راجع الجهات التي تقدم هذا النوع من الدعم مع سبب الترشيح.`,
      link: `#/association/partners?need=${encodeURIComponent(openNeed.id)}`,
      tone: "brand",
      type: "match"
    };
  }

  return {
    title: "وثّق نتائج الشباب",
    description: "الاحتياجات المعلنة مغطاة في المحاكاة. الخطوة التالية هي تسجيل النتائج ومصدر المعلومة.",
    link: "#/association/outcomes",
    tone: "success",
    type: "outcomes"
  };
}

export function summarizeProject(project, needs, state) {
  const available = (project.availableResources || []).join("، ") || "لم تحدد الجمعية موارد متوفرة بعد";
  const needLines = needs.map((need) => {
    const coverage = state ? getNeedCoverage(state, need) : null;
    const statusText =
      coverage?.status === "covered"
        ? "تم الاتفاق"
        : coverage?.status === "partial"
          ? `مغطى جزئيًا (${coverage.agreedQuantity} من ${coverage.requiredQuantity})`
          : coverage?.status === "in_talk"
            ? "قيد التواصل"
            : "غير مغطى";
    return `${need.title}: ${need.requiredQuantity ? formatQty(need.requiredQuantity, need.unit) : "دعم وصفي"} — ${statusText}`;
  });

  return {
    summary: `مشروع «${project.title}» في ${project.region} يستهدف ${project.targetYouth} من الشباب ضمن مجال ${project.category}. المتوفر: ${available}.`,
    bullets: needLines.length ? needLines : ["لم تُسجل احتياجات منفصلة بعد."],
    note: "ملخص محاكاة مبني على بيانات المشروع فقط، وليس توصية أو قرارًا."
  };
}

export function getPartnerKindLabel(partner) {
  return partner.kind || "جهة داعمة";
}

export function getSupportCoverageText(need, supporter) {
  return supporter.supportTypes.includes(need.type)
    ? `تقدم ${supportLabel(need.type)} في ملفها التجريبي.`
    : `لا يذكر ملفها الحالي نوع «${supportLabel(need.type)}».`;
}
