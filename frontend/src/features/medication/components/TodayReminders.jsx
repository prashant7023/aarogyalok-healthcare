/**
 * components/TodayReminders.jsx — Compact table-style list
 */
import { Check, X, Clock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const STATUS = {
    pending: { label: 'Pending', cls: 'badge badge-yellow', Icon: Clock, dot: '#b98900' },
    taken: { label: 'Taken', cls: 'badge badge-green', Icon: CheckCircle2, dot: '#008060' },
    skipped: { label: 'Skipped', cls: 'badge badge-gray', Icon: X, dot: '#8a8a8a' },
    missed: { label: 'Missed', cls: 'badge badge-red', Icon: AlertCircle, dot: '#c43256' },
};

export default function TodayReminders({ reminders, onRespond, onRefresh }) {
    if (!reminders.length) {
        return (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-light)', background: '#fff', borderRadius: '10px', border: '1px dashed var(--border-strong)' }}>
                <Clock size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-mid)' }}>No reminders today</div>
                <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Add a medication to get started.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Today's Schedule
                </span>
                <button onClick={onRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', transition: 'color .15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-light)'}
                >
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                {reminders.map((r, idx) => {
                    const s = STATUS[r.status] || STATUS.pending;
                    const StatusIcon = s.Icon;
                    const isPending = r.status === 'pending';

                    return (
                        <div key={r._id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                            padding: '0.65rem 1rem',
                            borderBottom: idx < reminders.length - 1 ? '1px solid var(--border)' : 'none',
                            transition: 'background .1s',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = ''}
                        >
                            {/* Status dot */}
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />

                            {/* Time */}
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-mid)', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>
                                {new Date(r.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>

                            {/* Medicine name */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-dark)' }}>{r.medicineName}</span>
                                {r.dosage && <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginLeft: '0.4rem' }}>{r.dosage}</span>}
                            </div>

                            {/* Badge */}
                            <span className={s.cls} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', flexShrink: 0 }}>
                                <StatusIcon size={11} /> {s.label}
                            </span>

                            {/* Actions for pending */}
                            {isPending && (
                                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                                    <button onClick={() => onRespond(r._id, 'taken')}
                                        style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: 'none', background: 'var(--success)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Check size={12} /> Taken
                                    </button>
                                    <button onClick={() => onRespond(r._id, 'skipped')}
                                        style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-mid)', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <X size={12} /> Skip
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
