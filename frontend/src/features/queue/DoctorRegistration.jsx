import { useState } from 'react';
import { Stethoscope, Clock, Calendar, MapPin, Award, User, Mail, Lock, Phone, X } from 'lucide-react';
import api from '../../shared/utils/api';
import useAuthStore from '../auth/authStore';

export default function DoctorRegistration({ onClose, onSuccess }) {
    const { setAuth } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        specialization: '',
        qualification: '',
        experience: '',
        consultationFee: '',
        patientDuration: '10',
        workingDaysStart: 'Monday',
        workingDaysEnd: 'Friday',
        workingHoursStart: '10:00',
        workingHoursEnd: '14:00',
        clinicAddress: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const getWorkingDaysRange = () => {
        const startIdx = weekDays.indexOf(formData.workingDaysStart);
        const endIdx = weekDays.indexOf(formData.workingDaysEnd);
        
        if (startIdx <= endIdx) {
            return weekDays.slice(startIdx, endIdx + 1);
        } else {
            // Wrap around week
            return [...weekDays.slice(startIdx), ...weekDays.slice(0, endIdx + 1)];
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: 'doctor',
                phone: formData.phone,
                specialization: formData.specialization,
                qualification: formData.qualification,
                experience: parseInt(formData.experience),
                consultationFee: parseInt(formData.consultationFee),
                patientDuration: parseInt(formData.patientDuration),
                workingDays: getWorkingDaysRange(),
                workingHours: {
                    start: formData.workingHoursStart,
                    end: formData.workingHoursEnd
                },
                clinicAddress: formData.clinicAddress
            };

            const res = await api.post('/auth/register', payload);
            
            // Store doctor auth in auth store
            const { user, token } = res.data.data;
            setAuth(user, token);
            
            alert('✅ Doctor registered successfully! You are now logged in.');
            if (onSuccess) onSuccess(res.data.data);
            if (onClose) onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            overflowY: 'auto'
        }}>
            <div className="card" style={{ 
                width: '100%', 
                maxWidth: '700px', 
                padding: '2rem',
                position: 'relative',
                margin: '2rem auto',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '0.5rem'
                    }}
                >
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem'
                    }}>
                        <Stethoscope size={30} color="#fff" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Register as Doctor
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Set up your profile and availability
                    </p>
                </div>

                {error && (
                    <div style={{ 
                        background: '#fee', 
                        border: '1px solid #fcc', 
                        padding: '0.75rem', 
                        borderRadius: '8px',
                        color: '#c00',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {/* Personal Info */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155' }}>
                                Personal Information
                            </h3>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <User size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Full Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Dr. Rajesh Kumar"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Mail size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="doctor@clinic.com"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Lock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Password *
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                placeholder="Min 6 characters"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Phone size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Phone
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="9876543210"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        {/* Professional Info */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155' }}>
                                Professional Details
                            </h3>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Stethoscope size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Specialization *
                            </label>
                            <select
                                name="specialization"
                                value={formData.specialization}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="">Select Specialization</option>
                                <option value="General Physician">General Physician</option>
                                <option value="Cardiologist">Cardiologist</option>
                                <option value="Dermatologist">Dermatologist</option>
                                <option value="Pediatrician">Pediatrician</option>
                                <option value="Orthopedic">Orthopedic</option>
                                <option value="Gynecologist">Gynecologist</option>
                                <option value="ENT Specialist">ENT Specialist</option>
                                <option value="Neurologist">Neurologist</option>
                                <option value="Dentist">Dentist</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Award size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Qualification
                            </label>
                            <input
                                type="text"
                                name="qualification"
                                value={formData.qualification}
                                onChange={handleChange}
                                placeholder="MBBS, MD"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Experience (Years)
                            </label>
                            <input
                                type="number"
                                name="experience"
                                value={formData.experience}
                                onChange={handleChange}
                                min="0"
                                placeholder="10"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                Consultation Fee (₹)
                            </label>
                            <input
                                type="number"
                                name="consultationFee"
                                value={formData.consultationFee}
                                onChange={handleChange}
                                min="0"
                                placeholder="500"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        {/* Working Schedule */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155' }}>
                                Working Schedule
                            </h3>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Calendar size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Working Days (From)
                            </label>
                            <select
                                name="workingDaysStart"
                                value={formData.workingDaysStart}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                {weekDays.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Calendar size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Working Days (To)
                            </label>
                            <select
                                name="workingDaysEnd"
                                value={formData.workingDaysEnd}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                {weekDays.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Working Hours (Start) *
                            </label>
                            <input
                                type="time"
                                name="workingHoursStart"
                                value={formData.workingHoursStart}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Working Hours (End) *
                            </label>
                            <input
                                type="time"
                                name="workingHoursEnd"
                                value={formData.workingHoursEnd}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Time per Patient (minutes) *
                            </label>
                            <select
                                name="patientDuration"
                                value={formData.patientDuration}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="5">5 minutes</option>
                                <option value="10">10 minutes</option>
                                <option value="15">15 minutes</option>
                                <option value="20">20 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">60 minutes</option>
                            </select>
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                <MapPin size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Clinic Address
                            </label>
                            <textarea
                                name="clinicAddress"
                                value={formData.clinicAddress}
                                onChange={handleChange}
                                placeholder="123 Medical Street, City"
                                rows={2}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={{ 
                        background: '#f8fafc', 
                        border: '2px solid #e2e8f0', 
                        borderRadius: '8px', 
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.85rem',
                        color: '#475569'
                    }}>
                        <strong>Preview: </strong>
                        Working {getWorkingDaysRange().join(', ')} from {formData.workingHoursStart} to {formData.workingHoursEnd}. 
                        Each patient gets {formData.patientDuration} minutes.
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            type="button"
                            className="btn btn-secondary" 
                            onClick={onClose}
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="btn btn-primary" 
                            disabled={loading}
                            style={{ flex: 1, background: '#3b82f6' }}
                        >
                            {loading ? 'Registering...' : 'Register Doctor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
