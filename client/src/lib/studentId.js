// The single source of identity for this device: a random UUID generated locally,
// the moment a profile is created, with zero server round-trip required. Nothing
// else (name, photo, location) is ever asked for or stored.
const ID_KEY = "flr:studentId";
const PROFILE_KEY = "flr:localProfile"; // { nickname, avatarId, createdAt }

export function getStudentId() {
  return localStorage.getItem(ID_KEY);
}

export function createLocalStudent({ nickname, avatarId }) {
  const studentId = crypto.randomUUID();
  const profile = { studentId, nickname: nickname || "Explorer", avatarId: avatarId || "fox", createdAt: new Date().toISOString() };
  localStorage.setItem(ID_KEY, studentId);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function getLocalStudent() {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setActiveStudent(studentId) {
  localStorage.setItem(ID_KEY, studentId);
}

/** Stores a profile the server already verified (PIN login) as the active local
 *  student — same storage shape as createLocalStudent, but for an existing studentId
 *  rather than a freshly generated one. */
export function adoptStudent({ studentId, nickname, avatarId, createdAt }) {
  const profile = { studentId, nickname: nickname || "Explorer", avatarId: avatarId || "fox", createdAt: createdAt || new Date().toISOString() };
  localStorage.setItem(ID_KEY, studentId);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function clearLocalStudent() {
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(PROFILE_KEY);
}
