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

export async function loginStudent({ studentId, pin }) {
  return apiFetch("/api/auth/student/login", { method: "POST", body: JSON.stringify({ studentId, pin }) });
}

export async function registerStudentPin({ studentId, pin, nickname, avatarId }) {
  return apiFetch("/api/auth/student/register", { method: "POST", body: JSON.stringify({ studentId, pin, nickname, avatarId }) });
}

/** Re-verifies a cached student token against the backend — the only thing that lets
 *  AppContext trust a session restored from localStorage on app boot. */
export async function fetchStudentMe(token) {
  return apiFetch("/api/auth/student/me", { headers: { Authorization: `Bearer ${token}` } });
}

export async function loginTeacher({ email, password }) {
  return apiFetch("/api/auth/teacher/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function registerTeacher({ name, email, password }) {
  return apiFetch("/api/auth/teacher/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
}

/** Re-verifies a cached teacher token against the backend — same reasoning as
 *  fetchStudentMe above. */
export async function fetchTeacherMe(token) {
  return apiFetch("/api/auth/teacher/me", { headers: { Authorization: `Bearer ${token}` } });
}

export async function fetchTeacherStudents(token) {
  return apiFetch("/api/teacher/students", { headers: { Authorization: `Bearer ${token}` } });
}

// Every route below requires proof the caller is either this exact student or a
// teacher (see requireStudentOrTeacher in server/src/services/auth.service.js) — the
// backend never trusts the studentId in the URL on its own, so all of these now take
// a token.
export async function fetchDashboard(studentId, token) {
  return apiFetch(`/api/dashboard/${studentId}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function fetchProgress(studentId, token) {
  return apiFetch(`/api/progress/${studentId}`, { headers: { Authorization: `Bearer ${token}` } });
}

/**
 * Diagnostic and Daily Rescue results are never blocked on the network: the child's
 * device already graded everything locally (see adaptiveEngine.js), so this just
 * queues the raw attempts for the server and opportunistically tries to flush right
 * away. If that fails or there's no connection, the event stays queued and is retried
 * next time trySync runs (on an 'online' event or the next app open).
 */
export async function recordDiagnostic(studentId, token, payload) {
  enqueueSyncEvent({ type: "diagnostic", payload });
  return trySync(studentId, token);
}

export async function recordRescue(studentId, token, payload) {
  enqueueSyncEvent({ type: "rescue", payload });
  return trySync(studentId, token);
}

/** Lockdown termination (fullscreen exit / 20s question timeout) — answers were
 *  already discarded client-side; this just leaves a minimal 0-question Session
 *  record so the attempt is visible next to normal completions. */
export async function recordTermination(studentId, token, payload) {
  enqueueSyncEvent({ type: "termination", payload });
  return trySync(studentId, token);
}

export async function trySync(studentId, token) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: false, reason: "offline" };
  const queue = getQueue();
  if (queue.length === 0) return { synced: false, reason: "empty" };
  if (!token) return { synced: false, reason: "no-token" }; // e.g. session expired since the queue was filled
  try {
    const result = await apiFetch(`/api/sync/${studentId}`, {
      method: "POST",
      body: JSON.stringify({ events: queue }),
      headers: { Authorization: `Bearer ${token}` },
    });
    clearQueue();
    return { synced: true, result };
  } catch {
    return { synced: false, reason: "network-error" }; // stays queued, tried again later
  }
}

// Study Roadmap — online-only for now (no offline queue/sync integration, unlike
// diagnostic/rescue above): a deliberate, smaller scope for this first version.
export async function fetchAllRoadmaps(studentId, token) {
  return apiFetch(`/api/roadmap/${studentId}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function fetchRoadmap(studentId, token, subject, skill) {
  return apiFetch(`/api/roadmap/${studentId}/${subject}/${skill}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function setTopicComplete(studentId, token, subject, skill, topicId, complete) {
  return apiFetch(`/api/roadmap/${studentId}/${subject}/${skill}/topics/${topicId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ complete }),
  });
}

export async function submitLevel2Test(studentId, token, subject, skill, { sessionId, attempts }) {
  return apiFetch(`/api/roadmap/${studentId}/${subject}/${skill}/level2-submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId, attempts }),
  });
}

export function onConnectivityRestored(callback) {
  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}

/**
 * Turns a login/signup failure into a message worth showing a user. apiFetch sets
 * `.status` on every HTTP-level error (its message is already the server's own,
 * specific text — e.g. "Too many login attempts..." for a 429) — only a real network
 * failure (server unreachable, DNS, offline) has no `.status` at all. Collapsing both
 * into one generic "check your connection" string was the actual bug behind a rate
 * limit or a 500 being misread as a connectivity problem.
 */
export function describeAuthError(err, wrongCredentialsMessage) {
  if (err.status === 401) return wrongCredentialsMessage;
  if (err.status) return err.message;
  return "Couldn't reach the server — check your connection and try again.";
}
