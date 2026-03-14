import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, DollarSign, MapPin, ArrowLeft, Navigation } from 'lucide-react';
import api from '../../shared/utils/api';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../auth/authStore';
import MapboxLocationPicker from './MapboxLocationPicker';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function CreateAppointment() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [formData, setFormData] = useState({
        title: '',
        specialization: user?.specialization || '',
        appointmentDate: '',
        price: user?.consultationFee ? String(user.consultationFee) : '',
        address: user?.clinicAddress || '',
        scheduleStartTime: user?.workingHours?.start || '09:00',
        consultationDurationMinutes: user?.patientDuration ? String(user.patientDuration) : '10'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationPickerOpen, setLocationPickerOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [locatingCurrent, setLocatingCurrent] = useState(false);

    useEffect(() => {
        if (!formData.consultationDurationMinutes) {
            setFormData((prev) => ({ ...prev, consultationDurationMinutes: '10' }));
        }
    }, [formData.consultationDurationMinutes]);

    const resolveAddressFromCoordinates = async (longitude, latitude) => {
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`
            );
            const data = await response.json();
            return data?.features?.[0]?.place_name || '';
        } catch {
            return '';
        }
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported in this browser.');
            return;
        }

        setLocatingCurrent(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const address = await resolveAddressFromCoordinates(longitude, latitude);

                const picked = {
                    latitude,
                    longitude,
                    address: address || formData.address || 'Current location',
                };

                setSelectedLocation(picked);
                if (address) {
                    setFormData((prev) => ({ ...prev, address }));
                }
                setLocatingCurrent(false);
            },
            () => {
                setLocatingCurrent(false);
                alert('Unable to fetch your current location.');
            },
            { enableHighAccuracy: true, timeout: 12000 }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setLoading(true);
        setError('');

        try {
            await api.post('/queue/appointments', {
                title: formData.title,
                specialization: formData.specialization,
                appointmentDate: formData.appointmentDate,
                price: parseInt(formData.price),
                address: formData.address,
                scheduleStartTime: formData.scheduleStartTime,
                consultationDurationMinutes: parseInt(formData.consultationDurationMinutes),
                locationLatitude: selectedLocation?.latitude,
                locationLongitude: selectedLocation?.longitude,
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
                    Set up your token queue schedule for a selected date
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

                            <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    style={{
                                        border: '1px solid #dbeafe',
                                        background: '#ebf4ff',
                                        color: '#005bd3',
                                        borderRadius: '8px',
                                        padding: '0.45rem 0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                    }}
                                >
                                    <Navigation size={13} /> {locatingCurrent ? 'Locating...' : 'Use Current Location'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLocationPickerOpen(true)}
                                    style={{
                                        border: '1px solid #e1e3e5',
                                        background: '#fff',
                                        color: '#303030',
                                        borderRadius: '8px',
                                        padding: '0.45rem 0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                    }}
                                >
                                    <MapPin size={13} /> Choose Location on Map
                                </button>
                            </div>

                            {selectedLocation && (
                                <div style={{ marginTop: '0.6rem', background: '#f8fafc', border: '1px solid #e1e3e5', borderRadius: '8px', padding: '0.55rem 0.7rem', fontSize: '0.76rem', color: '#334155' }}>
                                    <div style={{ fontWeight: 700, color: '#005bd3', marginBottom: '0.15rem' }}>Selected map location</div>
                                    <div>{selectedLocation.address}</div>
                                    <div style={{ color: '#64748b' }}>
                                        Lat: {selectedLocation.latitude.toFixed(5)} | Lng: {selectedLocation.longitude.toFixed(5)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Queue Configuration */}
                    <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={18} color="#3b82f6" />
                            Queue Configuration
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                    Schedule Start Time *
                                </label>
                                <input
                                    type="time"
                                    className="input"
                                    value={formData.scheduleStartTime}
                                    onChange={(e) => setFormData({...formData, scheduleStartTime: e.target.value})}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                    Consultation Time Per Patient *
                                </label>
                                <select
                                    className="input"
                                    value={formData.consultationDurationMinutes}
                                    onChange={(e) => setFormData({...formData, consultationDurationMinutes: e.target.value})}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                                >
                                    <option value="5">5 min</option>
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

            <MapboxLocationPicker
                open={locationPickerOpen}
                token={MAPBOX_TOKEN}
                initialLocation={selectedLocation}
                title="Pick Clinic / Hospital Location"
                onClose={() => setLocationPickerOpen(false)}
                onConfirm={(location) => {
                    setSelectedLocation(location);
                    if (location.address) {
                        setFormData((prev) => ({ ...prev, address: location.address }));
                    }
                    setLocationPickerOpen(false);
                }}
            />
        </div>
    );
}
