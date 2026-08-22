// Verifies student PIN logins and teacher email/password logins, and issues/validates
// the JWTs that gate every protected route on both sides. Every JWT here is minted in
// exactly one place — right after a credential check succeeds — so a token's mere
// existence already proves a real login happened; nothing else in the app is allowed
// to fabricate one. The client re-verifies its cached token against /me on boot rather
// than trusting local storage, so a revoked or expired session can't silently persist.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { isMongoConnected } from "../config/db.js";
import * as repo from "./repository.js";
import TeacherModel from "../models/Teacher.js";

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set — using an insecure default. Set JWT_SECRET in server/.env before deploying.");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";
const PIN_PATTERN = /^\d{4}$/;

// Teacher storage has no in-memory counterpart elsewhere in the app (unlike Student,
// which already has inMemoryStore.js), so this module owns its own fallback map —
// same isMongoConnected() branch-per-function pattern repository.js uses everywhere.
const memTeachersByEmail = new Map(); // email -> { teacherId, name, email, passwordHash, createdAt }

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function safeTeacher(teacher) {
  if (!teacher) return null;
  const { passwordHash, ...safe } = teacher;
  return safe;
}

export function signTeacherToken(teacher) {
  return jwt.sign({ teacherId: teacher.teacherId, email: teacher.email, role: "teacher" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyTeacherToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws on invalid/expired tokens
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/** Express middleware: requires a valid, non-expired token whose role claim is
 *  specifically "teacher" — a validly-signed student token must NOT pass this, even
 *  though both are signed with the same secret. */
export function requireTeacherAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = verifyTeacherToken(token);
    if (payload.role !== "teacher") return res.status(403).json({ error: "A teacher account is required for this action" });
    req.teacher = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ---- Student: Student ID + 4-digit PIN ----

export function signStudentToken(student) {
  return jwt.sign({ studentId: student.studentId, role: "student" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyStudentToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws on invalid/expired tokens
}

/** Express middleware: requires a valid, non-expired token whose role claim is
 *  specifically "student" — mirrors requireTeacherAuth's role check. */
export function requireStudentAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = verifyStudentToken(token);
    if (payload.role !== "student") return res.status(403).json({ error: "A student account is required for this action" });
    req.studentAuth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Express middleware for routes that return or modify ONE student's data
 *  (dashboard, progress, sync, diagnostic/practice submissions): the caller must be
 *  either that exact student, or any teacher (there's no per-teacher class roster
 *  yet — every teacher can see every student, matching /api/teacher/students).
 *  The student ID in the URL is never trusted on its own — it's checked against the
 *  studentId claim inside the verified token. */
export function requireStudentOrTeacher(req, res, next) {
  const targetStudentId = req.params.studentId ?? req.params.id;
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (payload.role === "teacher") {
    req.auth = payload;
    return next();
  }
  if (payload.role === "student" && payload.studentId === targetStudentId) {
    req.auth = payload;
    return next();
  }
  return res.status(403).json({ error: "Not authorized for this student" });
}

/** Sets up login credentials for a brand-new student (self-serve signup) or a student
 *  a teacher is provisioning ahead of time. Returns a token immediately — creating the
 *  credentials via this real, hashed-PIN endpoint IS the login, same as loginStudent. */
export async function registerStudentPin({ studentId, pin, nickname, avatarId }) {
  const trimmedId = (studentId || "").trim();
  if (!trimmedId || !PIN_PATTERN.test(pin || "")) throw httpError(400, "studentId and a 4-digit pin are required");

  // getStudentAuth (not getStudent) so this sees pinHash regardless of Mongo vs.
  // in-memory mode — without this check, re-registering an ID that already has a PIN
  // would silently overwrite it, letting anyone "take over" another student's account
  // just by knowing (or guessing) their Student ID.
  const existing = await repo.getStudentAuth(trimmedId);
  if (existing?.pinHash) throw httpError(409, "That Student ID is already taken");

  const pinHash = await bcrypt.hash(pin, 10);
  const student = {
    studentId: existing?.studentId || trimmedId,
    nickname: existing?.nickname || nickname || "Explorer",
    avatarId: existing?.avatarId || avatarId || "fox",
    createdAt: existing?.createdAt || new Date().toISOString(),
    pinHash,
  };
  await repo.upsertStudentRecord(student);
  const safe = { studentId: student.studentId, nickname: student.nickname, avatarId: student.avatarId };
  return { student: safe, token: signStudentToken(safe) };
}

export async function loginStudent({ studentId, pin }) {
  const trimmedId = (studentId || "").trim();
  if (!trimmedId || !PIN_PATTERN.test(pin || "")) throw httpError(400, "studentId and a 4-digit pin are required");

  const student = await repo.getStudentAuth(trimmedId);
  const match = student?.pinHash ? await bcrypt.compare(pin, student.pinHash) : false;
  if (!match) throw httpError(401, "Invalid student ID or PIN");

  const safe = { studentId: student.studentId, nickname: student.nickname, avatarId: student.avatarId };
  return { student: safe, token: signStudentToken(safe) };
}

export async function getStudentById(studentId) {
  const student = await repo.getStudent(studentId);
  return student ? { studentId: student.studentId, nickname: student.nickname, avatarId: student.avatarId } : null;
}

// ---- Teacher: email + password, JWT ----

export async function registerTeacher({ name, email, password }) {
  if (!name || !email || !password || password.length < 6) {
    throw httpError(400, "name, email and a password of 6+ characters are required");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  let teacher;
  if (isMongoConnected()) {
    const existing = await TeacherModel.findOne({ email: normalizedEmail });
    if (existing) throw httpError(409, "An account with that email already exists");
    const doc = await TeacherModel.create({ name, email: normalizedEmail, passwordHash });
    teacher = { teacherId: doc._id.toString(), name: doc.name, email: doc.email, createdAt: doc.createdAt };
  } else {
    if (memTeachersByEmail.has(normalizedEmail)) throw httpError(409, "An account with that email already exists");
    teacher = { teacherId: randomUUID(), name, email: normalizedEmail, passwordHash, createdAt: new Date().toISOString() };
    memTeachersByEmail.set(normalizedEmail, teacher);
  }

  return { token: signTeacherToken(teacher), teacher: safeTeacher(teacher) };
}

export async function loginTeacher({ email, password }) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) throw httpError(401, "Invalid email or password");

  let teacher;
  if (isMongoConnected()) {
    const doc = await TeacherModel.findOne({ email: normalizedEmail }).select("+passwordHash").lean();
    teacher = doc ? { teacherId: doc._id.toString(), name: doc.name, email: doc.email, passwordHash: doc.passwordHash, createdAt: doc.createdAt } : null;
  } else {
    teacher = memTeachersByEmail.get(normalizedEmail) ?? null;
  }

  const match = teacher ? await bcrypt.compare(password, teacher.passwordHash) : false;
  if (!match) throw httpError(401, "Invalid email or password");

  return { token: signTeacherToken(teacher), teacher: safeTeacher(teacher) };
}

export async function getTeacherById(teacherId) {
  if (isMongoConnected()) {
    const doc = await TeacherModel.findById(teacherId).lean().catch(() => null);
    return doc ? { teacherId: doc._id.toString(), name: doc.name, email: doc.email, createdAt: doc.createdAt } : null;
  }
  for (const teacher of memTeachersByEmail.values()) {
    if (teacher.teacherId === teacherId) return safeTeacher(teacher);
  }
  return null;
}
