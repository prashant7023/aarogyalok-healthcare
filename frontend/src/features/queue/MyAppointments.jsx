import { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, FileText, XCircle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../shared/utils/api';

export default function MyAppointments() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/queue/my-bookings');
            setBookings(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch bookings:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            await api.delete(`/queue/bookings/${bookingId}`);
            alert('? Booking cancelled successfully');
            fetchBookings();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to cancel booking');
        }
    };

    // Count stats
    const stats = {
        total: bookings.length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed' || b.markedBy === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
    };

    return (
        <div className="fade-in">
            {/* Compact header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>My Appointments</h1>
                <button onClick={fetchBookings} disabled={loading}
                    style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            {/* Stats banner */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
                borderRadius: '12px', padding: '0.85rem 1.25rem',
                marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: 1 }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stats.total}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Confirmed</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>{stats.confirmed}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Completed</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{stats.completed}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Cancelled</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{stats.cancelled}</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#fff', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                    <Clock size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Loading...</div>
                </div>
            ) : bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', background: '#fff', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                    <Calendar size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>No appointments booked yet</div>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Book your first appointment to get started.</p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {bookings.map((booking, idx) => {
                        const isCancelled = booking.status === 'cancelled';
                        const isCompleted = booking.status === 'completed' || booking.markedBy === 'completed';
                        
                        return (
                            <div 
                                key={booking._id}
                                style={{
                                    display: 'flex', alignItems: 'start', gap: '1rem', flexWrap: 'wrap',
                                    padding: '1rem 1.25rem',
                                    borderBottom: idx < bookings.length - 1 ? '1px solid #f1f5f9' : 'none',
                                    transition: 'background .15s',
                                    opacity: isCancelled ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = ''}
                            >
                                {/* Status indicator dot */}
                                <div style={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    background: isCompleted ? '#10b981' : isCancelled ? '#94a3b8' : '#3b82f6',
                                    flexShrink: 0,
                                    marginTop: '6px'
                                }} />

                                {/* Main content */}
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    {/* Title and doctor */}
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                                            {booking.appointmentId?.title || 'Appointment'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            Dr. {booking.appointmentId?.doctorId?.name || 'Unknown'}
                                            {booking.appointmentId?.specialization && (
                                                <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>• {booking.appointmentId.specialization}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Date, time, location */}
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={13} color="#94a3b8" />
                                            {new Date(booking.appointmentId?.appointmentDate).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                            <Clock size={13} color="#94a3b8" />
                                            {booking.timeSlot}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={13} color="#94a3b8" />
                                            {booking.appointmentId?.address || 'N/A'}
                                        </span>
                                    </div>

                                    {/* Patient info */}
                                    <div style={{ 
                                        background: '#f8fafc',
                                        padding: '0.6rem 0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.8rem',
                                        marginBottom: '0.75rem'
                                    }}>
                                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                                            {booking.patientName} <span style={{ color: '#94a3b8', fontWeight: 400 }}>• {booking.patientAge}y • {booking.patientGender}</span>
                                        </div>
                                        {booking.description && (
                                            <div style={{ color: '#64748b', lineHeight: 1.5 }}>
                                                <FileText size={11} style={{ display: 'inline', marginRight: '4px' }} />
                                                {booking.description}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status badges */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{
                                            padding: '0.3rem 0.65rem',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: 
                                                booking.status === 'confirmed' ? '#dbeafe' :
                                                booking.status === 'completed' ? '#d1fae5' :
                                                '#f1f5f9',
                                            color: 
                                                booking.status === 'confirmed' ? '#2563eb' :
                                                booking.status === 'completed' ? '#059669' :
                                                '#64748b'
                                        }}>
                                            {booking.status === 'confirmed' && <CheckCircle size={11} />}
                                            {booking.status === 'completed' && <CheckCircle size={11} />}
                                            {booking.status === 'cancelled' && <XCircle size={11} />}
                                            {booking.status === 'confirmed' ? 'Confirmed' :
                                             booking.status === 'completed' ? 'Completed' :
                                             'Cancelled'}
                                        </span>
                                        {booking.markedBy && booking.markedBy !== 'pending' && (
                                            <span style={{
                                                padding: '0.3rem 0.65rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: 
                                                    booking.markedBy === 'completed' ? '#d1fae5' :
                                                    booking.markedBy === 'present' ? '#dbeafe' :
                                                    '#fee2e2',
                                                color: 
                                                    booking.markedBy === 'completed' ? '#059669' :
                                                    booking.markedBy === 'present' ? '#2563eb' :
                                                    '#dc2626'
                                            }}>
                                                {booking.markedBy === 'completed' && <CheckCircle size={11} />}
                                                {booking.markedBy === 'present' && <CheckCircle size={11} />}
                                                {booking.markedBy === 'absent' && <XCircle size={11} />}
                                                {booking.markedBy === 'present' ? 'Present' :
                                                 booking.markedBy === 'absent' ? 'Absent' :
                                                 'Treatment Done'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Cancel button */}
                                {booking.status === 'confirmed' && (
                                    <button
                                        onClick={() => handleCancel(booking._id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '0.45rem 0.75rem',
                                            background: '#fff',
                                            color: '#dc2626',
                                            border: '1px solid #fecaca',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            flexShrink: 0,
                                            height: 'fit-content'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = '#fee2e2';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = '#fff';
                                        }}
                                    >
                                        <XCircle size={12} />
                                        Cancel
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
