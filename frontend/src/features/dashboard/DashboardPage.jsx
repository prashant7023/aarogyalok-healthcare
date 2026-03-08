import { Link } from 'react-router-dom';
import useAuthStore from '../auth/authStore';
import { Activity, Pill, Users, FileText, User as UserIcon, ArrowRight } from 'lucide-react';

const FEATURE_CARDS = [
    { to: '/symptom', icon: Activity, title: 'AI Symptom Checker', desc: 'Describe symptoms and get instant AI-powered analysis with severity classification.', color: '#dbeafe', stroke: '#2563eb', roles: ['patient', 'doctor', 'admin'] },
    { to: '/medication', icon: Pill, title: 'Medication Reminder', desc: 'Never miss a dose. Track your medication schedule and adherence history.', color: '#d1fae5', stroke: '#059669', roles: ['patient', 'doctor', 'admin'] },
    { to: '/queue', icon: Users, title: 'Queue Management', desc: 'Real-time queue tracking with live token numbers and estimated wait times.', color: '#fef3c7', stroke: '#d97706', roles: ['patient', 'doctor', 'admin'] },
    { to: '/records', icon: FileText, title: 'Health Records', desc: 'Your complete digital health history — diagnoses, prescriptions, lab reports.', color: '#fce7f3', stroke: '#db2777', roles: ['patient', 'doctor', 'admin'] },
];

const STATS = [
    { icon: Users, label: 'Patients Served', value: '50K+', bg: '#dbeafe', color: '#2563eb' },
    { icon: UserIcon, label: 'Doctors', value: '200+', bg: '#d1fae5', color: '#059669' },
    { icon: FileText, label: 'AI Accuracy', value: '98%', bg: '#fef3c7', color: '#d97706' },
    { icon: Activity, label: 'AI Support', value: '24/7', bg: '#fce7f3', color: '#db2777' },
];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const role = user?.role || 'patient';

    const visibleCards = FEATURE_CARDS.filter(c => c.roles.includes(role));

    return (
        <div className="fade-in">
            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: '16px', padding: '2.5rem', marginBottom: '2rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '2rem', top: '1rem', opacity: 0.1 }}>
                    <Activity size={100} color="#fff" />
                </div>
                <span style={{ background: 'rgba(96,165,250,.2)', color: '#93c5fd', fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '999px', letterSpacing: '.05em' }}>India's Smart Healthcare Platform</span>
                <h1 style={{ color: '#fff', marginTop: '1rem', marginBottom: '0.5rem', fontSize: '2.2rem' }}>
                    Hello, <span style={{ color: '#60a5fa' }}>{user?.name?.split(' ')[0] || 'there'}</span> 👋
                </h1>
                <p style={{ color: 'rgba(255,255,255,.6)', maxWidth: '520px', lineHeight: 1.6 }}>
                    AI-powered symptom analysis, smart medication reminders, real-time queue management, and digital health records — all in one place.
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
                {STATS.map(s => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-icon" style={{ background: s.bg, color: s.color }}><Icon size={24} /></div>
                            <div>
                                <div className="stat-value">{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.4rem' }}>Tools & Services</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {visibleCards.map(card => {
                    const Icon = card.icon;
                    return (
                        <Link to={card.to} key={card.to} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ height: '100%', transition: 'all .15s ease', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                            >
                                <div style={{ width: '48px', height: '48px', background: card.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                                    <Icon size={24} color={card.stroke} strokeWidth={2.5} />
                                </div>
                                <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-dark)', fontSize: '1.1rem' }}>{card.title}</h3>
                                <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-light)' }}>{card.desc}</p>

                                <div style={{ marginTop: '1.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
