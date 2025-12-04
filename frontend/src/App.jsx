import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Teacher from "./Teacher";
import Student from "./Student";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 20 }}>
        <h2>Realtime Polling System</h2>

        <nav style={{ marginBottom: 20 }}>
          <Link to="/teacher" style={{ marginRight: 20 }}>Teacher</Link>
          <Link to="/student">Student</Link>
        </nav>

        <Routes>
          <Route path="/teacher" element={<Teacher />} />
          <Route path="/student" element={<Student />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
