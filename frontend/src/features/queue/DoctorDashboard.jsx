import { useState, useEffect } from 'react';
import { Calendar, Plus, Users, Clock, DollarSign, MapPin, Eye } from 'lucide-react';
import api from '../../shared/utils/api';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../auth/authStore';
import './queue.css';

export default function DoctorDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAppointments();
    }, [selectedDate]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const url = selectedDate
                ? `/queue/doctor/appointments?date=${selectedDate}`
                : '/queue/doctor/appointments';
            const res = await api.get(url);
            setAppointments(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch appointments:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in queue-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>Doctor Dashboard</h1>
                    <p>Welcome back, Dr. {user?.name}</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/queue/create-appointment')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={20} />
                    Create Appointment
                </button>
            </div>

            <div className="card queue-filter-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Calendar size={20} color="var(--primary)" />
                        <label style={{ fontWeight: 600, marginRight: '0.5rem' }}>Filter by Date:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="input"
                            style={{ maxWidth: '200px' }}
                        />
                    </div>
                    {selectedDate && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setSelectedDate('')}
                            style={{ fontSize: '0.9rem', padding: '0.6rem 1rem' }}
                        >
                            Show All
                        </button>
                    )}
                </div>
            </div>

            <div>
                <h2 className="queue-list-title">
                    {selectedDate
                        ? `Appointments on ${new Date(selectedDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}`
                        : 'All Appointments (Latest First)'
                    }
                </h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-mid)' }}>
                        Loading appointments...
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <Calendar size={48} color='var(--border-strong)' style={{ margin: '0 auto 1rem' }} />
                        <p style={{ color: 'var(--text-mid)', fontSize: '1.1rem' }}>
                            {selectedDate
                                ? 'No appointments scheduled for this date'
                                : 'No appointments created yet'}
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/queue/create-appointment')}
                            style={{ marginTop: '1rem' }}
                        >
                            Create Appointment
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {appointments.map(apt => (
                            <div
                                key={apt._id}
                                className="card queue-appointment-card"
                                onClick={() => navigate(`/queue/appointments/${apt._id}`)}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-dark)' }}>
                                            {apt.title}
                                        </h3>
                                        <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>
                                            {apt.specialization}
                                        </span>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem', fontSize: '0.88rem', color: 'var(--text-mid)' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <DollarSign size={16} color="var(--text-light)" />
                                                <span>₹{apt.price}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <MapPin size={16} color="var(--text-light)" />
                                                <span>{apt.address}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <Clock size={16} color="var(--text-light)" />
                                                <span>{apt.totalSlots} slots</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <Users size={16} color="var(--text-light)" />
                                                <span>{apt.bookedSlots} / {apt.totalSlots} booked</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-secondary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/queue/appointments/${apt._id}`);
                                        }}
                                    >
                                        <Eye size={16} />
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
