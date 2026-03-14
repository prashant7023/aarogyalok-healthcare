import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, MapPin, FileText, XCircle, RefreshCw, Hash, Timer, Activity } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../shared/utils/api';

const formatEta = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function MyAppointments() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const appointmentIds = useMemo(
        () => [...new Set(bookings.map((booking) => booking.appointmentId?._id).filter(Boolean))],
        [bookings]
    );

    useEffect(() => {
        fetchBookings();
    }, []);

    useEffect(() => {
        if (appointmentIds.length === 0) return;

        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
        const socket = io(socketUrl);

        socket.on('connect', () => {
            appointmentIds.forEach((appointmentId) => {
                if (appointmentId) {
                    socket.emit('join-appointment-queue', appointmentId);
                }
            });
        });

        socket.on('queue-updated', ({ appointmentId, queue, currentTokenNumber }) => {
            setBookings((prev) =>
                prev.map((booking) => {
                    if (booking.appointmentId?._id !== appointmentId) return booking;

                    const appointment = {
                        ...booking.appointmentId,
                        currentTokenNumber,
                    };

                    const matched = queue?.find((item) => item._id === booking._id || item.tokenNumber === booking.tokenNumber);
                    if (!matched) {
                        return { ...booking, appointmentId: appointment };
                    }

                    return {
                        ...booking,
                        appointmentId: appointment,
                        estimatedTurnTime: matched.estimatedTurnTime,
                        estimatedWaitMinutes: matched.estimatedWaitMinutes,
                        status: matched.status || booking.status,
                    };
                })
            );
        });

        socket.on('booking-status-updated', ({ appointmentId, bookingId, tokenNumber, status, markedBy }) => {
            setBookings((prev) =>
                prev.map((booking) => {
                    if (booking.appointmentId?._id !== appointmentId) return booking;

                    const isMatched = booking._id === bookingId || booking.tokenNumber === tokenNumber;
                    if (!isMatched) return booking;

                    return {
                        ...booking,
                        status: status || booking.status,
                        markedBy: markedBy || booking.markedBy,
                        estimatedTurnTime: status === 'completed' || status === 'cancelled' ? null : booking.estimatedTurnTime,
                        estimatedWaitMinutes: status === 'completed' || status === 'cancelled' ? null : booking.estimatedWaitMinutes,
                    };
                })
            );
        });

        return () => {
            socket.disconnect();
        };
    }, [appointmentIds]);

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
            alert('✅ Token cancelled successfully');
            fetchBookings();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to cancel token');
        }
    };

    const activeBookings = useMemo(
        () => bookings.filter((booking) => booking.status === 'confirmed'),
        [bookings]
    );

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>My Queue Tokens</h1>
                <button
                    onClick={fetchBookings}
                    disabled={loading}
                    style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#3b82f6',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                    }}
                >
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e1e3e5', borderRadius: '10px' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#005bd3' }} />
                        <span style={{ fontSize: '0.72rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total</span>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#303030', lineHeight: 1 }}>{bookings.length}</span>
                    </div>
                    <div style={{ width: 1, height: 28, background: '#e1e3e5' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                        <span style={{ fontSize: '0.72rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active</span>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{activeBookings.length}</span>
                    </div>
                    <div style={{ width: 1, height: 28, background: '#e1e3e5' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#008060' }} />
                        <span style={{ fontSize: '0.72rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Done</span>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#008060', lineHeight: 1 }}>{bookings.filter(b => b.status === 'completed').length}</span>
                    </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#005bd3', background: '#ebf4ff', padding: '0.3rem 0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Activity size={13} color="#005bd3" /> Live Queue
                </span>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#fff', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                    <Clock size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Loading...</div>
                </div>
            ) : bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', background: '#fff', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                    <Calendar size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>No queue tokens yet</div>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Book an appointment to get your token.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {bookings.map((booking) => {
                        const appointment = booking.appointmentId;
                        const currentToken = appointment?.currentTokenNumber || null;
                        const isCompleted = booking.status === 'completed' || booking.markedBy === 'completed';
                        const isCancelled = booking.status === 'cancelled';
                        const isWaiting = !isCompleted && !isCancelled;
                        const waitMinutes = booking.estimatedWaitMinutes ?? 0;
                        const accentColor = isCompleted ? '#008060' : isCancelled ? '#dc2626' : '#005bd3';

                        return (
                            <div
                                key={booking._id}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e1e3e5',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Card header — doctor name on top */}
                                <div style={{ background: '#f8fafc', borderBottom: '1px solid #e1e3e5', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        {/* Token badge */}
                                        <div style={{ background: '#005bd3', color: '#fff', borderRadius: '8px', padding: '0.28rem 0.6rem', fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.2, textAlign: 'center', flexShrink: 0 }}>
                                            <div style={{ fontSize: '0.55rem', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Token</div>
                                            {booking.tokenNumber}
                                        </div>
                                        {/* Doctor name */}
                                        <div>
                                            <div style={{ fontSize: '0.67rem', color: '#8a8a8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Doctor</div>
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#005bd3' }}>
                                                Dr. {appointment?.doctorId?.name || appointment?.doctorName || 'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Status badge */}
                                    <span style={{ padding: '0.28rem 0.7rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: isCompleted ? '#d1fae5' : isCancelled ? '#fee2e2' : '#fef3c7', color: isCompleted ? '#008060' : isCancelled ? '#dc2626' : '#b45309' }}>
                                        {isCompleted ? '✅ Treated' : isCancelled ? '❌ Cancelled' : '⏳ Waiting'}
                                    </span>
                                </div>

                                {/* Card body */}
                                <div style={{ padding: '0.85rem 1rem' }}>
                                    {/* Session title */}
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#303030', marginBottom: '0.5rem' }}>
                                        {appointment?.title || 'Appointment'}
                                    </div>

                                    {/* Date + Location */}
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#8a8a8a', marginBottom: '0.6rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} color="#94a3b8" />
                                            {appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={12} color="#94a3b8" />
                                            {appointment?.address || '—'}
                                        </span>
                                    </div>

                                    {/* Queue chips */}
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: booking.description ? '0.6rem' : 0 }}>
                                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#ebf4ff', color: '#005bd3', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Hash size={10} /> My Token: {booking.tokenNumber}
                                        </span>
                                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#f1f2f3', color: '#303030', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Activity size={10} /> Current: {currentToken || '-'}
                                        </span>
                                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#f0fdfa', color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Timer size={10} /> ETA: {formatEta(booking.estimatedTurnTime)}
                                        </span>
                                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#f8fafc', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Clock size={10} /> Wait: {waitMinutes} min
                                        </span>
                                    </div>

                                    {booking.description && (
                                        <div style={{ fontSize: '0.78rem', color: '#8a8a8a', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                                            <FileText size={11} style={{ marginTop: '2px', flexShrink: 0 }} />
                                            {booking.description}
                                        </div>
                                    )}
                                </div>

                                {/* Card footer — cancel */}
                                {isWaiting && (
                                    <div style={{ padding: '0.55rem 1rem', borderTop: '1px solid #f1f2f3', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => handleCancel(booking._id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.75rem', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            <XCircle size={12} /> Cancel Token
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
