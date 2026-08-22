import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getStoredStudentSession, storeStudentSession, clearStudentSession, generateStudentId } from "../lib/studentId.js";
import { getCachedSkillProfile, setCachedSkillProfile } from "../lib/offlineStore.js";
import { emptySkillProfile } from "../lib/adaptiveEngine.js";
import {
  fetchDashboard,
  trySync,
  onConnectivityRestored,
  loginStudent,
  registerStudentPin,
  fetchStudentMe,
  loginTeacher,
  fetchTeacherMe,
} from "../lib/api.js";

// The seeded demo student's real (if trivial) login PIN — see server/src/data/seedDemoData.js.
// "View sample dashboard" on Welcome logs in with these like any other student; it is
// not a separate code path that bypasses authentication.
export const DEMO_STUDENT_ID = "demo-child-0001";
export const DEMO_STUDENT_PIN = "0000";

const TEACHER_TOKEN_KEY = "flr:teacherToken";
const TEACHER_PROFILE_KEY = "flr:teacherProfile";

function getStoredTeacherSession() {
  try {
    const token = localStorage.getItem(TEACHER_TOKEN_KEY);
    const raw = localStorage.getItem(TEACHER_PROFILE_KEY);
    return token && raw ? { token, teacher: JSON.parse(raw) } : { token: null, teacher: null };
  } catch {
    return { token: null, teacher: null };
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Read once, synchronously, so the very first render doesn't flash "logged out."
  // Neither value is trusted as-is, though — see the boot-verification effect below.
  const [cachedStudentSession] = useState(() => getStoredStudentSession());
  const [cachedTeacherSession] = useState(() => getStoredTeacherSession());

  const [student, setStudent] = useState(null);
  const [studentToken, setStudentToken] = useState(cachedStudentSession.token);
  const [skillProfile, setSkillProfile] = useState(() => getCachedSkillProfile(emptySkillProfile()));
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [teacher, setTeacher] = useState(null);
  const [teacherToken, setTeacherToken] = useState(cachedTeacherSession.token);
  // False until boot-time verification (below) resolves. Route guards must wait for
  // this instead of treating "no student yet" as "definitely logged out," or a
  // page refresh would bounce a genuinely valid session before its token is checked.
  const [authChecked, setAuthChecked] = useState(false);

  // The one and only place a cached session is trusted: by asking the backend to
  // confirm the token is still real. A token only ever gets into localStorage right
  // after studentLogin/studentSignup/teacherLogin succeed (see below), so this check
  // is what stands between "a value sitting in localStorage" and "an authenticated
  // user" — closing the gap where a stale/forged/expired value used to be trusted
  // on faith alone.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cachedStudentSession.token) {
        try {
          const { student: verified } = await fetchStudentMe(cachedStudentSession.token);
          if (!cancelled) {
            setStudent(verified);
            storeStudentSession(cachedStudentSession.token, verified);
          }
        } catch {
          if (!cancelled) {
            clearStudentSession();
            setStudentToken(null);
          }
        }
      }
      if (cachedTeacherSession.token) {
        try {
          const { teacher: verified } = await fetchTeacherMe(cachedTeacherSession.token);
          if (!cancelled) setTeacher(verified);
        } catch {
          if (!cancelled) {
            localStorage.removeItem(TEACHER_TOKEN_KEY);
            localStorage.removeItem(TEACHER_PROFILE_KEY);
            setTeacherToken(null);
          }
        }
      }
      if (!cancelled) setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [cachedStudentSession.token, cachedTeacherSession.token]);

  useEffect(() => {
    const handleOffline = () => setOnline(false);
    const handleOnline = () => {
      setOnline(true);
      if (student?.studentId && studentToken) trySync(student.studentId, studentToken);
    };
    window.addEventListener("offline", handleOffline);
    const unsubscribe = onConnectivityRestored(handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, [student?.studentId, studentToken]);

  /** Self-serve signup: picks a login ID, requires a real 4-digit PIN, and only
   *  considers the student logged in once the backend confirms the account was
   *  created — replaces the old client-only "New Profile" flow. */
  const studentSignup = useCallback(async ({ pin, nickname, avatarId }) => {
    const studentId = generateStudentId();
    const { student: verified, token } = await registerStudentPin({ studentId, pin, nickname, avatarId }); // throws on failure
    storeStudentSession(token, verified);
    setStudentToken(token);
    setStudent(verified);
    const fresh = emptySkillProfile();
    setSkillProfile(fresh);
    setCachedSkillProfile(fresh);
    return verified;
  }, []);

  /** Student ID + 4-digit PIN login, for a student who already has credentials
   *  (self-registered earlier, or provisioned by a teacher). */
  const studentLogin = useCallback(async ({ studentId, pin }) => {
    const { student: verified, token } = await loginStudent({ studentId, pin }); // throws on bad credentials
    storeStudentSession(token, verified);
    setStudentToken(token);
    setStudent(verified);
    try {
      const dashboard = await fetchDashboard(verified.studentId, token);
      setSkillProfile(dashboard.skillProfile);
      setCachedSkillProfile(dashboard.skillProfile);
    } catch {
      // Offline right after login: keep whatever skill profile is already cached.
    }
    return verified;
  }, []);

  const studentLogout = useCallback(() => {
    clearStudentSession();
    setStudentToken(null);
    setStudent(null);
    setSkillProfile(emptySkillProfile());
  }, []);

  const updateSkillProfile = useCallback((next) => {
    setSkillProfile(next);
    setCachedSkillProfile(next);
  }, []);

  const teacherLogin = useCallback(async ({ email, password }) => {
    const { token, teacher: profile } = await loginTeacher({ email, password }); // throws on bad credentials
    localStorage.setItem(TEACHER_TOKEN_KEY, token);
    localStorage.setItem(TEACHER_PROFILE_KEY, JSON.stringify(profile));
    setTeacherToken(token);
    setTeacher(profile);
    return profile;
  }, []);

  const teacherLogout = useCallback(() => {
    localStorage.removeItem(TEACHER_TOKEN_KEY);
    localStorage.removeItem(TEACHER_PROFILE_KEY);
    setTeacherToken(null);
    setTeacher(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        student,
        studentToken,
        skillProfile,
        online,
        authChecked,
        studentSignup,
        studentLogin,
        studentLogout,
        updateSkillProfile,
        teacher,
        teacherToken,
        teacherLogin,
        teacherLogout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
