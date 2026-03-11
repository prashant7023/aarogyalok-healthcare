import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Clock, Calendar, Phone, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../shared/utils/api';

export default function AppointmentDetails() {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
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
            fetchDetails(); // Refresh data
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to mark patient');
        }
    };

    if (loading) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
                Loading...
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
                Appointment not found
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Back Button */}
            <button 
                className="btn btn-secondary"
                onClick={() => navigate('/queue')}
                style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>

            {/* Appointment Info Card */}
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
                    {appointment.title}
                </h1>
                
                <span className="badge badge-blue" style={{ marginBottom: '1.5rem' }}>
                    {appointment.specialization}
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                    <div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Date</div>
                        <div style={{ fontWeight: 600 }}>
                            {new Date(appointment.appointmentDate).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Price</div>
                        <div style={{ fontWeight: 600 }}>₹{appointment.price}</div>
                    </div>
                    <div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Total Slots</div>
                        <div style={{ fontWeight: 600 }}>{appointment.totalSlots}</div>
                    </div>
                    <div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Booked</div>
                        <div style={{ fontWeight: 600 }}>{appointment.bookedSlots} / {appointment.totalSlots}</div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Address</div>
                    <div style={{ fontWeight: 600 }}>{appointment.address}</div>
                </div>
            </div>

            {/* Patients List */}
            <div className="card" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: '#0f172a' }}>
                    Patients ({bookings.length})
                </h2>

                {bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        <User size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                        <p>No bookings yet</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {bookings.map((booking) => (
                            <div 
                                key={booking._id}
                                style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    background: booking.markedBy === 'completed' ? '#f0fdf4' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                }}
                            >
                                {/* Patient Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        flexShrink: 0
                                    }}>
                                        {booking.patientName.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {booking.patientName}
                                        </h3>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            {booking.patientAge}y • {booking.patientGender} • {booking.timeSlot}
                                        </div>
                                        {booking.description && (
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {booking.description}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Badge and Action Buttons - Separate Rows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
                                    {/* Status Badge */}
                                    <div>
                                        <span style={{
                                            padding: '0.4rem 0.75rem',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: 
                                                booking.markedBy === 'completed' ? '#d1fae5' :
                                                booking.markedBy === 'present' ? '#dbeafe' :
                                                booking.markedBy === 'absent' ? '#fee2e2' :
                                                '#fef3c7',
                                            color: 
                                                booking.markedBy === 'completed' ? '#059669' :
                                                booking.markedBy === 'present' ? '#2563eb' :
                                                booking.markedBy === 'absent' ? '#dc2626' :
                                                '#d97706'
                                        }}>
                                            {booking.markedBy === 'completed' && <CheckCircle size={14} />}
                                            {booking.markedBy === 'present' && <CheckCircle size={14} />}
                                            {booking.markedBy === 'absent' && <XCircle size={14} />}
                                            {booking.markedBy === 'pending' && <AlertCircle size={14} />}
                                            {booking.markedBy === 'pending' ? 'Pending' :
                                             booking.markedBy === 'present' ? 'Present' :
                                             booking.markedBy === 'absent' ? 'Absent' :
                                             'Done'}
                                        </span>
                                    </div>

                                    {/* Mark Buttons */}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleMark(booking._id, 'present')}
                                            disabled={booking.markedBy === 'present'}
                                            style={{ 
                                                fontSize: '0.85rem', 
                                                padding: '0.5rem 0.75rem',
                                                background: booking.markedBy === 'present' ? '#dbeafe' : 'white',
                                                color: booking.markedBy === 'present' ? '#1e40af' : '#3b82f6',
                                                border: '1px solid #3b82f6',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                cursor: booking.markedBy === 'present' ? 'not-allowed' : 'pointer',
                                                opacity: booking.markedBy === 'present' ? 0.6 : 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Present
                                        </button>
                                        <button
                                            onClick={() => handleMark(booking._id, 'absent')}
                                            disabled={booking.markedBy === 'absent'}
                                            style={{ 
                                                fontSize: '0.85rem', 
                                                padding: '0.5rem 0.75rem',
                                                background: booking.markedBy === 'absent' ? '#fee2e2' : 'white',
                                                color: booking.markedBy === 'absent' ? '#991b1b' : '#dc2626',
                                                border: '1px solid #dc2626',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                cursor: booking.markedBy === 'absent' ? 'not-allowed' : 'pointer',
                                                opacity: booking.markedBy === 'absent' ? 0.6 : 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Absent
                                        </button>
                                        <button
                                            onClick={() => handleMark(booking._id, 'completed')}
                                            disabled={booking.markedBy === 'completed'}
                                            style={{ 
                                                fontSize: '0.85rem', 
                                                padding: '0.5rem 0.75rem',
                                                background: booking.markedBy === 'completed' ? '#10b981' : '#059669',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                cursor: booking.markedBy === 'completed' ? 'not-allowed' : 'pointer',
                                                opacity: booking.markedBy === 'completed' ? 0.6 : 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Done
                                        </button>
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
