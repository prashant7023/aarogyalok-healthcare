import { useState, useEffect } from 'react';
import { Calendar, Plus, Users, Clock, DollarSign, MapPin, Eye } from 'lucide-react';
import api from '../../shared/utils/api';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../auth/authStore';

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
        <div className="fade-in">
            {/* Header */}
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

            {/* Date Selector */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Calendar size={20} color="#3b82f6" />
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

            {/* Appointments List */}
            <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#0f172a' }}>
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
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        Loading appointments...
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <Calendar size={48} color='#cbd5e1' style={{ margin: '0 auto 1rem' }} />
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
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
                                className="card"
                                style={{ 
                                    padding: '1.5rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: '1px solid #e2e8f0'
                                }}
                                onClick={() => navigate(`/queue/appointments/${apt._id}`)}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
                                            {apt.title}
                                        </h3>
                                        <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>
                                            {apt.specialization}
                                        </span>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <DollarSign size={16} color="#94a3b8" />
                                                <span>₹{apt.price}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <MapPin size={16} color="#94a3b8" />
                                                <span>{apt.address}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <Clock size={16} color="#94a3b8" />
                                                <span>{apt.totalSlots} slots</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <Users size={16} color="#94a3b8" />
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
