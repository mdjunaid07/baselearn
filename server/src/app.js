import express from "express";
import cors from "cors";
import { isMongoConnected } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import authRouter from "./routes/auth.routes.js";
import teacherRouter from "./routes/teacher.js";
import studentsRouter from "./routes/students.js";
import questionsRouter from "./routes/questions.js";
import diagnosticRouter from "./routes/diagnostic.js";
import practiceRouter from "./routes/practice.js";
import progressRouter from "./routes/progress.js";
import dashboardRouter from "./routes/dashboard.js";
import syncRouter from "./routes/sync.js";
import roadmapRouter from "./routes/roadmap.js";

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim());
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, storage: isMongoConnected() ? "mongodb" : "in-memory" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/teacher", teacherRouter);
  app.use("/api/students", studentsRouter);
  app.use("/api/questions", questionsRouter);
  app.use("/api/diagnostic", diagnosticRouter);
  app.use("/api/practice", practiceRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/sync", syncRouter);
  app.use("/api/roadmap", roadmapRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
