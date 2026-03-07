import { useState, useEffect } from 'react';
import api from '../../shared/utils/api';
import useAuthStore from '../auth/authStore';
import { Users, Timer, CheckCircle2, Ticket, User as UserIcon, Bell, Megaphone, RefreshCw, Building2 } from 'lucide-react';

const MOCK_QUEUE = [
    { tokenNumber: 17, name: 'Ramesh Kumar', status: 'serving' },
    { tokenNumber: 18, name: 'Priya Mehta', status: 'waiting' },
    { tokenNumber: 19, name: 'Suresh Patel', status: 'waiting' },
    { tokenNumber: 20, name: 'Anita Singh', status: 'waiting' },
    { tokenNumber: 21, name: 'Vikram Gupta', status: 'waiting' },
];

export default function QueuePage() {
    const { user } = useAuthStore();
    const role = user?.role || 'patient';
    // Doctor/Hospital fixed scope
    const isDoc = role === 'doctor' || role === 'admin';
    const [hospitalId] = useState('hospital_001');
    const [queue, setQueue] = useState(MOCK_QUEUE);
    const [myToken, setMyToken] = useState(null);
    const [issuing, setIssuing] = useState(false);

    useEffect(() => {
        api.get(`/queue/status/${hospitalId}`).then(r => { if (r.data.data?.length) setQueue(r.data.data); }).catch(() => { });
        if (!isDoc) {
            api.get('/queue/my-token').then(r => { if (r.data.data) setMyToken(r.data.data); }).catch(() => { });
        }
    }, [hospitalId, isDoc]);

    const getToken = async () => {
        setIssuing(true);
        try {
            const res = await api.post('/queue/token', { hospitalId });
            setMyToken(res.data.data);
        } catch (e) { alert(e.response?.data?.message || 'Failed'); }
        finally { setIssuing(false); }
    };

    const callNext = async () => {
        try {
            await api.patch('/queue/next', { hospitalId });
            const r = await api.get(`/queue/status/${hospitalId}`);
            setQueue(r.data.data);
        } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    };

    const serving = queue.find(q => q.status === 'serving');
    const waiting = queue.filter(q => q.status === 'waiting').length;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1>Queue Management</h1>
                    <p>Real-time token tracking and clinical flow.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
                {[
                    { icon: Building2, label: 'Currently Serving', value: serving ? `#${serving.tokenNumber}` : '—', bg: '#dbeafe', col: '#2563eb' },
                    { icon: Timer, label: 'Avg. Turnaround', value: '~12 mins', bg: '#d1fae5', col: '#059669' },
                    { icon: Users, label: 'Waiting', value: `${waiting}`, bg: '#fef3c7', col: '#d97706' },
                    { icon: CheckCircle2, label: 'Completed Today', value: '16', bg: '#fce7f3', col: '#db2777' },
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-icon" style={{ background: s.bg, color: s.col }}><Icon size={24} /></div>
                            <div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
                        </div>
                    )
                })}
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: myToken || isDoc ? '1fr 1.5fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Token Area / Doctor Panel */}
                <div>
                    {!isDoc ? (
                        <div className="card" style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '2.5rem 2rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '.05em', marginBottom: '1.5rem' }}>
                                <span className="pulse" style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                                LIVE STATUS
                            </div>

                            {myToken ? (
                                <>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Your Token</div>
                                    <div style={{ fontSize: '5rem', fontWeight: 800, margin: '0.5rem 0', lineHeight: 1, letterSpacing: '-.05em' }}>{myToken.tokenNumber}</div>
                                    <div style={{ fontSize: '1rem', color: '#cbd5e1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                                        <Timer size={16} /> Est. Wait: ~18 mins
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>You haven't requested a queue token for today.</p>
                                    <button className="btn btn-primary" onClick={getToken} disabled={issuing} style={{ background: '#3b82f6', color: '#fff', padding: '0.8rem 2rem', fontSize: '1rem' }}>
                                        <Ticket size={18} /> {issuing ? 'Generating...' : 'Get Queue Token'}
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '2rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                                <Users size={20} /> Provider Console
                            </h3>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '.05em' }}>Currently Serving</div>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a' }}>#{serving?.tokenNumber || '—'}</div>
                            </div>
                            <button className="btn btn-primary" onClick={callNext} style={{ width: '100%', padding: '1rem', fontSize: '1rem', background: '#3b82f6' }}>
                                <Megaphone size={18} /> Call Next Patient
                            </button>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Current Queue</h3>
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', background: '#d1fae5', padding: '0.3rem 0.6rem', borderRadius: '999px' }}>
                            <RefreshCw size={12} /> Syncing
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '450px', overflowY: 'auto' }}>
                        {queue.map((q, idx) => {
                            const isActive = q.status === 'serving';
                            const isMe = q.tokenNumber === myToken?.tokenNumber;
                            return (
                                <div key={q.tokenNumber} style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem',
                                    background: isActive ? '#eff6ff' : '#fff',
                                    borderBottom: idx === queue.length - 1 ? 'none' : '1px solid var(--border)'
                                }}>
                                    <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: isActive ? '#2563eb' : '#f1f5f9', color: isActive ? '#fff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                                        {q.tokenNumber}
                                    </div>
                                    <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: isMe ? 700 : 500, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <UserIcon size={16} color="#94a3b8" /> {q.name || 'Patient'} {isMe && <span style={{ fontSize: '0.7rem', background: '#2563eb', color: '#fff', padding: '2px 6px', borderRadius: '999px', marginLeft: '4px' }}>You</span>}
                                    </div>
                                    <span className={isActive ? 'badge badge-green' : 'badge badge-gray'} style={{ fontSize: '0.75rem' }}>
                                        {isActive ? 'In Room' : 'Waiting'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
