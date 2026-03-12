import useAuthStore from '../auth/authStore';
import DoctorDashboard from './DoctorDashboardNew';
import PatientDashboard from './PatientDashboard';

export default function QueuePage() {
    const { user } = useAuthStore();
    const isDoctor = user?.role === 'doctor';

    if (isDoctor) {
        return <DoctorDashboard />;
    }

    return <PatientDashboard />;
}
