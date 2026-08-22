// Verifies student PIN logins and teacher email/password logins, and issues/validates
// the JWTs that protect teacher-only routes. Student logins stay tokenless, matching
// the rest of the app's local-first, per-device session model (see AppContext.jsx).
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { isMongoConnected } from "../config/db.js";
import * as repo from "./repository.js";
import TeacherModel from "../models/Teacher.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";
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
  return jwt.sign({ teacherId: teacher.teacherId, email: teacher.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyTeacherToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws on invalid/expired tokens
}

/** Express middleware: requires a valid "Authorization: Bearer <token>" header. */
export function requireTeacherAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    req.teacher = verifyTeacherToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ---- Student: Student ID + 4-digit PIN ----

/** Sets up (or replaces) login credentials for a student, creating the profile
 *  if it doesn't exist yet. Typically called by a teacher provisioning a class. */
export async function registerStudentPin({ studentId, pin, nickname, avatarId }) {
  if (!studentId || !PIN_PATTERN.test(pin || "")) throw httpError(400, "studentId and a 4-digit pin are required");

  const existing = await repo.getStudent(studentId);
  const pinHash = await bcrypt.hash(pin, 10);
  const student = {
    studentId,
    nickname: existing?.nickname || nickname || "Explorer",
    avatarId: existing?.avatarId || avatarId || "fox",
    createdAt: existing?.createdAt || new Date().toISOString(),
    pinHash,
  };
  await repo.upsertStudentRecord(student);
  return { studentId: student.studentId, nickname: student.nickname, avatarId: student.avatarId };
}

export async function loginStudent({ studentId, pin }) {
  if (!studentId || !PIN_PATTERN.test(pin || "")) throw httpError(400, "studentId and a 4-digit pin are required");

  const student = await repo.getStudentAuth(studentId);
  const match = student?.pinHash ? await bcrypt.compare(pin, student.pinHash) : false;
  if (!match) throw httpError(401, "Invalid student ID or PIN");

  return { studentId: student.studentId, nickname: student.nickname, avatarId: student.avatarId };
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
