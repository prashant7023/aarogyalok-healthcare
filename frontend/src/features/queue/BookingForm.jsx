import { useState } from 'react';
import { X, User, Calendar, Clock, Phone, FileText, AlertCircle } from 'lucide-react';

export default function BookingForm({ doctor, selectedDate, selectedSlot, onClose, onSubmit, loading }) {
    const [formData, setFormData] = useState({
        patientName: '',
        patientAge: '',
        patientGender: 'Male',
        patientPhone: '',
        diseaseDescription: ''
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        
        if (!formData.patientName.trim()) {
            newErrors.patientName = 'Name is required';
        }
        
        if (!formData.patientAge || formData.patientAge < 1 || formData.patientAge > 120) {
            newErrors.patientAge = 'Valid age is required (1-120)';
        }
        
        if (!formData.diseaseDescription.trim()) {
            newErrors.diseaseDescription = 'Disease description is required';
        } else if (formData.diseaseDescription.trim().length < 10) {
            newErrors.diseaseDescription = 'Please provide at least 10 characters';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
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
            padding: '1rem'
        }}>
            <div className="card" style={{ 
                width: '100%', 
                maxWidth: '550px', 
                padding: '0',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    padding: '1.75rem 2rem',
                    color: '#fff',
                    position: 'relative'
                }}>
                    <button 
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#fff',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                    
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', margin: 0 }}>
                        Book Appointment
                    </h2>
                    <p style={{ opacity: 0.9, fontSize: '0.9rem', margin: 0 }}>
                        Fill your details to confirm booking
                    </p>
                </div>

                {/* Appointment Summary */}
                <div style={{ 
                    padding: '1.5rem 2rem',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                        <div>
                            <div style={{ color: '#64748b', marginBottom: '4px', fontSize: '0.85rem' }}>Doctor</div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{doctor?.name}</div>
                            <div style={{ color: '#3b82f6', fontSize: '0.85rem' }}>{doctor?.specialization}</div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b', marginBottom: '4px', fontSize: '0.85rem' }}>
                                <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Date & Time
                            </div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {new Date(selectedDate).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                            <div style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                                <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                {selectedSlot?.time}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#0f172a' }}>
                        <User size={18} style={{ display: 'inline', marginRight: '8px' }} />
                        Patient Information
                    </h3>

                    {/* Name */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem', 
                            fontSize: '0.9rem', 
                            fontWeight: 600,
                            color: '#334155'
                        }}>
                            Full Name *
                        </label>
                        <input
                            type="text"
                            name="patientName"
                            value={formData.patientName}
                            onChange={handleChange}
                            placeholder="Enter patient's full name"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: `2px solid ${errors.patientName ? '#dc2626' : '#e2e8f0'}`,
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = errors.patientName ? '#dc2626' : '#e2e8f0'}
                        />
                        {errors.patientName && (
                            <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={12} />
                                {errors.patientName}
                            </div>
                        )}
                    </div>

                    {/* Age & Gender */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '0.5rem', 
                                fontSize: '0.9rem', 
                                fontWeight: 600,
                                color: '#334155'
                            }}>
                                Age *
                            </label>
                            <input
                                type="number"
                                name="patientAge"
                                value={formData.patientAge}
                                onChange={handleChange}
                                placeholder="Age"
                                min="1"
                                max="120"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: `2px solid ${errors.patientAge ? '#dc2626' : '#e2e8f0'}`,
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = errors.patientAge ? '#dc2626' : '#e2e8f0'}
                            />
                            {errors.patientAge && (
                                <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} />
                                    {errors.patientAge}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '0.5rem', 
                                fontSize: '0.9rem', 
                                fontWeight: 600,
                                color: '#334155'
                            }}>
                                Gender *
                            </label>
                            <select
                                name="patientGender"
                                value={formData.patientGender}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    background: '#fff'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Phone */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem', 
                            fontSize: '0.9rem', 
                            fontWeight: 600,
                            color: '#334155'
                        }}>
                            Phone Number (Optional)
                        </label>
                        <input
                            type="tel"
                            name="patientPhone"
                            value={formData.patientPhone}
                            onChange={handleChange}
                            placeholder="9876543210"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {/* Disease Description */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem', 
                            fontSize: '0.9rem', 
                            fontWeight: 600,
                            color: '#334155'
                        }}>
                            <FileText size={16} style={{ display: 'inline', marginRight: '6px' }} />
                            Disease Description *
                        </label>
                        <textarea
                            name="diseaseDescription"
                            value={formData.diseaseDescription}
                            onChange={handleChange}
                            placeholder="Describe your symptoms, health concerns, or reason for consultation..."
                            rows={5}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: `2px solid ${errors.diseaseDescription ? '#dc2626' : '#e2e8f0'}`,
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                fontFamily: 'inherit',
                                outline: 'none',
                                resize: 'vertical'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = errors.diseaseDescription ? '#dc2626' : '#e2e8f0'}
                        />
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.25rem',
                            fontSize: '0.8rem'
                        }}>
                            {errors.diseaseDescription ? (
                                <div style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} />
                                    {errors.diseaseDescription}
                                </div>
                            ) : (
                                <div style={{ color: '#64748b' }}>
                                    Minimum 10 characters required
                                </div>
                            )}
                            <div style={{ color: '#64748b' }}>
                                {formData.diseaseDescription.length} characters
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            type="button"
                            className="btn btn-secondary" 
                            onClick={onClose}
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="btn btn-primary" 
                            disabled={loading}
                            style={{ 
                                flex: 1, 
                                background: loading ? '#94a3b8' : '#3b82f6',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Booking...' : 'Confirm Booking'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
