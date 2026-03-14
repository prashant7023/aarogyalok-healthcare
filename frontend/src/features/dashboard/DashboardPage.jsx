import { Link } from 'react-router-dom';
import useAuthStore from '../auth/authStore';
import { Activity, Pill, Users, FileText, ArrowRight } from 'lucide-react';

const FEATURE_CARDS = [
    { to: '/symptom', icon: Activity, title: 'AI Symptom Checker', desc: 'Capture patient symptoms with structured triage and severity insights.', roles: ['patient', 'doctor', 'admin'] },
    { to: '/medication', icon: Pill, title: 'Medication Reminder', desc: 'Track active medicines, reminders, and adherence status in one place.', roles: ['patient', 'doctor', 'admin'] },
    { to: '/queue', icon: Users, title: 'Queue Management', desc: 'Manage appointments and token flow with real-time updates.', roles: ['patient', 'doctor', 'admin'] },
    { to: '/records', icon: FileText, title: 'Health Records', desc: 'View longitudinal patient records and uploaded clinical documents.', roles: ['patient', 'doctor', 'admin'] },
];

const STATS = [
    { label: 'Modules Live', value: '4' },
    { label: 'Core Workflows', value: '12+' },
    { label: 'Role Modes', value: '3' },
    { label: 'System Status', value: 'Active' },
];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const role = user?.role || 'patient';

    const visibleCards = FEATURE_CARDS.filter(c => c.roles.includes(role));

    return (
        <div className="fade-in">
            <div className="card" style={{ marginBottom: '1rem', padding: '1.4rem' }}>
                <div className="badge badge-blue" style={{ marginBottom: '0.65rem' }}>ArogyaLok Platform</div>
                <h1 style={{ marginBottom: '0.35rem' }}>
                    Welcome, {user?.name?.split(' ')[0] || 'User'}
                </h1>
                <p style={{ maxWidth: 680 }}>
                    Unified healthcare operations across triage, medication adherence, appointment queueing, and clinical records.
                </p>
                <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>Role: {role}</span>
                    <span className="badge badge-green">MVP Online</span>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
                {STATS.map(s => {
                    return (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value">{s.value}</div>
                        </div>
                    );
                })}
            </div>

            <h2 style={{ marginBottom: '0.8rem' }}>Modules</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
                {visibleCards.map(card => {
                    const Icon = card.icon;
                    return (
                        <Link to={card.to} key={card.to} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ height: '100%', transition: 'all .15s ease', cursor: 'pointer', padding: '1rem 1.1rem' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9cccf'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e1e3e5'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                                    <h3 style={{ color: 'var(--text-dark)', fontSize: '1rem' }}>{card.title}</h3>
                                    <Icon size={16} color="#616161" strokeWidth={2.2} />
                                </div>
                                <p style={{ fontSize: '0.87rem', lineHeight: 1.45, color: 'var(--text-mid)' }}>{card.desc}</p>

                                <div style={{ marginTop: '0.9rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Open {card.title} <ArrowRight size={14} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
