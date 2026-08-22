// Local cache for the student's session: a JWT issued only by a real signup or login
// API call (see server/src/services/auth.service.js), plus the profile that came back
// with it. This is a cache, not the source of truth — AppContext re-verifies the token
// against GET /api/auth/student/me on boot rather than trusting these values blindly.
const TOKEN_KEY = "flr:studentToken";
const PROFILE_KEY = "flr:studentProfile";

export function getStoredStudentSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(PROFILE_KEY);
    return token && raw ? { token, student: JSON.parse(raw) } : { token: null, student: null };
  } catch {
    return { token: null, student: null };
  }
}

export function storeStudentSession(token, student) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(student));
}

export function clearStudentSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

/** A short, typeable login code for self-serve signup — avoids visually ambiguous
 *  characters (0/O, 1/I) since a child may need to copy it down by hand. */
export function generateStudentId() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (chars, n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return pick(letters, 3) + pick(digits, 3);
}
