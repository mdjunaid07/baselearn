// Zero-setup default backend. Plain JS collections in process memory — resets on
// restart, which is fine for a demo and explicitly documented in the README.
// Every function here has a same-named, same-shaped counterpart in repository.js's
// Mongo branch, so routes never need to know which one is active.
import { randomUUID } from "node:crypto";
import { emptySkillProfile } from "./adaptiveEngine.js";

const students = new Map(); // studentId -> student
const skillProfiles = new Map(); // studentId -> { studentId, literacy, numeracy, updatedAt }
const attempts = []; // flat log, filtered per-query
const sessions = new Map(); // sessionId -> session

export function reset() {
  students.clear();
  skillProfiles.clear();
  attempts.length = 0;
  sessions.clear();
}

export async function createStudent({ nickname, avatarId }) {
  const studentId = randomUUID();
  const student = { studentId, nickname: nickname || "Explorer", avatarId: avatarId || "fox", createdAt: new Date().toISOString() };
  students.set(studentId, student);
  skillProfiles.set(studentId, { studentId, ...emptySkillProfile(), updatedAt: new Date().toISOString() });
  return student;
}

export async function getStudent(studentId) {
  return students.get(studentId) ?? null;
}

export async function getAllStudents() {
  return Array.from(students.values());
}

export async function upsertStudentRecord(student) {
  // Used only by seed data, which supplies a fixed studentId rather than generating one.
  students.set(student.studentId, student);
  if (!skillProfiles.has(student.studentId)) {
    skillProfiles.set(student.studentId, { studentId: student.studentId, ...emptySkillProfile(), updatedAt: new Date().toISOString() });
  }
  return student;
}

export async function getSkillProfile(studentId) {
  return skillProfiles.get(studentId) ?? null;
}

export async function saveSkillProfile(studentId, profile) {
  const record = { studentId, literacy: profile.literacy, numeracy: profile.numeracy, updatedAt: new Date().toISOString() };
  skillProfiles.set(studentId, record);
  return record;
}

export async function logAttempts(attemptDocs) {
  for (const a of attemptDocs) attempts.push({ ...a, createdAt: a.createdAt || new Date().toISOString() });
  return attemptDocs;
}

export async function getAttempts(studentId, { subject, skill } = {}) {
  return attempts
    .filter((a) => a.studentId === studentId)
    .filter((a) => !subject || a.subject === subject)
    .filter((a) => !skill || a.skill === skill)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function createSession(session) {
  sessions.set(session.sessionId, session);
  return session;
}

export async function getSessions(studentId, { subject } = {}) {
  return Array.from(sessions.values())
    .filter((s) => s.studentId === studentId)
    .filter((s) => !subject || s.subject === subject)
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
}
