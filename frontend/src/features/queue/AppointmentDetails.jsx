import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, User, Calendar, CheckCircle, XCircle, AlertCircle, Hash, Clock, Plus } from 'lucide-react';
import api from '../../shared/utils/api';

const formatEta = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AppointmentDetails() {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offlinePatient, setOfflinePatient] = useState({
        patientName: '',
        patientAge: '',
        patientGender: 'Male',
        description: '',
    });
    const [submittingOffline, setSubmittingOffline] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, [appointmentId]);

    useEffect(() => {
        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
        const socket = io(socketUrl);

        socket.on('connect', () => {
            socket.emit('join-appointment-queue', appointmentId);
        });

        socket.on('queue-updated', ({ appointmentId: updatedAppointmentId, queue, currentTokenNumber }) => {
            if (updatedAppointmentId !== appointmentId) return;

            setAppointment((prev) => {
                if (!prev) return prev;
                return { ...prev, currentTokenNumber };
            });

            setBookings((prev) =>
                prev.map((booking) => {
                    const updated = queue?.find((item) => item._id === booking._id || item.tokenNumber === booking.tokenNumber);
                    if (!updated) return booking;
                    return {
                        ...booking,
                        estimatedTurnTime: updated.estimatedTurnTime,
                        estimatedWaitMinutes: updated.estimatedWaitMinutes,
                        status: updated.status || booking.status,
                    };
                })
            );
        });

        return () => {
            socket.disconnect();
        };
    }, [appointmentId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/queue/doctor/appointments/${appointmentId}`);
            setAppointment(res.data.data.appointment);
            setBookings(res.data.data.bookings || []);
        } catch (e) {
            console.error('Failed to fetch details:', e);
            alert('Failed to load appointment details');
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (bookingId, markStatus) => {
        try {
            await api.patch(`/queue/doctor/bookings/${bookingId}/mark`, { markStatus });
            fetchDetails();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to update patient status');
        }
    };

    const handleAddOfflinePatient = async (e) => {
        e.preventDefault();
        setSubmittingOffline(true);

        try {
            await api.post(`/queue/doctor/appointments/${appointmentId}/offline-bookings`, {
                ...offlinePatient,
                patientAge: parseInt(offlinePatient.patientAge),
            });
            setOfflinePatient({ patientName: '', patientAge: '', patientGender: 'Male', description: '' });
            fetchDetails();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to add offline patient');
        } finally {
            setSubmittingOffline(false);
        }
    };

    if (loading) {
        return <div className="fade-in" style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>;
    }

    if (!appointment) {
        return <div className="fade-in" style={{ textAlign: 'center', padding: '3rem' }}>Appointment not found</div>;
    }

    const activeQueue = bookings.filter((booking) => booking.status === 'confirmed');

    return (
        <div className="fade-in">
            <button
                className="btn btn-secondary"
                onClick={() => navigate('/queue')}
                style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a' }}>{appointment.title}</h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div><strong>Date:</strong> {new Date(appointment.appointmentDate).toLocaleDateString()}</div>
                    <div><strong>Duration:</strong> {appointment.consultationDurationMinutes} min/patient</div>
                    <div><strong>Current Token:</strong> {appointment.currentTokenNumber || '-'}</div>
                    <div><strong>Issued Tokens:</strong> {appointment.totalTokensIssued || 0}</div>
                </div>
                <div><strong>Address:</strong> {appointment.address}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} color="#2563eb" /> Add Offline Walk-in Patient
                </h2>
                <form onSubmit={handleAddOfflinePatient} style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                        <input className="input" placeholder="Patient name" value={offlinePatient.patientName} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, patientName: e.target.value }))} required />
                        <input className="input" type="number" placeholder="Age" min="1" max="120" value={offlinePatient.patientAge} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, patientAge: e.target.value }))} required />
                        <select className="input" value={offlinePatient.patientGender} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, patientGender: e.target.value }))}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <textarea className="input" rows={2} placeholder="Symptoms / notes" value={offlinePatient.description} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, description: e.target.value }))} required style={{ resize: 'vertical' }} />
                    <button type="submit" className="btn btn-primary" disabled={submittingOffline} style={{ width: 'fit-content' }}>
                        {submittingOffline ? 'Adding...' : 'Add to Queue'}
                    </button>
                </form>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
                    Queue ({activeQueue.length} active / {bookings.length} total)
                </h2>

                {bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        <User size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
                        <p>No patients in queue yet</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {bookings
                            .sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0))
                            .map((booking) => (
                                <div
                                    key={booking._id}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        padding: '0.9rem',
                                        background: booking.status === 'completed' ? '#f0fdf4' : booking.status === 'cancelled' ? '#f8fafc' : '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.75rem',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 320px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            background: '#dbeafe',
                                            color: '#1e40af',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: '0.95rem',
                                            flexShrink: 0,
                                        }}>
                                            #{booking.tokenNumber}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.2rem' }}>{booking.patientName}</h3>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>
                                                {booking.patientAge}y • {booking.patientGender} {booking.isOfflineEntry ? '• Walk-in' : ''}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ padding: '0.2rem 0.45rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#dbeafe', color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Hash size={11} /> Current: {appointment.currentTokenNumber || '-'}
                                                </span>
                                                <span style={{ padding: '0.2rem 0.45rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#ecfeff', color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={11} /> ETA: {formatEta(booking.estimatedTurnTime)}
                                                </span>
                                                <span style={{ padding: '0.2rem 0.45rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#f8fafc', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={11} /> Wait: {booking.estimatedWaitMinutes ?? 0} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', alignItems: 'flex-end' }}>
                                        <span
                                            style={{
                                                padding: '0.35rem 0.65rem',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                background: booking.status === 'completed' ? '#d1fae5' : booking.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                                                color: booking.status === 'completed' ? '#059669' : booking.status === 'cancelled' ? '#dc2626' : '#d97706',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            {booking.status === 'completed' && <CheckCircle size={13} />}
                                            {booking.status === 'cancelled' && <XCircle size={13} />}
                                            {booking.status === 'confirmed' && <AlertCircle size={13} />}
                                            {booking.status === 'confirmed' ? 'Waiting' : booking.status === 'completed' ? 'Done' : 'Cancelled'}
                                        </span>

                                        {booking.status === 'confirmed' && (
                                            <div style={{ display: 'flex', gap: '0.45rem' }}>
                                                <button
                                                    onClick={() => handleMark(booking._id, 'absent')}
                                                    style={{ fontSize: '0.78rem', padding: '0.38rem 0.6rem', background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Mark Absent
                                                </button>
                                                <button
                                                    onClick={() => handleMark(booking._id, 'completed')}
                                                    style={{ fontSize: '0.78rem', padding: '0.38rem 0.6rem', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
