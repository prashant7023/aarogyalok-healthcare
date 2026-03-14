import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, MapPin, Users, Filter, BookOpen, RefreshCw, Stethoscope, Navigation, Star, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../shared/utils/api';

export default function PatientDashboard() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({ specialization: '', fromDate: '', doctorSearch: '' });

    useEffect(() => {
        fetchAppointments();
    }, [filter]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter.specialization) params.append('specialization', filter.specialization);
            if (filter.fromDate) params.append('fromDate', filter.fromDate);
            if (filter.doctorSearch?.trim()) params.append('doctorSearch', filter.doctorSearch.trim());
            
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
        totalIssuedTokens: appointments.reduce((sum, apt) => sum + (apt.totalTokensIssued || 0), 0)
    };

    const specializationOptions = useMemo(() => {
        return [...new Set(appointments.map((a) => String(a.specialization || '').trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
    }, [appointments]);

    return (
        <div className="fade-in">
            {/* Compact Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Available Appointments</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchAppointments} disabled={loading}
                        style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: '#fff', color: '#616161', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #e1e3e5' }}>
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button onClick={() => navigate('/queue/map-search')}
                        style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #dbeafe', background: '#ebf4ff', color: '#005bd3', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Navigation size={13} /> Find Nearby Doctors on Map
                    </button>
                    <button onClick={() => navigate('/queue/my-appointments')}
                        style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', background: '#005bd3', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <BookOpen size={13} /> My Appointments
                    </button>
                </div>
            </div>

            {/* Stats Banner */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: '#fff',
                border: '1px solid #e1e3e5',
                borderRadius: '12px', padding: '0.85rem 1.25rem',
                marginBottom: '1rem', flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: 1 }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '.05em' }}>Appointments</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#303030', lineHeight: 1 }}>{stats.total}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '.05em' }}>Specializations</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#005bd3', lineHeight: 1 }}>{stats.specializations}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '.05em' }}>Issued Tokens</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#008060', lineHeight: 1 }}>{stats.totalIssuedTokens}</div>
                    </div>
                </div>
                <div style={{ padding: '0.5rem 0.85rem', background: '#ebf4ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stethoscope size={16} color="#005bd3" />
                    <span style={{ fontSize: '0.75rem', color: '#0048a8', fontWeight: 700 }}>Find Doctor</span>
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
                            Doctor Name or Email
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                className="input"
                                placeholder="e.g. Kavya or kavya@email.com"
                                value={filter.doctorSearch}
                                onChange={(e) => setFilter({ ...filter, doctorSearch: e.target.value })}
                                style={{ paddingLeft: '2rem' }}
                            />
                        </div>
                    </div>
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
                            {specializationOptions.map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
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
                            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e1e3e5', overflow: 'hidden' }}>
                                {apts.map((apt, idx) => {
                                    const isBookable = apt.status === 'active';
                                    const aptDate = new Date(apt.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                    const doctorRating = Number(apt?.doctorId?.rating || 0);
                                    const doctorRatingCount = Number(apt?.doctorId?.ratingCount || 0);

                                    return (
                                        <div
                                            key={apt._id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                                                padding: '0.7rem 1rem',
                                                borderBottom: idx < apts.length - 1 ? '1px solid #f1f2f3' : 'none',
                                                transition: 'background .12s',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                                            onMouseLeave={(e) => e.currentTarget.style.background = ''}
                                        >
                                            {/* Avatar */}
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '50%',
                                                background: '#ebf4ff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: '0.95rem',
                                                color: '#005bd3',
                                                flexShrink: 0
                                            }}>
                                                {apt.doctorId?.name?.charAt(0) || apt.doctorName?.charAt(0) || 'D'}
                                            </div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 180 }}>
                                                {/* Title + Doctor */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{apt.title}</span>
                                                    <span style={{ background: '#ebf4ff', color: '#005bd3', padding: '0.1rem 0.45rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.72rem' }}>
                                                        Dr. {apt.doctorId?.name || apt.doctorName || 'Unknown'}
                                                    </span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fff7ed', color: '#b45309', padding: '0.1rem 0.45rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.72rem' }}>
                                                        <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                                        {doctorRating > 0 ? `${doctorRating.toFixed(1)} (${doctorRatingCount})` : 'No ratings'}
                                                    </span>
                                                    <span style={{ fontSize: '0.72rem', color: '#8a8a8a' }}>{apt.specialization}</span>
                                                </div>
                                                {/* Meta row */}
                                                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#8a8a8a', alignItems: 'center' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#005bd3', fontWeight: 600 }}>
                                                        <Calendar size={11} color="#005bd3" />
                                                        {aptDate}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        ₹{apt.price}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#008060', fontWeight: 600 }}>
                                                        <Clock size={11} color="#008060" />
                                                        {apt.consultationDurationMinutes} min
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600, color: '#005bd3' }}>
                                                        <Users size={11} color="#005bd3" />
                                                        Token #{apt.currentTokenNumber || '-'}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <MapPin size={11} color="#94a3b8" />
                                                        {apt.address}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Book button */}
                                            <button
                                                onClick={() => handleBookSlot(apt)}
                                                disabled={!isBookable}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '0.38rem 0.75rem',
                                                    background: isBookable ? '#005bd3' : '#f1f2f3',
                                                    color: isBookable ? '#fff' : '#8a8a8a',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: isBookable ? 'pointer' : 'not-allowed',
                                                    flexShrink: 0,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                <Users size={12} />
                                                {isBookable ? 'Book Token' : 'Unavailable'}
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
