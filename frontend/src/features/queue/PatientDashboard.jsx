import { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, MapPin, Users, Filter, BookOpen, RefreshCw, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../shared/utils/api';

export default function PatientDashboard() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({ specialization: '', fromDate: '' });

    useEffect(() => {
        fetchAppointments();
    }, [filter]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter.specialization) params.append('specialization', filter.specialization);
            if (filter.fromDate) params.append('fromDate', filter.fromDate);
            
            const res = await api.get(`/queue/appointments?${params.toString()}`);
            setAppointments(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch appointments:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleBookSlot = (appointment) => {
        navigate('/queue/book', { state: { appointment } });
    };

    // Group appointments by date
    const groupedAppointments = appointments.reduce((acc, apt) => {
        const date = new Date(apt.appointmentDate).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(apt);
        return acc;
    }, {});

    // Stats
    const stats = {
        total: appointments.length,
        specializations: [...new Set(appointments.map(a => a.specialization))].length,
        availableSlots: appointments.reduce((sum, apt) => sum + (apt.totalSlots - apt.bookedSlots), 0)
    };

    return (
        <div className="fade-in">
            {/* Compact Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Available Appointments</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchAppointments} disabled={loading}
                        style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #e2e8f0' }}>
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button onClick={() => navigate('/queue/my-appointments')}
                        style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <BookOpen size={13} /> My Appointments
                    </button>
                </div>
            </div>

            {/* Stats Banner */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
                borderRadius: '12px', padding: '0.85rem 1.25rem',
                marginBottom: '1rem', flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: 1 }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Appointments</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stats.total}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Specializations</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>{stats.specializations}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Available Slots</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{stats.availableSlots}</div>
                    </div>
                </div>
                <div style={{ padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stethoscope size={16} color="#60a5fa" />
                    <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>Find Doctor</span>
                </div>
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Filter size={14} color="#3b82f6" />
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Filters</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                            Specialization
                        </label>
                        <select
                            className="input"
                            value={filter.specialization}
                            onChange={(e) => setFilter({...filter, specialization: e.target.value})}
                        >
                            <option value="">All Specializations</option>
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
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                            From Date
                        </label>
                        <input
                            type="date"
                            className="input"
                            value={filter.fromDate}
                            onChange={(e) => setFilter({...filter, fromDate: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* Appointments List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#fff', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                    <Clock size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Loading...</div>
                </div>
            ) : Object.keys(groupedAppointments).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', background: '#fff', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                    <Calendar size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>No appointments available</div>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Check back later for new appointments.</p>
                </div>
            ) : (
                Object.entries(groupedAppointments)
                    .sort((a, b) => new Date(appointments.find(apt => new Date(apt.appointmentDate).toLocaleDateString() === a[0]).appointmentDate) - 
                                    new Date(appointments.find(apt => new Date(apt.appointmentDate).toLocaleDateString() === b[0]).appointmentDate))
                    .map(([date, apts]) => (
                        <div key={date} style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: 700, 
                                marginBottom: '0.75rem', 
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                <Calendar size={14} color="#94a3b8" />
                                {date}
                            </h2>
                            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                {apts.map((apt, idx) => {
                                    const availableCount = apt.totalSlots - apt.bookedSlots;
                                    const isFullyBooked = availableCount <= 0;
                                    
                                    return (
                                        <div 
                                            key={apt._id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                                                padding: '1rem 1.25rem',
                                                borderBottom: idx < apts.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                transition: 'background .15s',
                                                opacity: isFullyBooked ? 0.6 : 1
                                            }}
                                            onMouseEnter={(e) => !isFullyBooked && (e.currentTarget.style.background = '#f8fafc')}
                                            onMouseLeave={(e) => e.currentTarget.style.background = ''}
                                        >
                                            {/* Doctor avatar */}
                                            <div style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: '1.1rem',
                                                color: 'white',
                                                flexShrink: 0
                                            }}>
                                                {apt.doctorId?.name?.charAt(0) || 'D'}
                                            </div>

                                            {/* Main content */}
                                            <div style={{ flex: 1, minWidth: 200 }}>
                                                <div style={{ marginBottom: '0.35rem' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.15rem' }}>
                                                        {apt.title}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                        Dr. {apt.doctorId?.name || 'Unknown'} • {apt.specialization}
                                                    </div>
                                                </div>

                                                {/* Details row */}
                                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <DollarSign size={12} color="#94a3b8" />
                                                        ₹{apt.price}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: isFullyBooked ? '#dc2626' : '#10b981' }}>
                                                        <Clock size={12} color={isFullyBooked ? '#dc2626' : '#10b981'} />
                                                        {availableCount} slot{availableCount !== 1 ? 's' : ''} available
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <MapPin size={12} color="#94a3b8" />
                                                        {apt.address}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Book button */}
                                            <button 
                                                onClick={() => handleBookSlot(apt)}
                                                disabled={isFullyBooked}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '0.5rem 1rem',
                                                    background: isFullyBooked ? '#f1f5f9' : '#3b82f6',
                                                    color: isFullyBooked ? '#94a3b8' : '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    cursor: isFullyBooked ? 'not-allowed' : 'pointer',
                                                    flexShrink: 0,
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isFullyBooked) {
                                                        e.target.style.background = '#2563eb';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isFullyBooked) {
                                                        e.target.style.background = '#3b82f6';
                                                    }
                                                }}
                                            >
                                                <Users size={13} />
                                                {isFullyBooked ? 'Fully Booked' : 'Book Now'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
            )}
        </div>
    );
}
