import { ACTIVE_REQUEST_STATUSES, REQUEST_STATUSES } from "../constants.js";
import { nowISO, sumBy, uid } from "../utils.js";
import { logActivity, pushNotification } from "../store.js";
import {
  getNeedById,
  getProjectById,
  getRequestMessages,
  getRequestsForNeed
} from "./projects.js";

const STATUS_TRANSITIONS = {
  draft: { sent: ["association"], closed: ["association"] },
  sent: {
    reviewing: ["supporter"],
    interested: ["supporter"],
    meeting: ["supporter"],
    declined: ["supporter"],
    closed: ["association"]
  },
  reviewing: {
    interested: ["supporter"],
    meeting: ["supporter"],
    declined: ["supporter"],
    closed: ["association"]
  },
  interested: {
    meeting: ["association", "supporter"],
    agreed: ["association", "supporter"],
    declined: ["supporter"],
    closed: ["association"]
  },
  meeting: {
    agreed: ["association", "supporter"],
    declined: ["supporter"],
    closed: ["association"]
  },
  agreed: { closed: ["association"] },
  declined: {},
  closed: {}
};

export function getRequestById(state, requestId) {
  return state.requests.find((request) => request.id === requestId) || null;
}

export function getRequestsForRole(state, role) {
  if (role === "association") {
    const organizationId = state.settings.associationOrgId;
    return state.requests.filter((request) => request.organizationId === organizationId);
  }
  const supporterId = state.settings.supporterId;
  return state.requests.filter(
    (request) => request.supporterId === supporterId && request.status !== "draft"
  );
}

export function isIncomingRequest(request, role) {
  return role === "association"
    ? request.initiatedBy === "supporter"
    : request.initiatedBy === "association";
}

export function getIncomingRequests(state, role) {
  return getRequestsForRole(state, role).filter((request) => isIncomingRequest(request, role));
}

export function getOutgoingRequests(state, role) {
  return getRequestsForRole(state, role).filter((request) => !isIncomingRequest(request, role));
}

export function getActiveRequestForPair(state, organizationId, supporterId, needId) {
  return (
    state.requests.find(
      (request) =>
        request.organizationId === organizationId &&
        request.supporterId === supporterId &&
        request.needId === needId &&
        !["declined", "closed"].includes(request.status)
    ) || null
  );
}

export function getCounterpartRole(role) {
  return role === "association" ? "supporter" : "association";
}

export function getRequestCounterpartName(state, request, role) {
  if (role === "association") {
    return state.supporters.find((item) => item.id === request.supporterId)?.name || "جهة داعمة";
  }
  return state.organizations.find((item) => item.id === request.organizationId)?.name || "جمعية";
}

export function canTransition(request, nextStatus, actorRole) {
  if (!request || !nextStatus) return false;
  const allowedRoles = STATUS_TRANSITIONS[request.status]?.[nextStatus] || [];
  return allowedRoles.includes(actorRole);
}

export function needsAction(request, role) {
  if (role === "association") {
    return request.status === "draft" ||
      (request.status === "interested" && request.initiatedBy === "supporter");
  }
  return ["sent", "reviewing"].includes(request.status);
}

export function getPendingOffersForRole(state, role) {
  if (role !== "association") return [];
  const organizationId = state.settings.associationOrgId;
  const ownProjectIds = new Set(
    state.projects.filter((project) => project.organizationId === organizationId).map((project) => project.id)
  );
  return state.contributions.filter(
    (contribution) => contribution.confirmed === false && ownProjectIds.has(contribution.projectId)
  );
}

export function getRequestMessagesForRole(state, requestId) {
  return getRequestMessages(state, requestId);
}

function requestLinkForRole(role, requestId) {
  const suffix = requestId ? `?request=${encodeURIComponent(requestId)}` : "";
  return role === "association"
    ? `#/association/messages${suffix}`
    : `#/supporter/messages${suffix}`;
}

function notifyCounterpart(state, actorRole, request, title, description) {
  const target = getCounterpartRole(actorRole);
  pushNotification(state, target, {
    title,
    description,
    link: requestLinkForRole(target, request.id)
  });
}

function actorName(state, role, request) {
  if (role === "association") {
    return state.organizations.find((item) => item.id === request.organizationId)?.name || "الجمعية";
  }
  return state.supporters.find((item) => item.id === request.supporterId)?.name || "الجهة الداعمة";
}

export function createRequest(state, data) {
  const project = getProjectById(state, data.projectId);
  if (!project) return null;
  const existing = getActiveRequestForPair(
    state,
    project.organizationId,
    data.supporterId,
    data.needId
  );
  if (existing) {
    return { request: existing, existing: true };
  }

  const request = {
    id: uid("REQ"),
    projectId: data.projectId,
    needId: data.needId,
    organizationId: project.organizationId,
    supporterId: data.supporterId,
    initiatedBy: data.initiatedBy || "association",
    message: String(data.message || "").trim(),
    status: data.status || "draft",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    lastContactAt: data.status === "sent" ? nowISO() : null,
    demo: true
  };
  state.requests.unshift(request);
  logActivity(
    state,
    request.initiatedBy,
    `${actorName(state, request.initiatedBy, request)} أنشأت طلب تعاون تجريبيًا بشأن «${getNeedById(state, request.needId)?.title || "احتياج"}».`,
    "request",
    request.id
  );
  if (request.status === "sent") {
    registerSendSideEffects(state, request, request.initiatedBy);
  }
  return { request, existing: false };
}

function registerSendSideEffects(state, request, actorRole) {
  if (request.message) {
    const messages = getRequestMessages(state, request.id);
    if (!messages.length) {
      state.messages.push({
        id: uid("MSG"),
        requestId: request.id,
        senderRole: actorRole,
        body: request.message,
        createdAt: nowISO(),
        demo: true
      });
    }
  }
  const target = getCounterpartRole(actorRole);
  pushNotification(state, target, {
    title: "طلب تعاون جديد",
    description: `${actorName(state, actorRole, request)} سجلت طلب تعاون داخل المحاكاة بشأن «${getNeedById(state, request.needId)?.title || "احتياج"}».`,
    link: requestLinkForRole(target, request.id)
  });
}

export function sendRequest(state, requestId) {
  const request = getRequestById(state, requestId);
  if (!request) return null;
  if (request.status !== "draft") return request;
  request.status = "sent";
  request.updatedAt = nowISO();
  request.lastContactAt = nowISO();
  registerSendSideEffects(state, request, "association");
  logActivity(
    state,
    "association",
    `أرسلت الجمعية طلب التعاون «${getNeedById(state, request.needId)?.title || ""}» إلى ${getRequestCounterpartName(state, request, "association")} داخل المحاكاة.`,
    "request",
    request.id
  );
  return request;
}

export function updateRequestStatus(state, requestId, nextStatus, actorRole, note = "") {
  const request = getRequestById(state, requestId);
  if (!request) return { ok: false, reason: "الطلب غير موجود." };
  const next = REQUEST_STATUSES[nextStatus];
  if (!next) return { ok: false, reason: "حالة الطلب غير معروفة." };
  if (request.status === nextStatus) return { ok: true, request, unchanged: true };
  if (!canTransition(request, nextStatus, actorRole)) {
    return { ok: false, reason: "هذا الانتقال غير متاح من الحالة الحالية." };
  }

  request.status = nextStatus;
  request.updatedAt = nowISO();
  if (["reviewing", "interested", "meeting", "agreed", "declined"].includes(nextStatus)) {
    request.lastContactAt = nowISO();
  }
  logActivity(
    state,
    actorRole,
    `حدّثت ${actorName(state, actorRole, request)} حالة طلب «${getNeedById(state, request.needId)?.title || ""}» إلى «${next.label}».${note ? ` ${note}` : ""}`,
    "request",
    request.id
  );
  notifyCounterpart(
    state,
    actorRole,
    request,
    "تحديث على طلب تعاون",
    `أصبحت حالة طلب «${getNeedById(state, request.needId)?.title || "احتياج"}»: ${next.label}.`
  );
  return { ok: true, request };
}

export function updateRequestMessage(state, requestId, message) {
  const request = getRequestById(state, requestId);
  if (!request) return null;
  request.message = String(message || "").trim();
  request.updatedAt = nowISO();
  logActivity(
    state,
    "association",
    `عدّلت الجمعية نص مسودة الطلب بشأن «${getNeedById(state, request.needId)?.title || ""}».`,
    "request",
    request.id
  );
  return request;
}

export function recordContribution(state, data) {
  const request = getRequestById(state, data.requestId);
  if (!request) return null;
  const need = getNeedById(state, request.needId);
  const quantity = data.quantity === "" || data.quantity == null ? null : Number(data.quantity);
  const existing = state.contributions.find(
    (contribution) => contribution.requestId === request.id && contribution.state !== "cancelled"
  );
  const contribution = existing || {
    id: uid("CNT"),
    projectId: request.projectId,
    needId: request.needId,
    supporterId: request.supporterId,
    requestId: request.id,
    agreedAt: nowISO(),
    demo: true
  };

  contribution.quantity = quantity;
  contribution.unit = data.unit || need?.unit || null;
  contribution.description = String(data.description || "").trim();
  contribution.state = data.state || "not_started";
  contribution.confirmed = data.confirmed !== false;
  contribution.updatedAt = nowISO();
  contribution.agreedAt = contribution.agreedAt || nowISO();
  if (!existing) state.contributions.unshift(contribution);

  request.status = "agreed";
  request.updatedAt = nowISO();
  request.lastContactAt = nowISO();

  logActivity(
    state,
    data.actorRole || "supporter",
    `${actorName(state, data.actorRole || "supporter", request)} سجلت مساهمة تجريبية في «${need?.title || "احتياج"}».`,
    "contribution",
    contribution.id
  );
  const target = getCounterpartRole(data.actorRole || "supporter");
  pushNotification(state, target, {
    title: contribution.confirmed === false ? "عرض مساهمة يحتاج مراجعة" : "تم تسجيل مساهمة",
    description: `${actorName(state, data.actorRole || "supporter", request)} أضافت مساهمة تجريبية في «${need?.title || "احتياج"}».`,
    link: target === "association"
      ? `#/association/alliances?project=${encodeURIComponent(request.projectId)}`
      : `#/supporter/contributions`
  });
  return contribution;
}

export function createSupporterOffer(state, data) {
  const project = getProjectById(state, data.projectId);
  if (!project) return null;
  const supporterId = state.settings.supporterId;
  let request = getActiveRequestForPair(
    state,
    project.organizationId,
    supporterId,
    data.needId
  );
  let createdRequest = false;

  if (!request) {
    const created = createRequest(state, {
      projectId: data.projectId,
      needId: data.needId,
      supporterId,
      initiatedBy: "supporter",
      message: String(data.message || "عرض مساهمة تجريبي من الجهة الداعمة.").trim(),
      status: "interested"
    });
    request = created?.request || null;
    createdRequest = !created?.existing;
  } else if (request.status === "meeting" || request.status === "agreed") {
    return { request, contribution: null, blocked: true };
  } else {
    request.status = "interested";
    request.updatedAt = nowISO();
    request.lastContactAt = nowISO();
    if (data.message) {
      state.messages.push({
        id: uid("MSG"),
        requestId: request.id,
        senderRole: "supporter",
        body: data.message,
        createdAt: nowISO(),
        demo: true
      });
    }
  }

  if (!request) return null;

  const need = getNeedById(state, request.needId);
  const quantity = data.quantity === "" || data.quantity == null ? null : Number(data.quantity);
  const contribution = {
    id: uid("CNT"),
    projectId: request.projectId,
    needId: request.needId,
    supporterId: request.supporterId,
    requestId: request.id,
    quantity,
    unit: need?.unit || null,
    description: String(data.description || "").trim(),
    state: "not_started",
    confirmed: false,
    proposedDate: data.proposedDate || null,
    agreedAt: nowISO(),
    updatedAt: nowISO(),
    demo: true
  };
  state.contributions.unshift(contribution);

  logActivity(
    state,
    "supporter",
    `قدّمت ${actorName(state, "supporter", request)} عرض مساهمة تجريبيًا في «${need?.title || "احتياج"}» بانتظار مراجعة الجمعية.`,
    "contribution",
    contribution.id
  );
  pushNotification(state, "association", {
    title: "عرض مساهمة بانتظار التأكيد",
    description: `${actorName(state, "supporter", request)} قدّمت عرضًا تجريبيًا في مشروع «${project.title}».`,
    link: `#/association/alliances?project=${encodeURIComponent(project.id)}`
  });
  return { request, contribution, createdRequest };
}

export function confirmContribution(state, contributionId, actorRole = "association") {
  const contribution = state.contributions.find((item) => item.id === contributionId);
  if (!contribution) return null;
  contribution.confirmed = true;
  contribution.updatedAt = nowISO();
  const request = getRequestById(state, contribution.requestId);
  if (request) {
    request.status = "agreed";
    request.updatedAt = nowISO();
    request.lastContactAt = nowISO();
    pushNotification(state, "supporter", {
      title: "تم تأكيد عرض المساهمة",
      description: `أكدت الجمعية عرض المساهمة في «${getNeedById(state, contribution.needId)?.title || "احتياج"}».`,
      link: "#/supporter/contributions"
    });
  }
  logActivity(
    state,
    actorRole,
    `أكدت الجمعية عرض المساهمة التجريبي في «${getNeedById(state, contribution.needId)?.title || ""}».`,
    "contribution",
    contribution.id
  );
  return contribution;
}

export function updateContributionState(state, contributionId, nextState) {
  const contribution = state.contributions.find((item) => item.id === contributionId);
  if (!contribution) return null;
  if (!["not_started", "in_progress", "completed"].includes(nextState)) return contribution;
  contribution.state = nextState;
  contribution.updatedAt = nowISO();
  const request = getRequestById(state, contribution.requestId);
  const need = getNeedById(state, contribution.needId);
  logActivity(
    state,
    "association",
    `حدّثت الجمعية حالة مساهمة «${need?.title || ""}» إلى «${nextState === "completed" ? "اكتمل" : nextState === "in_progress" ? "جارٍ" : "لم يبدأ"}».`,
    "contribution",
    contribution.id
  );
  if (request) {
    pushNotification(state, "supporter", {
      title: "تحديث تنفيذ مساهمة",
      description: `تم تحديث حالة مساهمتك في «${need?.title || "احتياج"}».`,
      link: "#/supporter/contributions"
    });
  }
  return contribution;
}

export function addMessageToRequest(state, requestId, senderRole, body) {
  const request = getRequestById(state, requestId);
  const text = String(body || "").trim();
  if (!request || !text) return null;
  const message = {
    id: uid("MSG"),
    requestId,
    senderRole,
    body: text,
    createdAt: nowISO(),
    demo: true
  };
  state.messages.push(message);
  request.updatedAt = nowISO();
  request.lastContactAt = nowISO();
  if (senderRole === "supporter" && request.status === "sent") {
    request.status = "reviewing";
  }
  const target = getCounterpartRole(senderRole);
  pushNotification(state, target, {
    title: "رسالة جديدة داخل المحاكاة",
    description: `${actorName(state, senderRole, request)} أضافت رسالة مرتبطة بطلب «${getNeedById(state, request.needId)?.title || "احتياج"}».`,
    link: requestLinkForRole(target, request.id)
  });
  logActivity(
    state,
    senderRole,
    `أضافت ${actorName(state, senderRole, request)} رسالة تجريبية مرتبطة بطلب تعاون.`,
    "request",
    request.id
  );
  return message;
}

export function getRequestContribution(state, requestId) {
  return (
    state.contributions.find(
      (contribution) => contribution.requestId === requestId && contribution.state !== "cancelled"
    ) || null
  );
}

export function getProjectContributionsTotal(state, projectId) {
  return sumBy(
    state.contributions.filter(
      (contribution) =>
        contribution.projectId === projectId &&
        contribution.confirmed !== false &&
        contribution.state !== "cancelled"
    ),
    (contribution) => contribution.quantity
  );
}

export function getNeedOpenRequests(state, needId) {
  return getRequestsForNeed(state, needId).filter((request) =>
    ACTIVE_REQUEST_STATUSES.includes(request.status)
  );
}
