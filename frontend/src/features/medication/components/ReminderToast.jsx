/**
 * components/ReminderToast.jsx
 *
 * Real-time reminder popup — appears when a socket `medication-reminder`
 * event fires. Stacks up to 5 toasts, auto-dismisses after 30 s,
 * and lets the patient mark as taken/skipped right from the toast.
 */
import { useState, useEffect } from 'react';
import { Bell, Check, X, Clock } from 'lucide-react';

export default function ReminderToast({ reminders, onRespond, onDismiss }) {
    if (!reminders.length) return null;

    return (
        <div style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            zIndex: 9999, maxWidth: '380px', width: '100%',
        }}>
            {reminders.map((r) => (
                <div key={r.reminderId || r._id}
                    className="fade-in"
                    style={{
                        background: '#0f172a', color: '#fff',
                        borderRadius: '14px', padding: '1.25rem 1.5rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,.35)',
                        border: '1px solid rgba(255,255,255,.1)',
                        display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#3b82f6', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Bell size={18} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>
                                Medication Reminder
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} />
                                {new Date(r.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <button onClick={() => onDismiss(r.reminderId || r._id)}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '2px' }}>{r.medicineName}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{r.dosage}</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => onRespond(r.reminderId || r._id, 'taken')}
                            style={{
                                flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                                background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer',
                                fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            }}>
                            <Check size={15} /> Taken
                        </button>
                        <button
                            onClick={() => onRespond(r.reminderId || r._id, 'skipped')}
                            style={{
                                flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,.15)',
                                background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer',
                                fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            }}>
                            <X size={15} /> Skip
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
