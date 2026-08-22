// Everything the app needs to keep working with zero connectivity lives here:
// a local mirror of the skill profile (updated immediately, client-side) and a
// queue of not-yet-synced session submissions. When the network comes back,
// api.js flushes the queue through the same /api/sync endpoint the server uses
// for every other submission, so nothing about offline use is a special case
// on the server side.
const PROFILE_KEY = "flr:skillProfile";
const QUEUE_KEY = "flr:syncQueue";
const PROGRESS_KEY = "flr:localProgress"; // session history, for the Progress screen offline

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCachedSkillProfile(emptyProfileFallback) {
  return read(PROFILE_KEY, emptyProfileFallback);
}
export function setCachedSkillProfile(profile) {
  write(PROFILE_KEY, profile);
}

export function getLocalSessions() {
  return read(PROGRESS_KEY, []);
}
export function addLocalSession(session) {
  const sessions = getLocalSessions();
  sessions.push(session);
  write(PROGRESS_KEY, sessions);
  return sessions;
}

export function getQueue() {
  return read(QUEUE_KEY, []);
}
export function enqueueSyncEvent(event) {
  const queue = getQueue();
  queue.push(event);
  write(QUEUE_KEY, queue);
  return queue;
}
export function clearQueue() {
  write(QUEUE_KEY, []);
}
export function setQueue(queue) {
  write(QUEUE_KEY, queue);
}
