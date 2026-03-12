import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, User, MapPin, DollarSign } from 'lucide-react';
import api from '../../shared/utils/api';

export default function BookAppointment() {
    const navigate = useNavigate();
    const location = useLocation();
    const appointment = location.state?.appointment;

    const [formData, setFormData] = useState({
        patientName: '',
        patientAge: '',
        patientGender: 'Male',
        description: '',
        timeSlot: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!appointment) {
        return (
            <div className="fade-in" style={{ padding: '2rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h2>Appointment not found</h2>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/queue')}
                        style={{ marginTop: '1rem' }}
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/queue/bookings', {
                appointmentId: appointment._id,
                ...formData,
                patientAge: parseInt(formData.patientAge)
            });
            alert('✅ Slot booked successfully!');
            navigate('/queue');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to book slot');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '1rem' }}>
                <button
                    onClick={() => navigate('/queue')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: '0.5rem'
                    }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Book Appointment</h1>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Fill in your details to confirm</p>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {/* Appointment Info Card */}
                <div className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'white' }}>
                        {appointment.title}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <User size={14} />
                            <span>Dr. {appointment.doctorId?.name || 'Unknown'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={14} />
                            <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <DollarSign size={14} />
                            <span>₹{appointment.price}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.35rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                        <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{appointment.address}</span>
                    </div>
                </div>

                {/* Booking Form Card */}
                <div className="card" style={{ padding: '1rem' }}>
                    {error && (
                        <div style={{ 
                            background: '#fee2e2', 
                            border: '1px solid #fca5a5', 
                            padding: '0.65rem', 
                            borderRadius: '6px',
                            color: '#dc2626',
                            marginBottom: '1rem',
                            fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
                            Personal Information
                        </h3>

                        {/* Full Name */}
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                Full Name *
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter your full name"
                                value={formData.patientName}
                                onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* Age & Gender */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                    Age *
                                </label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Age"
                                    value={formData.patientAge}
                                    onChange={(e) => setFormData({...formData, patientAge: e.target.value})}
                                    min="1"
                                    max="120"
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                    Gender *
                                </label>
                                <select
                                    className="input"
                                    value={formData.patientGender}
                                    onChange={(e) => setFormData({...formData, patientGender: e.target.value})}
                                    required
                                    style={{ width: '100%' }}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            Appointment Details
                        </h3>

                        {/* Time Slot Selection */}
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                Select Time Slot *
                            </label>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                gap: '0.5rem'
                            }}>
                                {appointment.timeSlots.map((slot, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => !slot.isBooked && setFormData({...formData, timeSlot: slot.time})}
                                        disabled={slot.isBooked}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '6px',
                                            border: slot.isBooked 
                                                ? '1px solid #e2e8f0' 
                                                : formData.timeSlot === slot.time 
                                                    ? '2px solid #3b82f6' 
                                                    : '1px solid #e2e8f0',
                                            background: slot.isBooked
                                                ? '#f1f5f9'
                                                : formData.timeSlot === slot.time 
                                                    ? '#dbeafe' 
                                                    : 'white',
                                            color: slot.isBooked
                                                ? '#94a3b8'
                                                : formData.timeSlot === slot.time 
                                                    ? '#1e40af' 
                                                    : '#334155',
                                            fontWeight: formData.timeSlot === slot.time ? 700 : 600,
                                            fontSize: '0.8rem',
                                            cursor: slot.isBooked ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.3rem',
                                            opacity: slot.isBooked ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!slot.isBooked && formData.timeSlot !== slot.time) {
                                                e.target.style.background = '#f8fafc';
                                                e.target.style.borderColor = '#cbd5e1';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!slot.isBooked && formData.timeSlot !== slot.time) {
                                                e.target.style.background = 'white';
                                                e.target.style.borderColor = '#e2e8f0';
                                            }
                                        }}
                                    >
                                        <Clock size={12} />
                                        <span>{slot.time}</span>
                                        {slot.isBooked && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(Booked)</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reason for Visit */}
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                Reason for Visit *
                            </label>
                            <textarea
                                className="input"
                                placeholder="Describe your symptoms..."
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                rows={3}
                                required
                                style={{ resize: 'vertical', width: '100%', fontSize: '0.85rem' }}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <button 
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/queue')}
                                style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem' }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || !formData.timeSlot}
                                style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem' }}
                            >
                                {loading ? 'Booking...' : 'Confirm'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
