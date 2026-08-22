import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";

import Welcome from "./screens/Welcome.jsx";
import ProfileSetup from "./screens/ProfileSetup.jsx";
import StudentLogin from "./screens/StudentLogin.jsx";
import TeacherLogin from "./screens/TeacherLogin.jsx";
import TeacherDashboard from "./screens/TeacherDashboard.jsx";
import SubjectSelect from "./screens/SubjectSelect.jsx";
import Diagnostic from "./screens/Diagnostic.jsx";
import DiagnosticResult from "./screens/DiagnosticResult.jsx";
import SkillMap from "./screens/SkillMap.jsx";
import DailyRescue from "./screens/DailyRescue.jsx";
import SessionComplete from "./screens/SessionComplete.jsx";
import ProgressScreen from "./screens/Progress.jsx";
import ParentDashboard from "./screens/ParentDashboard.jsx";

function RequireStudent({ children }) {
  const { student } = useApp();
  if (!student) return <Navigate to="/" replace />;
  return children;
}

function RequireTeacher({ children }) {
  const { teacherToken } = useApp();
  if (!teacherToken) return <Navigate to="/teacher-login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/profile" element={<ProfileSetup />} />
      <Route path="/student-login" element={<StudentLogin />} />
      <Route path="/teacher-login" element={<TeacherLogin />} />
      <Route path="/teacher-dashboard" element={<RequireTeacher><TeacherDashboard /></RequireTeacher>} />
      <Route path="/subject" element={<RequireStudent><SubjectSelect /></RequireStudent>} />
      <Route path="/diagnostic/:subject" element={<RequireStudent><Diagnostic /></RequireStudent>} />
      <Route path="/diagnostic-result" element={<RequireStudent><DiagnosticResult /></RequireStudent>} />
      <Route path="/skill-map" element={<RequireStudent><SkillMap /></RequireStudent>} />
      <Route path="/rescue/:subject" element={<RequireStudent><DailyRescue /></RequireStudent>} />
      <Route path="/session-complete" element={<RequireStudent><SessionComplete /></RequireStudent>} />
      <Route path="/progress" element={<RequireStudent><ProgressScreen /></RequireStudent>} />
      <Route path="/dashboard" element={<RequireStudent><ParentDashboard /></RequireStudent>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
