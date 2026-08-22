// Single import for every route. Each function checks the DB connection state and
// delegates to either the in-memory store or the Mongoose models — always returning
// plain objects in the same shape either way, so nothing above this layer needs to
// know or care which backend is active.
import { randomUUID } from "node:crypto";
import { isMongoConnected } from "../config/db.js";
import { emptySkillProfile } from "./adaptiveEngine.js";
import * as mem from "./inMemoryStore.js";
import StudentModel from "../models/Student.js";
import SkillProfileModel from "../models/SkillProfile.js";
import AttemptModel from "../models/Attempt.js";
import SessionModel from "../models/Session.js";
import StudentRoadmapModel from "../models/StudentRoadmap.js";

export async function createStudent({ nickname, avatarId }) {
  if (!isMongoConnected()) return mem.createStudent({ nickname, avatarId });
  const studentId = randomUUID();
  const doc = await StudentModel.create({ studentId, nickname, avatarId });
  await SkillProfileModel.create({ studentId, ...emptySkillProfile() });
  return doc.toObject();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive exact match — a Student ID is a typed-by-hand login credential
 *  (unlike the PIN, it isn't secret), and generateStudentId() on the client produces
 *  uppercase IDs that a phone keyboard will happily retype in lowercase. Treating
 *  "ABC123" and "abc123" as the same student avoids a login failure that looks like a
 *  bug. Legacy IDs (e.g. the demo student's "demo-child-0001") are unaffected since
 *  this only changes how lookups match, not how IDs are stored. */
function studentIdQuery(studentId) {
  return { studentId: new RegExp(`^${escapeRegExp(studentId)}$`, "i") };
}

export async function getStudent(studentId) {
  if (!isMongoConnected()) return mem.getStudent(studentId);
  const doc = await StudentModel.findOne(studentIdQuery(studentId)).lean();
  return doc ?? null;
}

/** Auth-only lookup: the one place pinHash (select:false in the schema) is read back. */
export async function getStudentAuth(studentId) {
  if (!isMongoConnected()) return mem.getStudent(studentId);
  const doc = await StudentModel.findOne(studentIdQuery(studentId)).select("+pinHash").lean();
  return doc ?? null;
}

/** For the teacher dashboard's class roster — pinHash is excluded automatically by
 *  the schema's select:false, same as getStudent. */
export async function getAllStudents() {
  if (!isMongoConnected()) return mem.getAllStudents();
  return StudentModel.find().lean();
}

/** Seed-only helper: writes a student record with a caller-supplied fixed id. */
export async function upsertStudentRecord(student) {
  if (!isMongoConnected()) return mem.upsertStudentRecord(student);
  await StudentModel.findOneAndUpdate({ studentId: student.studentId }, student, { upsert: true });
  const existingProfile = await SkillProfileModel.findOne({ studentId: student.studentId });
  if (!existingProfile) await SkillProfileModel.create({ studentId: student.studentId, ...emptySkillProfile() });
  return student;
}

export async function getSkillProfile(studentId) {
  if (!isMongoConnected()) return mem.getSkillProfile(studentId);
  const doc = await SkillProfileModel.findOne({ studentId }).lean();
  return doc ?? null;
}

export async function saveSkillProfile(studentId, profile) {
  if (!isMongoConnected()) return mem.saveSkillProfile(studentId, profile);
  const doc = await SkillProfileModel.findOneAndUpdate(
    { studentId },
    { literacy: profile.literacy, numeracy: profile.numeracy, updatedAt: new Date() },
    { upsert: true, new: true }
  ).lean();
  return doc;
}

export async function logAttempts(attemptDocs) {
  if (!isMongoConnected()) return mem.logAttempts(attemptDocs);
  return AttemptModel.insertMany(attemptDocs);
}

export async function getAttempts(studentId, filter = {}) {
  if (!isMongoConnected()) return mem.getAttempts(studentId, filter);
  const query = { studentId, ...(filter.subject && { subject: filter.subject }), ...(filter.skill && { skill: filter.skill }) };
  return AttemptModel.find(query).sort({ createdAt: 1 }).lean();
}

export async function createSession(session) {
  if (!isMongoConnected()) return mem.createSession(session);
  const doc = await SessionModel.create(session);
  return doc.toObject();
}

export async function getSessions(studentId, filter = {}) {
  if (!isMongoConnected()) return mem.getSessions(studentId, filter);
  const query = { studentId, ...(filter.subject && { subject: filter.subject }) };
  return SessionModel.find(query).sort({ completedAt: 1 }).lean();
}

export function newSessionId() {
  return randomUUID();
}

export async function getStudentRoadmap(studentId, subject, skill) {
  if (!isMongoConnected()) return mem.getStudentRoadmap(studentId, subject, skill);
  return StudentRoadmapModel.findOne({ studentId, subject, skill }).lean();
}

export async function getStudentRoadmapsForStudent(studentId) {
  if (!isMongoConnected()) return mem.getStudentRoadmapsForStudent(studentId);
  return StudentRoadmapModel.find({ studentId }).lean();
}

export async function saveStudentRoadmap(studentId, subject, skill, data) {
  if (!isMongoConnected()) return mem.saveStudentRoadmap(studentId, subject, skill, data);
  return StudentRoadmapModel.findOneAndUpdate(
    { studentId, subject, skill },
    { studentId, subject, skill, ...data, updatedAt: new Date() },
    { upsert: true, new: true }
  ).lean();
}
