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

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
                    borderRadius: '12px',
                    padding: '0.85rem 1.25rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: 1 }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{bookings.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Active Tokens</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>{activeBookings.length}</div>
                    </div>
                </div>
                <div style={{ padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={16} color="#60a5fa" />
                    <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>Live Queue</span>
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
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>No queue tokens yet</div>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Book an appointment to get your token.</p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {bookings.map((booking, idx) => {
                        const appointment = booking.appointmentId;
                        const currentToken = appointment?.currentTokenNumber || null;
                        const isCompleted = booking.status === 'completed' || booking.markedBy === 'completed';
                        const isCancelled = booking.status === 'cancelled';
                        const waitMinutes = booking.estimatedWaitMinutes ?? 0;

                        return (
                            <div
                                key={booking._id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'start',
                                    gap: '1rem',
                                    flexWrap: 'wrap',
                                    padding: '1rem 1.25rem',
                                    borderBottom: idx < bookings.length - 1 ? '1px solid #f1f5f9' : 'none',
                                }}
                            >
                                <div style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '10px',
                                    background: '#dbeafe',
                                    color: '#1e40af',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                }}>
                                    #{booking.tokenNumber}
                                </div>

                                <div style={{ flex: 1, minWidth: 220 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                                        {appointment?.title || 'Appointment'}
                                    </div>
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af', padding: '0.18rem 0.55rem', borderRadius: '999px', fontWeight: 700, display: 'inline-flex' }}>
                                            Dr. {appointment?.doctorId?.name || appointment?.doctorName || 'Unknown'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={13} color="#94a3b8" />
                                            {appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : '—'}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={13} color="#94a3b8" />
                                            {appointment?.address || '—'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                        <span style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: '#f8fafc', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Hash size={11} /> Token Number: #{booking.tokenNumber}
                                        </span>
                                        <span style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Hash size={11} /> Current: {currentToken || '-'}
                                        </span>
                                        <span style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: '#ecfeff', color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Timer size={11} /> ETA: {formatEta(booking.estimatedTurnTime)}
                                        </span>
                                        <span style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: '#f0fdf4', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={11} /> Wait: {waitMinutes} min
                                        </span>
                                    </div>

                                    <div style={{ marginBottom: '0.45rem' }}>
                                        {isCompleted && (
                                            <span style={{ padding: '0.28rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#d1fae5', color: '#047857' }}>
                                                ✅ Treated
                                            </span>
                                        )}
                                        {isCancelled && (
                                            <span style={{ padding: '0.28rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>
                                                ❌ Cancelled
                                            </span>
                                        )}
                                        {!isCompleted && !isCancelled && (
                                            <span style={{ padding: '0.28rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>
                                                ⏳ Waiting for turn
                                            </span>
                                        )}
                                    </div>

                                    {booking.description && (
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                                            <FileText size={11} style={{ display: 'inline', marginRight: '4px' }} />
                                            {booking.description}
                                        </div>
                                    )}
                                </div>

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
                                            flexShrink: 0,
                                            height: 'fit-content',
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
