import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, CheckCircle, XCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import api from '../../shared/utils/api';
import { io } from 'socket.io-client';
import useAuthStore from '../auth/authStore';

export default function DoctorDashboard() {
    const { user } = useAuthStore();
    const [appointments, setAppointments] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
        setSocket(socketInstance);

        socketInstance.on('connect', () => {
            console.log('Doctor connected to Socket.IO');
            if (user?._id) {
                socketInstance.emit('join-doctor', user._id);
            }
        });

        socketInstance.on('new-booking', (data) => {
            console.log('New booking notification:', data);
            fetchAppointments();
            // Show browser notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Appointment Booked! 🎉', {
                    body: `Patient: ${data.booking?.patientId?.name || 'New patient'}`,
                    icon: '/logo.png'
                });
            }
        });

        return () => {
            socketInstance.disconnect();
        };
    }, [user]);

    useEffect(() => {
        fetchAppointments();
    }, [selectedDate]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/queue/appointments?date=${selectedDate}`);
            setAppointments(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch appointments:', e);
        } finally {
            setLoading(false);
        }
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    const getStatusBadge = (status) => {
        const styles = {
            confirmed: { bg: '#dbeafe', color: '#2563eb', icon: CheckCircle },
            completed: { bg: '#d1fae5', color: '#059669', icon: CheckCircle },
            cancelled: { bg: '#fee', color: '#dc2626', icon: XCircle },
            pending: { bg: '#fef3c7', color: '#d97706', icon: AlertCircle }
        };
        const style = styles[status] || styles.pending;
        const Icon = style.icon;
        return (
            <span style={{ 
                background: style.bg, 
                color: style.color, 
                padding: '0.4rem 0.8rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textTransform: 'capitalize'
            }}>
                <Icon size={12} />
                {status}
            </span>
        );
    };

    const stats = {
        total: appointments.length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1>My Appointments Dashboard</h1>
                    <p>Manage your patient appointments and schedule</p>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Appointments', value: stats.total, bg: '#dbeafe', col: '#2563eb' },
                    { label: 'Confirmed', value: stats.confirmed, bg: '#d1fae5', col: '#059669' },
                    { label: 'Completed', value: stats.completed, bg: '#e0e7ff', col: '#6366f1' },
                    { label: 'Cancelled', value: stats.cancelled, bg: '#fee', col: '#dc2626' }
                ].map(s => (
                    <div className="stat-card" key={s.label}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: s.col, marginBottom: '0.5rem' }}>
                            {s.value}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Date Selector */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Calendar size={20} color="#3b82f6" />
                        <label style={{ fontWeight: 600, fontSize: '1rem' }}>Select Date:</label>
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                padding: '0.75rem 1rem',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 500
                            }}
                        />
                    </div>
                    <button 
                        className="btn btn-secondary"
                        onClick={fetchAppointments}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Appointments List */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ 
                    padding: '1.5rem', 
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
                        Appointments for {new Date(selectedDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </h3>
                    <span style={{ 
                        fontSize: '0.85rem', 
                        color: '#059669',
                        fontWeight: 600,
                        background: '#d1fae5',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '999px'
                    }}>
                        {appointments.length} Total
                    </span>
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem' }} />
                        <p>Loading appointments...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <Calendar size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            No appointments scheduled
                        </p>
                        <p style={{ fontSize: '0.9rem' }}>
                            No patients have booked appointments for this date yet.
                        </p>
                    </div>
                ) : (
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {appointments.map((apt, idx) => (
                            <div 
                                key={apt._id}
                                style={{
                                    padding: '1.5rem',
                                    borderBottom: idx === appointments.length - 1 ? 'none' : '1px solid #e2e8f0',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                            >
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.5rem', alignItems: 'start' }}>
                                    {/* Token & Time */}
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '1.5rem',
                                            fontWeight: 800,
                                            marginBottom: '0.5rem'
                                        }}>
                                            #{apt.tokenNumber}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3b82f6' }}>
                                            <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                            {apt.timeSlot}
                                        </div>
                                    </div>

                                    {/* Patient Details */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1rem',
                                                fontWeight: 700,
                                                color: '#475569'
                                            }}>
                                                {apt.patientName?.charAt(0) || apt.patientId?.name?.charAt(0) || 'P'}
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, marginBottom: '2px' }}>
                                                    {apt.patientName || apt.patientId?.name || 'Patient'}
                                                </h4>
                                                {apt.patientId?.email && (
                                                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                                                        {apt.patientId.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                                            {apt.patientPhone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Phone size={14} />
                                                    <span>{apt.patientPhone}</span>
                                                </div>
                                            )}
                                            {apt.symptoms && (
                                                <div style={{ display: 'flex', alignItems: 'start', gap: '6px' }}>
                                                    <FileText size={14} style={{ marginTop: '2px' }} />
                                                    <div>
                                                        <strong style={{ color: '#334155' }}>Symptoms:</strong>
                                                        <p style={{ margin: '4px 0 0 0', lineHeight: 1.5 }}>
                                                            {apt.symptoms}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        {getStatusBadge(apt.status)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
