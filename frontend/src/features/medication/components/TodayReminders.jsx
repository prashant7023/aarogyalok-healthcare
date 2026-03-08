/**
 * components/TodayReminders.jsx
 * 
 * Shows today's scheduled reminder logs with taken/skipped action buttons.
 * Data comes from GET /api/medication/reminders/today via useMedications hook.
 */
import { Check, X, Clock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const STATUS = {
    pending: { label: 'Pending', badge: 'badge badge-yellow', Icon: Clock, bgRow: '#fffbeb' },
    taken: { label: 'Taken', badge: 'badge badge-green', Icon: CheckCircle2, bgRow: '#f0fdf4' },
    skipped: { label: 'Skipped', badge: 'badge badge-gray', Icon: X, bgRow: '#f8fafc' },
    missed: { label: 'Missed', badge: 'badge badge-red', Icon: AlertCircle, bgRow: '#fef2f2' },
};

export default function TodayReminders({ reminders, onRespond, onRefresh }) {
    if (!reminders.length) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, color: '#334155' }}>No reminders scheduled for today</div>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Add a medication above to get started.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.2rem' }}>Today's Schedule</h2>
                <button onClick={onRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {reminders.map((r) => {
                    const s = STATUS[r.status] || STATUS.pending;
                    const StatusIcon = s.Icon;
                    const isPending = r.status === 'pending';

                    return (
                        <div key={r._id} style={{
                            display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                            background: s.bgRow, padding: '1rem 1.25rem',
                            borderRadius: '12px', border: '1px solid #e2e8f0',
                            transition: 'all .15s',
                        }}>
                            {/* Time */}
                            <div style={{ textAlign: 'center', minWidth: '52px', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                                    {new Date(r.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '2px' }}>{r.medicineName}</div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{r.dosage}</div>
                            </div>

                            {/* Status badge */}
                            <span className={s.badge} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                <StatusIcon size={13} /> {s.label}
                            </span>

                            {/* Action buttons — only for pending */}
                            {isPending && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => onRespond(r._id, 'taken')}
                                        style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Check size={14} /> Taken
                                    </button>
                                    <button onClick={() => onRespond(r._id, 'skipped')}
                                        style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <X size={14} /> Skip
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
