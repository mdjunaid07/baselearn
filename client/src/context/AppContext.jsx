import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getLocalStudent, createLocalStudent, adoptStudent, setActiveStudent, clearLocalStudent } from "../lib/studentId.js";
import { getCachedSkillProfile, setCachedSkillProfile } from "../lib/offlineStore.js";
import { emptySkillProfile } from "../lib/adaptiveEngine.js";
import { registerStudent, fetchDashboard, trySync, onConnectivityRestored, loginStudent, loginTeacher } from "../lib/api.js";

export const DEMO_STUDENT_ID = "demo-child-0001";

const TEACHER_TOKEN_KEY = "flr:teacherToken";
const TEACHER_PROFILE_KEY = "flr:teacherProfile";

function getLocalTeacher() {
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
  const [student, setStudent] = useState(() => getLocalStudent());
  const [skillProfile, setSkillProfile] = useState(() => getCachedSkillProfile(emptySkillProfile()));
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [teacher, setTeacher] = useState(() => getLocalTeacher().teacher);
  const [teacherToken, setTeacherToken] = useState(() => getLocalTeacher().token);

  useEffect(() => {
    const handleOffline = () => setOnline(false);
    const handleOnline = () => {
      setOnline(true);
      if (student?.studentId) trySync(student.studentId);
    };
    window.addEventListener("offline", handleOffline);
    const unsubscribe = onConnectivityRestored(handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, [student?.studentId]);

  const createProfile = useCallback(({ nickname, avatarId }) => {
    const local = createLocalStudent({ nickname, avatarId });
    const fresh = emptySkillProfile();
    setStudent(local);
    setSkillProfile(fresh);
    setCachedSkillProfile(fresh);
    registerStudent(local).catch(() => {}); // best-effort; the app works fully offline regardless
    return local;
  }, []);

  /** Judges/presenters: jump straight to the pre-populated demo profile's dashboard. */
  const loadDemoProfile = useCallback(async () => {
    setActiveStudent(DEMO_STUDENT_ID);
    const demoStudentShell = { studentId: DEMO_STUDENT_ID, nickname: "Riya", avatarId: "owl" };
    setStudent(demoStudentShell);
    try {
      const dashboard = await fetchDashboard(DEMO_STUDENT_ID);
      setSkillProfile(dashboard.skillProfile);
      setCachedSkillProfile(dashboard.skillProfile);
      return { ok: true };
    } catch {
      return { ok: false, reason: "The sample profile needs an internet connection the first time it's viewed." };
    }
  }, []);

  const updateSkillProfile = useCallback((next) => {
    setSkillProfile(next);
    setCachedSkillProfile(next);
  }, []);

  const resetProfile = useCallback(() => {
    clearLocalStudent();
    setStudent(null);
    setSkillProfile(emptySkillProfile());
  }, []);

  /** Student ID + 4-digit PIN login, for a student whose credentials a teacher already
   *  set up (see StudentLogin.jsx). Distinct from createProfile, which self-serves a
   *  brand-new anonymous profile with zero server round-trip. */
  const studentLogin = useCallback(async ({ studentId, pin }) => {
    const { student: verified } = await loginStudent({ studentId, pin }); // throws on bad credentials
    const local = adoptStudent(verified);
    setStudent(local);
    try {
      const dashboard = await fetchDashboard(local.studentId);
      setSkillProfile(dashboard.skillProfile);
      setCachedSkillProfile(dashboard.skillProfile);
    } catch {
      // Offline right after login: keep whatever skill profile is already cached.
    }
    return local;
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
        skillProfile,
        online,
        createProfile,
        loadDemoProfile,
        updateSkillProfile,
        resetProfile,
        studentLogin,
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
