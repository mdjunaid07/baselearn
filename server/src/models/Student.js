import mongoose from "mongoose";

// Deliberately minimal: no name, no photo, no location, no contact info.
// studentId is the only identifier used anywhere, and doubles as the login ID for
// students who have set up a PIN (see auth.service.js) — it doesn't have to be a
// UUID, just unique, so it stays typeable on a child-facing login screen.
const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true },
  nickname: { type: String, default: "Explorer", maxlength: 24 },
  avatarId: { type: String, default: "fox" },
  // bcrypt hash of a 4-digit login PIN; null until a login is set up for this student.
  // Never select this by default so a plain find/lean() can't accidentally leak it.
  pinHash: { type: String, default: null, select: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Student", studentSchema);
