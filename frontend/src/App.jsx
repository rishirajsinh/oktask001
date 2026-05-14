import { Routes, Route, Navigate } from 'react-router-dom';
import TestPage from './components/TestPage';
import AccessDenied from './components/AccessDenied';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <div className="app-wrapper">
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/test/:token" element={<TestPage />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="*" element={<Navigate to="/access-denied" />} />
      </Routes>
    </div>
  );
}

export default App;
