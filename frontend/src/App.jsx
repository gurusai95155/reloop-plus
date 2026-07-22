import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import WorkerDashboard from './pages/WorkerDashboard';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('reloop_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ProtectedUser({ children }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'USER') return <Navigate to="/worker" replace />;
  return children;
}

function ProtectedWorker({ children }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'WORKER') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedUser>
            <UserDashboard />
          </ProtectedUser>
        }
      />
      <Route
        path="/worker"
        element={
          <ProtectedWorker>
            <WorkerDashboard />
          </ProtectedWorker>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
