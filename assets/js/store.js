import { SEED_VERSION, createSeedData } from "./seed-data.js";
import { nowISO, uid } from "./utils.js";

const PREFIX = "neel-demo-v1";
const STATE_KEY = `${PREFIX}:state`;
const SESSION_KEY = `${PREFIX}:session`;
const FLASH_KEY = `${PREFIX}:flash`;
const TOUR_KEY = `${PREFIX}:tour`;

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function safeGet(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // The demo keeps working in memory if storage is unavailable.
  }
}

function safeRemove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function readInitialState() {
  const raw = safeGet(window.localStorage, STATE_KEY);
  if (!raw) return createSeedData();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.meta?.version !== SEED_VERSION) return createSeedData();
    return parsed;
  } catch {
    return createSeedData();
  }
}

let state = readInitialState();
let sessionCache = null;

function persistState() {
  safeSet(window.localStorage, STATE_KEY, JSON.stringify(state));
}

function emitStateChange() {
  window.dispatchEvent(new CustomEvent("neel:state-change", { detail: { state } }));
}

export function getState() {
  return state;
}

export function commit(mutator, { silent = false } = {}) {
  mutator(state);
  state.meta.updatedAt = nowISO();
  persistState();
  if (!silent) emitStateChange();
  return state;
}

export function onStateChange(handler) {
  const listener = (event) => handler(event.detail?.state || state);
  window.addEventListener("neel:state-change", listener);
  return () => window.removeEventListener("neel:state-change", listener);
}

export function resetDemo({ keepSession = true } = {}) {
  state = createSeedData();
  persistState();
  ["association", "supporter"].forEach((role) => {
    safeRemove(window.sessionStorage, `${TOUR_KEY}:${role}`);
  });
  safeRemove(window.sessionStorage, FLASH_KEY);
  if (!keepSession) {
    safeRemove(window.localStorage, SESSION_KEY);
    sessionCache = null;
  }
  emitStateChange();
}

export function getSession() {
  if (sessionCache) return sessionCache;
  const raw = safeGet(window.localStorage, SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.role !== "association" && parsed?.role !== "supporter") return null;
    sessionCache = parsed;
    return sessionCache;
  } catch {
    return null;
  }
}

export function setSession(role, extra = {}) {
  if (role !== "association" && role !== "supporter") return null;
  sessionCache = { role, startedAt: nowISO(), ...extra };
  safeSet(window.localStorage, SESSION_KEY, JSON.stringify(sessionCache));
  return sessionCache;
}

export function clearSession() {
  sessionCache = null;
  safeRemove(window.localStorage, SESSION_KEY);
}

export function getRole() {
  return getSession()?.role || null;
}

export function getCurrentOrganization(currentState = state) {
  const orgId = currentState.settings?.associationOrgId || "ORG-001";
  return currentState.organizations.find((organization) => organization.id === orgId) || null;
}

export function getCurrentSupporter(currentState = state) {
  const supporterId = currentState.settings?.supporterId || "SUP-002";
  return currentState.supporters.find((supporter) => supporter.id === supporterId) || null;
}

export function getOrganization(currentState, id) {
  return currentState.organizations.find((organization) => organization.id === id) || null;
}

export function getSupporter(currentState, id) {
  return currentState.supporters.find((supporter) => supporter.id === id) || null;
}

export function pushNotification(currentState, role, notification) {
  const item = {
    id: uid("NTF"),
    role,
    title: notification.title,
    description: notification.description,
    read: false,
    link: notification.link || "",
    createdAt: notification.createdAt || nowISO(),
    demo: true
  };
  currentState.notifications.unshift(item);
  return item;
}

export function logActivity(currentState, actorRole, action, relatedEntityType, relatedEntityId) {
  const item = {
    id: uid("ACT"),
    actorRole,
    action,
    relatedEntityType,
    relatedEntityId,
    createdAt: nowISO(),
    demo: true
  };
  currentState.activities.unshift(item);
  return item;
}

export function markNotificationRead(id, { silent = false } = {}) {
  commit((currentState) => {
    const notification = currentState.notifications.find((item) => item.id === id);
    if (notification) notification.read = true;
  }, { silent });
}

export function markAllNotificationsRead(role) {
  commit((currentState) => {
    currentState.notifications
      .filter((item) => item.role === role)
      .forEach((item) => {
        item.read = true;
      });
  });
}

export function getNotifications(currentState, role) {
  return currentState.notifications
    .filter((item) => item.role === role)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getUnreadNotificationCount(currentState, role) {
  return getNotifications(currentState, role).filter((item) => !item.read).length;
}

export function isTourDismissed(role) {
  return safeGet(window.sessionStorage, `${TOUR_KEY}:${role}`) === "1";
}

export function dismissTour(role) {
  safeSet(window.sessionStorage, `${TOUR_KEY}:${role}`, "1");
}

export function isTourDismissedForSession(role) {
  return isTourDismissed(role);
}

export function resetTour(role) {
  safeRemove(window.sessionStorage, `${TOUR_KEY}:${role}`);
}

export function setFlash(message, tone = "success") {
  safeSet(window.sessionStorage, FLASH_KEY, JSON.stringify({ message, tone, createdAt: Date.now() }));
}

export function consumeFlash() {
  const raw = safeGet(window.sessionStorage, FLASH_KEY);
  if (!raw) return null;
  safeRemove(window.sessionStorage, FLASH_KEY);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.message) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resetDemoStorageOnly() {
  safeRemove(window.localStorage, STATE_KEY);
  state = createSeedData();
  persistState();
  emitStateChange();
}

export { clone };
