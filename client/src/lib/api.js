import { enqueueSyncEvent, getQueue, clearQueue } from "./offlineStore.js";

const BASE = import.meta.env.VITE_API_BASE_URL || "";

async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...headers },
    ...rest,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `Request failed: ${res.status}`), { status: res.status });
  }
  return res.json();
}

export async function registerStudent({ studentId, nickname, avatarId }) {
  return apiFetch("/api/students", { method: "POST", body: JSON.stringify({ studentId, nickname, avatarId }) });
}

export async function loginStudent({ studentId, pin }) {
  return apiFetch("/api/auth/student/login", { method: "POST", body: JSON.stringify({ studentId, pin }) });
}

export async function registerStudentPin({ studentId, pin, nickname, avatarId }) {
  return apiFetch("/api/auth/student/register", { method: "POST", body: JSON.stringify({ studentId, pin, nickname, avatarId }) });
}

export async function loginTeacher({ email, password }) {
  return apiFetch("/api/auth/teacher/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function registerTeacher({ name, email, password }) {
  return apiFetch("/api/auth/teacher/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
}

export async function fetchTeacherStudents(token) {
  return apiFetch("/api/teacher/students", { headers: { Authorization: `Bearer ${token}` } });
}

export async function fetchDashboard(studentId) {
  return apiFetch(`/api/dashboard/${studentId}`);
}

export async function fetchProgress(studentId) {
  return apiFetch(`/api/progress/${studentId}`);
}

/**
 * Diagnostic and Daily Rescue results are never blocked on the network: the child's
 * device already graded everything locally (see adaptiveEngine.js), so this just
 * queues the raw attempts for the server and opportunistically tries to flush right
 * away. If that fails or there's no connection, the event stays queued and is retried
 * next time trySync runs (on an 'online' event or the next app open).
 */
export async function recordDiagnostic(studentId, payload) {
  enqueueSyncEvent({ type: "diagnostic", payload });
  return trySync(studentId);
}

export async function recordRescue(studentId, payload) {
  enqueueSyncEvent({ type: "rescue", payload });
  return trySync(studentId);
}

export async function trySync(studentId) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: false, reason: "offline" };
  const queue = getQueue();
  if (queue.length === 0) return { synced: false, reason: "empty" };
  try {
    const result = await apiFetch(`/api/sync/${studentId}`, { method: "POST", body: JSON.stringify({ events: queue }) });
    clearQueue();
    return { synced: true, result };
  } catch {
    return { synced: false, reason: "network-error" }; // stays queued, tried again later
  }
}

export function onConnectivityRestored(callback) {
  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}
