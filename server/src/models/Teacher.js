import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  // bcrypt hash — never the plaintext password.
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Teacher", teacherSchema);
