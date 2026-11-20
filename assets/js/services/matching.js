import { supportLabel } from "../utils.js";
import { getNeedCoverage, getNeedsForProject } from "./projects.js";

export function getMatchLabel(score) {
  if (score >= 85) return { key: "high", label: "مناسب جدًا", tone: "success" };
  if (score >= 60) return { key: "medium", label: "مناسب", tone: "info" };
  return { key: "low", label: "بحاجة لمراجعة", tone: "warning" };
}

function capacityForNeed(supporter, need) {
  const capacity = supporter.capacity || {};
  if (need.type === "devices") return Number(capacity.devices || 0);
  if (need.type === "training") return Number(capacity.trainers || capacity.workshops || 0);
  if (need.type === "internship") return Number(capacity.opportunities || 0);
  if (need.type === "expertise") return Number(capacity.sessions || capacity.workshops || 0);
  if (need.type === "services") return Number(capacity.packages || 0);
  if (need.type === "funding") return Number(capacity.fundingPrograms || 0);
  return 0;
}

function capacityLabel(type, value, need) {
  const unitLabels = {
    devices: "جهازًا",
    training: "مدربًا أو ورشة",
    internship: "فرصة",
    expertise: "جلسة",
    services: "حزمة",
    funding: "برنامجًا"
  };
  const verb = need.requiredQuantity ? `من أصل ${need.requiredQuantity}` : "";
  return `قدرتها المعلنة تشمل ${value} ${unitLabels[type] || ""}${verb ? ` ${verb}` : ""}.`;
}

export function evaluateSupporterForNeed(need, project, supporter) {
  const reasons = [];
  const missing = [];
  let score = 0;
  let typePoints = 0;
  let categoryPoints = 0;
  let regionPoints = 0;
  let capacityPoints = 0;

  const typeMatch = supporter.supportTypes.includes(need.type);
  if (typeMatch) {
    typePoints = 45;
    score += typePoints;
    reasons.push(`تقدم ${supportLabel(need.type)}، وهو نوع الدعم المطلوب في هذا الاحتياج.`);
  } else {
    missing.push(`لا يذكر ملفها أن من أنواع مساهماتها «${supportLabel(need.type)}».`);
  }

  const categoryMatch = supporter.categories.includes(project.category);
  if (categoryMatch) {
    categoryPoints = 25;
    score += categoryPoints;
    reasons.push(`تعمل في مجال «${project.category}» المرتبط بالمشروع.`);
  } else if (!supporter.categories?.length) {
    missing.push("ملف الجهة لا يحدد مجالات الاهتمام.");
  } else {
    missing.push(`مجالاتها المعلنة لا تشمل «${project.category}» مباشرة.`);
  }

  const regionMatch = supporter.regions.includes(project.region);
  if (regionMatch) {
    regionPoints = 15;
    score += regionPoints;
    reasons.push(`تخدم منطقة ${project.region} المحددة في المشروع.`);
  } else if (!supporter.regions?.length) {
    missing.push("ملف الجهة لا يحدد المناطق التي تخدمها.");
  } else {
    missing.push(`مناطقها المعلنة (${supporter.regions.join("، ")}) لا تشمل ${project.region}.`);
  }

  const capacityAmount = capacityForNeed(supporter, need);
  if (typeMatch && capacityAmount > 0) {
    const required = Number(need.requiredQuantity) || 0;
    const ratio = required > 0 ? Math.min(capacityAmount / required, 1) : 1;
    capacityPoints = Math.round(15 * ratio * 10) / 10;
    score += capacityPoints;
    reasons.push(capacityLabel(need.type, capacityAmount, need));
  } else if (typeMatch) {
    missing.push("لا تحدد بيانات المحاكاة قدرة كمية واضحة لهذا النوع، ويمكن التحقق منها عند التواصل.");
  }

  score = Math.round(score);
  const label = getMatchLabel(score);
  return {
    score,
    label: label.label,
    tone: label.tone,
    level: label.key,
    typeMatch,
    categoryMatch,
    regionMatch,
    reasons,
    missing,
    breakdown: {
      type: typePoints,
      category: categoryPoints,
      region: regionPoints,
      capacity: Math.round(capacityPoints)
    }
  };
}

export function rankSupportersForNeed(need, project, supporters) {
  return supporters
    .map((supporter) => ({
      supporter,
      evaluation: evaluateSupporterForNeed(need, project, supporter)
    }))
    .sort((a, b) => {
      if (b.evaluation.typeMatch !== a.evaluation.typeMatch) {
        return Number(b.evaluation.typeMatch) - Number(a.evaluation.typeMatch);
      }
      return b.evaluation.score - a.evaluation.score;
    });
}

export function evaluateProjectForSupporter(state, project, supporter) {
  const needs = getNeedsForProject(state, project.id);
  const relevantNeeds = needs
    .map((need) => ({
      need,
      coverage: getNeedCoverage(state, need),
      evaluation: evaluateSupporterForNeed(need, project, supporter)
    }))
    .filter((item) => item.coverage.status !== "covered")
    .sort((a, b) => b.evaluation.score - a.evaluation.score);

  if (!relevantNeeds.length) {
    return {
      score: 0,
      label: "لا توجد احتياجات مفتوحة",
      tone: "neutral",
      level: "low",
      reasons: ["كل الاحتياجات المعلنة في المشروع تم الاتفاق عليها في المحاكاة."],
      missing: [],
      relevantNeeds: []
    };
  }

  const best = relevantNeeds[0];
  const supportingNeeds = relevantNeeds.filter((item) => item.evaluation.typeMatch);
  const extraPoints = supportingNeeds.length > 1 ? Math.min((supportingNeeds.length - 1) * 3, 9) : 0;
  const score = Math.min(best.evaluation.score + extraPoints, 99);
  const reasons = [...best.evaluation.reasons];
  if (supportingNeeds.length > 1) {
    reasons.push(`يوجد ${supportingNeeds.length} احتياجات ضمن أنواع الدعم التي تقدمها.`);
  }
  const label = getMatchLabel(score);
  return {
    score,
    label: label.label,
    tone: label.tone,
    level: label.key,
    reasons,
    missing: best.evaluation.missing,
    relevantNeeds,
    bestMatch: best
  };
}

export function rankProjectsForSupporter(state, projects, supporter) {
  return projects
    .map((project) => ({
      project,
      match: evaluateProjectForSupporter(state, project, supporter)
    }))
    .sort((a, b) => b.match.score - a.match.score);
}

export function getMatchFactorLabel(key) {
  const labels = {
    type: "نوع الدعم",
    category: "المجال",
    region: "المنطقة",
    capacity: "القدرة المعلنة"
  };
  return labels[key] || key;
}

export function getMatchFactorMax(key) {
  return key === "type" ? 45 : key === "category" ? 25 : key === "region" ? 15 : 15;
}
