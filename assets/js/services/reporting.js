import { OUTCOME_METRICS, SUPPORT_TYPE_MAP } from "../constants.js";
import { nowISO, sumBy, uid } from "../utils.js";
import { logActivity } from "../store.js";
import {
  getNeedsForProject,
  getProjectCoverage,
  getProjectOutcomes,
  getProjectSurveys,
  getProjectsForOrganization,
  getSupporterProjects
} from "./projects.js";
import { getRequestsForRole, isIncomingRequest } from "./requests.js";
import { rankProjectsForSupporter } from "./matching.js";

export function getAssociationMetrics(state, organizationId) {
  const projects = getProjectsForOrganization(state, organizationId);
  const activeProjects = projects.filter((project) => project.status === "published");
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const requests = getRequestsForRole(state, "association");
  const awaitingReply = requests.filter((request) => ["sent", "reviewing"].includes(request.status));
  const contributions = state.contributions.filter(
    (contribution) =>
      projectsById.has(contribution.projectId) &&
      contribution.confirmed !== false &&
      contribution.state !== "cancelled"
  );

  let unresolvedNeeds = 0;
  let uncoveredNeeds = 0;
  let partialNeeds = 0;
  let inTalkNeeds = 0;
  const coverageCounts = { covered: 0, partial: 0, in_talk: 0, uncovered: 0, total: 0 };

  projects.forEach((project) => {
    const coverage = getProjectCoverage(state, project.id);
    unresolvedNeeds += coverage.counts.unresolved;
    uncoveredNeeds += coverage.counts.uncovered;
    partialNeeds += coverage.counts.partial;
    inTalkNeeds += coverage.counts.in_talk;
    coverageCounts.covered += coverage.counts.covered;
    coverageCounts.partial += coverage.counts.partial;
    coverageCounts.in_talk += coverage.counts.in_talk;
    coverageCounts.uncovered += coverage.counts.uncovered;
    coverageCounts.total += coverage.counts.total;
  });

  return {
    projects,
    activeProjects,
    requests,
    awaitingReply,
    contributions,
    agreedContributionsCount: contributions.length,
    unresolvedNeeds,
    uncoveredNeeds,
    partialNeeds,
    inTalkNeeds,
    coverageCounts
  };
}

export function getSupporterMetrics(state) {
  const supporter = state.supporters.find((item) => item.id === state.settings.supporterId);
  const projects = state.projects.filter(
    (project) => project.status === "published" && project.showOnDiscover !== false
  );
  const ranked = supporter ? rankProjectsForSupporter(state, projects, supporter) : [];
  const suitableProjects = ranked.filter(
    (item) => item.match.score >= 60 && item.match.relevantNeeds.length
  );
  const requests = getRequestsForRole(state, "supporter");
  const incoming = requests.filter((request) => isIncomingRequest(request, "supporter"));
  const newRequests = incoming.filter((request) => ["sent", "reviewing"].includes(request.status));
  const contributions = state.contributions.filter(
    (contribution) => contribution.supporterId === state.settings.supporterId
  );
  const confirmedContributions = contributions.filter(
    (contribution) => contribution.confirmed !== false && contribution.state !== "cancelled"
  );
  const inProgress = confirmedContributions.filter(
    (contribution) => contribution.state !== "completed"
  );
  const completed = confirmedContributions.filter(
    (contribution) => contribution.state === "completed"
  );

  return {
    supporter,
    ranked,
    suitableProjects,
    requests,
    incoming,
    newRequests,
    contributions,
    confirmedContributions,
    inProgress,
    completed
  };
}

export function getNeedsByType(state, projects) {
  const needs = projects.flatMap((project) => getNeedsForProject(state, project.id));
  return Object.values(SUPPORT_TYPE_MAP)
    .map((type) => {
      const typeNeeds = needs.filter((need) => need.type === type.key);
      return {
        key: type.key,
        label: type.shortLabel,
        count: typeNeeds.length,
        uncovered: typeNeeds.filter((need) => {
          const coverage = getProjectCoverage(state, need.projectId);
          return coverage.items.find((item) => item.need.id === need.id)?.coverage.status === "uncovered";
        }).length
      };
    })
    .filter((item) => item.count > 0);
}

export function getNeedTypeCounts(state, needs) {
  return Object.values(SUPPORT_TYPE_MAP)
    .map((type) => {
      const items = needs.filter((need) => need.type === type.key);
      return { ...type, count: items.length };
    })
    .filter((item) => item.count > 0);
}

export function getLatestOutcome(state, projectId, metric) {
  return getProjectOutcomes(state, projectId).find((outcome) => outcome.metric === metric) || null;
}

export function getOutcomeRows(state, project) {
  const needs = getNeedsForProject(state, project.id);
  const internshipNeed = needs.find((need) => need.type === "internship");
  const trainingNeed = needs.find((need) => need.type === "training");
  return Object.values(OUTCOME_METRICS).map((metric) => {
    const outcome = getLatestOutcome(state, project.id, metric.key);
    const defaultTarget =
      metric.key === "participants"
        ? project.targetYouth
        : metric.key === "training_completed"
          ? project.targetYouth
          : metric.key === "internships"
            ? internshipNeed?.requiredQuantity || 0
            : 0;
    return {
      metric,
      target: outcome?.target ?? defaultTarget,
      actual: outcome?.actual ?? null,
      unit: outcome?.unit || metric.unit,
      source: outcome?.source || "",
      evidenceNote: outcome?.evidenceNote || "",
      recordedAt: outcome?.recordedAt || null,
      recorded: Boolean(outcome),
      id: outcome?.id || null,
      trainingNeed
    };
  });
}

export function recordOutcome(state, data) {
  const project = state.projects.find((item) => item.id === data.projectId);
  if (!project) return null;
  const existing = state.outcomes.find(
    (outcome) => outcome.projectId === data.projectId && outcome.metric === data.metric
  );
  const outcome = existing || {
    id: uid("OUT"),
    projectId: data.projectId,
    metric: data.metric,
    demo: true
  };
  outcome.target = Number(data.target) || 0;
  outcome.actual = Number(data.actual) || 0;
  outcome.unit = data.unit || OUTCOME_METRICS[data.metric]?.unit || "";
  outcome.evidenceNote = String(data.evidenceNote || "").trim();
  outcome.source = String(data.source || "مصدر تجريبي").trim();
  outcome.recordedAt = nowISO();
  if (!existing) state.outcomes.unshift(outcome);
  logActivity(
    state,
    "association",
    `سجلت الجمعية نتيجة «${OUTCOME_METRICS[data.metric]?.label || data.metric}» لمشروع «${project.title}»: ${outcome.actual} من أصل ${outcome.target}.`,
    "project",
    project.id
  );
  return outcome;
}

export function addSurveyResponse(state, data) {
  const project = state.projects.find((item) => item.id === data.projectId);
  if (!project) return null;
  const response = {
    id: uid("SRV"),
    projectId: data.projectId,
    answer1: String(data.answer1 || "").trim(),
    answer2: String(data.answer2 || "").trim(),
    answer3: String(data.answer3 || "").trim(),
    createdAt: nowISO(),
    demo: true
  };
  state.surveys.unshift(response);
  logActivity(
    state,
    "association",
    `أُضيف رد استبيان غير معرّف لمشروع «${project.title}» داخل المحاكاة.`,
    "survey",
    project.id
  );
  return response;
}

export function getSurveySummary(state, projectId) {
  const responses = getProjectSurveys(state, projectId);
  const skills = new Map();
  const usefulness = new Map();
  const suggestions = new Map();
  responses.forEach((response) => {
    if (response.answer1) skills.set(response.answer1, (skills.get(response.answer1) || 0) + 1);
    if (response.answer2) usefulness.set(response.answer2, (usefulness.get(response.answer2) || 0) + 1);
    if (response.answer3) suggestions.set(response.answer3, (suggestions.get(response.answer3) || 0) + 1);
  });
  const sortMap = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]);
  return {
    count: responses.length,
    responses,
    skills: sortMap(skills).map(([value, count]) => ({ value, count })),
    usefulness: sortMap(usefulness).map(([value, count]) => ({ value, count })),
    suggestions: sortMap(suggestions).map(([value, count]) => ({ value, count }))
  };
}

export function getProjectImpactRows(state, projectId) {
  const outcomes = getProjectOutcomes(state, projectId);
  return outcomes.map((outcome) => ({
    ...outcome,
    label: OUTCOME_METRICS[outcome.metric]?.label || outcome.metric,
    percent: outcome.target > 0 ? Math.min((outcome.actual / outcome.target) * 100, 100) : 0
  }));
}

export function getSupporterImpact(state) {
  const supporterId = state.settings.supporterId;
  const projects = getSupporterProjects(state, supporterId);
  const contributions = state.contributions.filter(
    (contribution) =>
      contribution.supporterId === supporterId && contribution.state !== "cancelled"
  );
  return projects
    .map((project) => {
      const projectContributions = contributions.filter(
        (contribution) => contribution.projectId === project.id
      );
      return {
        project,
        contributions: projectContributions,
        outcomes: getProjectImpactRows(state, project.id),
        completed: projectContributions.filter((contribution) => contribution.state === "completed").length,
        total: projectContributions.length
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function getContributionQuantitySummary(contribution) {
  if (contribution.quantity == null) return "تعهد وصفي";
  return `${contribution.quantity} ${contribution.unit || ""}`.trim();
}

export function getSupporterRecommendedRows(state) {
  const metrics = getSupporterMetrics(state);
  return metrics.ranked;
}

export function getOverallCompletion(contributions) {
  const total = contributions.length;
  const completed = contributions.filter((contribution) => contribution.state === "completed").length;
  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0
  };
}

export function getOutcomeTotals(state, projectId) {
  const outcomes = getProjectOutcomes(state, projectId);
  return {
    recorded: outcomes.length,
    actualParticipants: outcomes.find((outcome) => outcome.metric === "participants")?.actual || 0,
    actualCompleted: outcomes.find((outcome) => outcome.metric === "training_completed")?.actual || 0,
    source: outcomes[0]?.source || "لم يُسجل مصدر بعد"
  };
}

export function getContributionsForProject(state, projectId) {
  return state.contributions.filter(
    (contribution) => contribution.projectId === projectId && contribution.state !== "cancelled"
  );
}

export function getContributionQuantityTotal(contributions) {
  return sumBy(contributions, (contribution) => contribution.quantity);
}
