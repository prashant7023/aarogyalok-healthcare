import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './shared/components/AppLayout';
import Dashboard from './features/dashboard/DashboardPage';
import SymptomPage from './features/symptom/SymptomPage';
import MedicationPage from './features/medication/MedicationPage';
import QueuePage from './features/queue/QueuePage';
import AppointmentDetails from './features/queue/AppointmentDetails';
import MyAppointments from './features/queue/MyAppointments';
import BookAppointment from './features/queue/BookAppointment';
import CreateAppointment from './features/queue/CreateAppointment';
import QueueMapSearch from './features/queue/QueueMapSearch';
import DoctorCrmPage from './features/queue/DoctorCrmPage';
import DoctorPatientProfilePage from './features/queue/DoctorPatientProfilePage';
import RecordsPage from './features/records/RecordsPage';
import SettingsPage from './features/settings/SettingsPage';
import SubscriptionPage from './features/subscription/SubscriptionPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import useAuthStore from './features/auth/authStore';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

function SymptomRoute() {
  const role = String(useAuthStore((s) => s.user?.role || 'patient')).toLowerCase();
  if (role === 'doctor') {
    return <Navigate to="/queue" replace />;
  }
  return <SymptomPage />;
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
          <Route path="symptom" element={<SymptomRoute />} />
          <Route path="medication" element={<MedicationPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="queue/appointments/:appointmentId" element={<AppointmentDetails />} />
          <Route path="queue/my-appointments" element={<MyAppointments />} />
          <Route path="queue/map-search" element={<QueueMapSearch />} />
          <Route path="queue/patient-crm" element={<DoctorCrmPage />} />
          <Route path="queue/patient-crm/:patientId" element={<DoctorPatientProfilePage />} />
          <Route path="queue/book" element={<BookAppointment />} />
          <Route path="queue/create-appointment" element={<CreateAppointment />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
