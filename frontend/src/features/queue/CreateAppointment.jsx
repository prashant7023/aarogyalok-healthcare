import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, DollarSign, MapPin, ArrowLeft } from 'lucide-react';
import api from '../../shared/utils/api';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../auth/authStore';

export default function CreateAppointment() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [formData, setFormData] = useState({
        title: '',
        specialization: user?.specialization || '',
        appointmentDate: '',
        price: user?.consultationFee ? String(user.consultationFee) : '',
        address: user?.clinicAddress || '',
        startTime: user?.workingHours?.start || '09:00',
        endTime: user?.workingHours?.end || '14:00',
        slotDuration: user?.patientDuration ? String(user.patientDuration) : '10'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedSlots, setGeneratedSlots] = useState([]);

    // Generate time slots whenever time range or duration changes
    useEffect(() => {
        if (formData.startTime && formData.endTime && formData.slotDuration) {
            const slots = generateTimeSlots(
                formData.startTime,
                formData.endTime,
                parseInt(formData.slotDuration)
            );
            setGeneratedSlots(slots);
        }
    }, [formData.startTime, formData.endTime, formData.slotDuration]);

    const generateTimeSlots = (startTime, endTime, durationMinutes) => {
        const slots = [];
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startDate = new Date();
        startDate.setHours(startHour, startMin, 0, 0);

        const endDate = new Date();
        endDate.setHours(endHour, endMin, 0, 0);

        let currentTime = new Date(startDate);

        while (currentTime < endDate) {
            const hours = currentTime.getHours();
            const minutes = currentTime.getMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
            const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
            
            slots.push(timeString);
            currentTime.setMinutes(currentTime.getMinutes() + durationMinutes);
        }

        return slots;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (generatedSlots.length === 0) {
            setError('No slots generated. Please check your time range and duration.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post('/queue/appointments', {
                title: formData.title,
                specialization: formData.specialization,
                appointmentDate: formData.appointmentDate,
                price: parseInt(formData.price),
                address: formData.address,
                timeSlots: generatedSlots
            });
            alert('✅ Appointment created successfully!');
            navigate('/queue');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create appointment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '700px', margin: '0 auto', padding: '1.5rem' }}>
            {/* Back Button */}
            <button
                onClick={() => navigate('/queue')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    marginBottom: '1.5rem',
                    padding: '0.5rem 0'
                }}
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>

            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: 700, 
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <Plus size={28} color="#3b82f6" />
                    Create New Appointment
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                    Set up your appointment session with auto-generated time slots
                </p>
            </div>

            {error && (
                <div style={{ 
                    background: '#fee2e2', 
                    border: '1px solid #fecaca', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px',
                    color: '#dc2626',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem'
                }}>
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} color="#3b82f6" />
                            Basic Information
                        </h3>
                        
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                Appointment Title *
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., General Checkup Session"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                required
                                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                    Specialization *
                                </label>
                                <select
                                    className="input"
                                    value={formData.specialization}
                                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                                >
                                    <option value="">Select Specialization</option>
                                    <option value="Cardiology">Cardiology</option>
                                    <option value="Dermatology">Dermatology</option>
                                    <option value="Pediatrics">Pediatrics</option>
                                    <option value="Orthopedics">Orthopedics</option>
                                    <option value="General">General</option>
                                    <option value="Neurology">Neurology</option>
                                    <option value="ENT">ENT</option>
                                    <option value="Gynecology">Gynecology</option>
                                    <option value="Ophthalmology">Ophthalmology</option>
                                    <option value="Dentistry">Dentistry</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                    <DollarSign size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> Price (₹) *
                                </label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="500"
                                    value={formData.price}
                                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                                    min="0"
                                    required
                                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                Appointment Date *
                            </label>
                            <input
                                type="date"
                                className="input"
                                value={formData.appointmentDate}
                                onChange={(e) => setFormData({...formData, appointmentDate: e.target.value})}
                                min={new Date().toISOString().split('T')[0]}
                                required
                                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                <MapPin size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> Clinic Address *
                            </label>
                            <textarea
                                className="input"
                                placeholder="Enter clinic address"
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                rows={2}
                                required
                                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    {/* Time Slot Configuration */}
                    <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={18} color="#3b82f6" />
                            Time Slot Configuration
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                    Start Time *
                                </label>
                                <input
                                    type="time"
                                    className="input"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                    End Time *
                                </label>
                                <input
                                    type="time"
                                    className="input"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                    Slot Duration *
                                </label>
                                <select
                                    className="input"
                                    value={formData.slotDuration}
                                    onChange={(e) => setFormData({...formData, slotDuration: e.target.value})}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                                >
                                    <option value="10">10 min</option>
                                    <option value="15">15 min</option>
                                    <option value="20">20 min</option>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">60 min</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Preview Generated Slots */}
                    {generatedSlots.length > 0 && (
                        <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>Generated Slots Preview</h3>
                                <span style={{ 
                                    background: '#10b981', 
                                    color: 'white', 
                                    padding: '0.35rem 0.85rem', 
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600
                                }}>
                                    {generatedSlots.length} slots
                                </span>
                            </div>
                            <div style={{ 
                                maxHeight: '200px', 
                                overflowY: 'auto', 
                                padding: '1rem', 
                                background: '#f8fafc', 
                                borderRadius: '10px',
                                border: '2px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                    {generatedSlots.map((slot, i) => (
                                        <span 
                                            key={i}
                                            style={{
                                                background: 'white',
                                                color: '#3b82f6',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                border: '2px solid #dbeafe',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            {slot}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                        <button 
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/queue')}
                            style={{ flex: 1, padding: '0.85rem', fontSize: '0.95rem' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1, padding: '0.85rem', fontSize: '0.95rem' }}
                        >
                            {loading ? 'Creating...' : 'Create Appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
