import { Router } from "express";
import * as authService from "../services/auth.service.js";

const router = Router();

// ---- Student: Student ID + 4-digit PIN ----

router.post("/student/register", async (req, res, next) => {
  try {
    const { studentId, pin, nickname, avatarId } = req.body ?? {};
    const student = await authService.registerStudentPin({ studentId, pin, nickname, avatarId });
    res.status(201).json({ student });
  } catch (err) {
    next(err);
  }
});

router.post("/student/login", async (req, res, next) => {
  try {
    const { studentId, pin } = req.body ?? {};
    const student = await authService.loginStudent({ studentId, pin });
    res.json({ student });
  } catch (err) {
    next(err);
  }
});

// ---- Teacher: email + password, JWT ----

router.post("/teacher/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    const result = await authService.registerTeacher({ name, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/teacher/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const result = await authService.loginTeacher({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/teacher/me", authService.requireTeacherAuth, async (req, res, next) => {
  try {
    const teacher = await authService.getTeacherById(req.teacher.teacherId);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json({ teacher });
  } catch (err) {
    next(err);
  }
});

export default router;
