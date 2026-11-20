import { ACTIVE_REQUEST_STATUSES } from "../constants.js";
import { nowISO, percentOf, sumBy, uid } from "../utils.js";
import { logActivity } from "../store.js";

export function getProjectById(state, projectId) {
  return state.projects.find((project) => project.id === projectId) || null;
}

export function getNeedById(state, needId) {
  return state.needs.find((need) => need.id === needId) || null;
}

export function getNeedsForProject(state, projectId) {
  return state.needs.filter((need) => need.projectId === projectId);
}

export function getProjectsForOrganization(state, organizationId) {
  return state.projects
    .filter((project) => project.organizationId === organizationId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getPublishedProjects(state) {
  return state.projects.filter((project) => project.status === "published");
}

export function getDiscoverableProjects(state) {
  return state.projects.filter(
    (project) => project.status === "published" && project.showOnDiscover !== false
  );
}

export function getRequestsForNeed(state, needId) {
  return state.requests.filter((request) => request.needId === needId);
}

export function getActiveRequestsForNeed(state, needId) {
  return getRequestsForNeed(state, needId).filter((request) =>
    ACTIVE_REQUEST_STATUSES.includes(request.status)
  );
}

export function getContributionsForNeed(state, needId) {
  return state.contributions.filter((contribution) => contribution.needId === needId);
}

export function getConfirmedContributionsForNeed(state, needId) {
  return getContributionsForNeed(state, needId).filter(
    (contribution) => contribution.confirmed !== false && contribution.state !== "cancelled"
  );
}

export function getNeedCoverage(state, need) {
  if (!need) {
    return {
      status: "uncovered",
      agreedQuantity: 0,
      requiredQuantity: null,
      remainingQuantity: null,
      percent: 0,
      contributions: [],
      confirmedContributions: [],
      pendingContributions: [],
      activeRequests: [],
      requestCount: 0
    };
  }

  const contributions = getContributionsForNeed(state, need.id);
  const confirmedContributions = contributions.filter(
    (contribution) => contribution.confirmed !== false && contribution.state !== "cancelled"
  );
  const pendingContributions = contributions.filter(
    (contribution) => contribution.confirmed === false && contribution.state !== "cancelled"
  );
  const activeRequests = getActiveRequestsForNeed(state, need.id);
  const agreedQuantity = sumBy(confirmedContributions, (contribution) => contribution.quantity);

  if (need.requiredQuantity == null) {
    const status = confirmedContributions.length
      ? "covered"
      : activeRequests.length || pendingContributions.length
        ? "in_talk"
        : "uncovered";
    return {
      status,
      agreedQuantity,
      requiredQuantity: null,
      remainingQuantity: null,
      percent: status === "covered" ? 100 : 0,
      contributions,
      confirmedContributions,
      pendingContributions,
      activeRequests,
      requestCount: getRequestsForNeed(state, need.id).length
    };
  }

  const requiredQuantity = Number(need.requiredQuantity) || 0;
  const remainingQuantity = Math.max(requiredQuantity - agreedQuantity, 0);
  let status = "uncovered";

  if (agreedQuantity >= requiredQuantity && requiredQuantity > 0) {
    status = "covered";
  } else if (agreedQuantity > 0) {
    status = "partial";
  } else if (activeRequests.length || pendingContributions.length) {
    status = "in_talk";
  }

  return {
    status,
    agreedQuantity,
    requiredQuantity,
    remainingQuantity,
    percent: percentOf(agreedQuantity, requiredQuantity),
    contributions,
    confirmedContributions,
    pendingContributions,
    activeRequests,
    requestCount: getRequestsForNeed(state, need.id).length
  };
}

export function getProjectCoverage(state, projectId) {
  const needs = getNeedsForProject(state, projectId);
  const items = needs.map((need) => ({ need, coverage: getNeedCoverage(state, need) }));
  const counts = {
    total: items.length,
    covered: items.filter((item) => item.coverage.status === "covered").length,
    partial: items.filter((item) => item.coverage.status === "partial").length,
    in_talk: items.filter((item) => item.coverage.status === "in_talk").length,
    uncovered: items.filter((item) => item.coverage.status === "uncovered").length
  };
  counts.unresolved = counts.total - counts.covered;
  return {
    items,
    counts,
    progressPercent: percentOf(counts.covered, counts.total),
    remainingNeeds: items.filter((item) => item.coverage.status !== "covered")
  };
}

export function getProjectRequests(state, projectId) {
  return state.requests
    .filter((request) => request.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getRequestMessages(state, requestId) {
  return state.messages
    .filter((message) => message.requestId === requestId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function getConversationRequests(state, requests) {
  return requests
    .map((request) => {
      const messages = getRequestMessages(state, request.id);
      return {
        request,
        messages,
        lastMessage: messages[messages.length - 1] || null
      };
    })
    .sort((a, b) => {
      const aDate = new Date(a.lastMessage?.createdAt || a.request.updatedAt || a.request.createdAt);
      const bDate = new Date(b.lastMessage?.createdAt || b.request.updatedAt || b.request.createdAt);
      return bDate - aDate;
    });
}

export function getProjectContributors(state, projectId) {
  const contributions = state.contributions.filter(
    (contribution) => contribution.projectId === projectId && contribution.state !== "cancelled"
  );
  const bySupporter = new Map();
  contributions.forEach((contribution) => {
    if (!bySupporter.has(contribution.supporterId)) {
      bySupporter.set(contribution.supporterId, {
        supporterId: contribution.supporterId,
        contributor: state.supporters.find((item) => item.id === contribution.supporterId) || null,
        contributions: [],
        roles: new Set()
      });
    }
    const entry = bySupporter.get(contribution.supporterId);
    entry.contributions.push(contribution);
    const need = getNeedById(state, contribution.needId);
    if (need) entry.roles.add(need.type);
  });
  return [...bySupporter.values()]
    .map((entry) => ({ ...entry, roles: [...entry.roles] }))
    .sort((a, b) => b.contributions.length - a.contributions.length);
}

export function getProjectOutcomes(state, projectId) {
  return state.outcomes
    .filter((outcome) => outcome.projectId === projectId)
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
}

export function getProjectSurveys(state, projectId) {
  return state.surveys
    .filter((survey) => survey.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getSupporterProjects(state, supporterId) {
  const ids = new Set(
    state.contributions
      .filter((contribution) => contribution.supporterId === supporterId)
      .map((contribution) => contribution.projectId)
  );
  state.requests
    .filter((request) => request.supporterId === supporterId)
    .forEach((request) => ids.add(request.projectId));
  return state.projects.filter((project) => ids.has(project.id));
}

export function isProjectSaved(state, supporterId, projectId) {
  return state.savedProjects.some(
    (item) => item.supporterId === supporterId && item.projectId === projectId
  );
}

export function toggleSavedProject(state, supporterId, projectId) {
  const existingIndex = state.savedProjects.findIndex(
    (item) => item.supporterId === supporterId && item.projectId === projectId
  );
  if (existingIndex >= 0) {
    state.savedProjects.splice(existingIndex, 1);
    return false;
  }
  state.savedProjects.push({
    supporterId,
    projectId,
    createdAt: nowISO(),
    demo: true
  });
  return true;
}

function normalizeNeedInput(need, projectId) {
  return {
    id: need.id || uid("NEED"),
    projectId,
    type: need.type,
    title: String(need.title || "").trim(),
    requiredQuantity:
      need.requiredQuantity === "" || need.requiredQuantity == null
        ? null
        : Number(need.requiredQuantity),
    unit: need.unit || null,
    details: String(need.details || "").trim(),
    priority: need.priority || "medium",
    dueDate: need.dueDate || null,
    createdAt: nowISO(),
    demo: true
  };
}

export function addNeedToProject(state, projectId, needData) {
  const project = getProjectById(state, projectId);
  if (!project) return null;
  const need = normalizeNeedInput(needData, projectId);
  state.needs.push(need);
  return need;
}

export function updateNeedInProject(state, needId, updates) {
  const need = getNeedById(state, needId);
  if (!need) return null;
  Object.assign(need, updates, { demo: true });
  return need;
}

export function createProject(state, data) {
  const organizationId = data.organizationId;
  const status = data.status === "published" ? "published" : "draft";
  const project = {
    id: uid("PROJ"),
    organizationId,
    title: String(data.title || "").trim(),
    description: String(data.description || "").trim(),
    region: data.region,
    category: data.category,
    targetYouth: Number(data.targetYouth) || 0,
    audience: String(data.audience || "").trim(),
    duration: String(data.duration || "").trim(),
    status,
    showOnDiscover: status === "published" && data.showOnDiscover !== false,
    availableResources: Array.isArray(data.availableResources)
      ? data.availableResources.filter(Boolean)
      : [],
    createdAt: nowISO(),
    publishedAt: status === "published" ? nowISO() : null,
    demo: true
  };
  state.projects.unshift(project);
  (data.needs || []).forEach((need) => addNeedToProject(state, project.id, need));
  logActivity(
    state,
    "association",
    status === "published"
      ? `نشرت الجمعية مشروع «${project.title}» في المحاكاة.`
      : `حفظت الجمعية مسودة مشروع «${project.title}».`,
    "project",
    project.id
  );
  return project;
}

export function updateProject(state, projectId, updates) {
  const project = getProjectById(state, projectId);
  if (!project) return null;
  Object.assign(project, updates, { demo: true });
  if (updates.status === "published" && !project.publishedAt) {
    project.publishedAt = nowISO();
    project.showOnDiscover = true;
  }
  logActivity(
    state,
    "association",
    `حدّثت الجمعية بيانات مشروع «${project.title}».`,
    "project",
    project.id
  );
  return project;
}

export function publishProject(state, projectId) {
  const project = getProjectById(state, projectId);
  if (!project) return null;
  project.status = "published";
  project.showOnDiscover = true;
  project.publishedAt = project.publishedAt || nowISO();
  logActivity(
    state,
    "association",
    `نشرت الجمعية مشروع «${project.title}» تجريبيًا.`,
    "project",
    project.id
  );
  return project;
}

export function getTotalActiveNeeds(state, projects) {
  return projects.flatMap((project) => getNeedsForProject(state, project.id));
}

export function countUnresolvedNeeds(state, organizationId) {
  const projects = getProjectsForOrganization(state, organizationId);
  return projects.reduce(
    (total, project) => total + getProjectCoverage(state, project.id).counts.unresolved,
    0
  );
}

export function getNeedRequestSummary(state, need) {
  const requests = getRequestsForNeed(state, need.id);
  return {
    total: requests.length,
    active: requests.filter((request) => ACTIVE_REQUEST_STATUSES.includes(request.status)).length,
    agreed: requests.filter((request) => request.status === "agreed").length
  };
}
