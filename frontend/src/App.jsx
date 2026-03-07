import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './shared/components/AppLayout';
import Dashboard from './features/dashboard/DashboardPage';
import SymptomPage from './features/symptom/SymptomPage';
import MedicationPage from './features/medication/MedicationPage';
import QueuePage from './features/queue/QueuePage';
import RecordsPage from './features/records/RecordsPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import useAuthStore from './features/auth/authStore';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="symptom" element={<SymptomPage />} />
          <Route path="medication" element={<MedicationPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="records" element={<RecordsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
