/**
 * components/ReminderToast.jsx
 *
 * Enhanced real-time reminder notification with:
 * - Live countdown timer (auto-dismiss after 30s)
 * - Progress bar showing time remaining
 * - Snooze button — re-fires after VITE_SNOOZE_MINUTES (default 5)
 * - Taken / Skip actions
 * - Premium dark glassmorphism design
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, X, Clock, AlarmClock } from 'lucide-react';
import { playReminderChime, playSnoozeSound, playTakenSound } from '../utils/notificationSound';

const SNOOZE_MINUTES = parseInt(import.meta.env.VITE_SNOOZE_MINUTES || '5', 10);
const AUTO_DISMISS_SEC = 30;

function SingleToast({ reminder, onRespond, onDismiss, onSnooze }) {
    const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SEC);
    const id = reminder.reminderId || reminder._id;

    // Play chime when this toast first mounts
    useEffect(() => {
        playReminderChime();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Countdown + auto-dismiss
    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(interval);
                    onDismiss(id);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [id, onDismiss]);

    const progress = (secondsLeft / AUTO_DISMISS_SEC) * 100;
    const progressColor = secondsLeft > 15 ? '#3b82f6' : secondsLeft > 7 ? '#f59e0b' : '#ef4444';

    return (
        <div
            className="fade-in"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#fff',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Progress bar at top */}
            <div style={{ height: '3px', background: 'rgba(255,255,255,.1)', position: 'relative' }}>
                <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${progress}%`,
                    background: progressColor,
                    transition: 'width 1s linear, background .3s',
                    borderRadius: '999px',
                }} />
            </div>

            <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Pulsing bell icon */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                            position: 'absolute', inset: '-4px',
                            borderRadius: '50%',
                            background: 'rgba(59,130,246,.25)',
                            animation: 'pulse 2s ease-in-out infinite',
                        }} />
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            borderRadius: '50%', width: 38, height: 38,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', zIndex: 1,
                        }}>
                            <Bell size={17} color="#fff" />
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '1px' }}>
                            Medication Reminder
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} />
                            {new Date(reminder.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            <span style={{ color: '#475569', margin: '0 2px' }}>·</span>
                            <span style={{ color: secondsLeft <= 7 ? '#ef4444' : '#64748b' }}>
                                {secondsLeft}s
                            </span>
                        </div>
                    </div>

                    {/* Dismiss */}
                    <button onClick={() => onDismiss(id)}
                        style={{
                            background: 'rgba(255,255,255,.07)', border: 'none', borderRadius: '50%',
                            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#64748b', flexShrink: 0, transition: 'all .15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.07)'}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Medicine info */}
                <div style={{
                    background: 'rgba(255,255,255,.06)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    border: '1px solid rgba(255,255,255,.07)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                    <div style={{ fontSize: '1.5rem' }}>💊</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f1f5f9', lineHeight: 1.2 }}>
                            {reminder.medicineName}
                        </div>
                        {reminder.dosage && (
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                                {reminder.dosage}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Taken */}
                    <button onClick={() => { playTakenSound(); onRespond(id, 'taken'); }}
                        style={{
                            flex: 1, padding: '0.65rem 0.5rem', borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', fontWeight: 700, cursor: 'pointer',
                            fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            boxShadow: '0 4px 12px rgba(16,185,129,.3)',
                            transition: 'transform .1s, box-shadow .1s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,185,129,.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,.3)'; }}
                    >
                        <Check size={14} /> Taken
                    </button>

                    {/* Snooze */}
                    <button onClick={() => { playSnoozeSound(); onSnooze(reminder); }}
                        style={{
                            flex: 1, padding: '0.65rem 0.5rem', borderRadius: '10px',
                            border: '1px solid rgba(251,191,36,.3)',
                            background: 'rgba(251,191,36,.1)',
                            color: '#fbbf24', fontWeight: 700, cursor: 'pointer',
                            fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            transition: 'all .15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,.18)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,.1)'; }}
                    >
                        <AlarmClock size={14} /> {SNOOZE_MINUTES}m
                    </button>

                    {/* Skip */}
                    <button onClick={() => onRespond(id, 'skipped')}
                        style={{
                            flex: 1, padding: '0.65rem 0.5rem', borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,.1)',
                            background: 'rgba(255,255,255,.05)',
                            color: '#94a3b8', fontWeight: 600, cursor: 'pointer',
                            fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            transition: 'all .15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; }}
                    >
                        <X size={14} /> Skip
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ReminderToast({ reminders, onRespond, onDismiss, onSnooze }) {
    if (!reminders.length) return null;

    const isMobileSmall = window.innerWidth < 480;

    // Portal renders directly on document.body — escapes any scrollable
    // stacking context so position:fixed is always viewport-relative
    return createPortal(
        <div style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: isMobileSmall ? '0.75rem' : '1.5rem',
            left: isMobileSmall ? '0.75rem' : 'auto',
            display: 'flex', flexDirection: 'column-reverse', gap: '0.75rem',
            zIndex: 9999, width: '100%', maxWidth: '360px',
            pointerEvents: 'none', // let clicks pass through the wrapper
        }}>
            {reminders.map((r) => (
                <div key={r.reminderId || r._id} style={{ pointerEvents: 'auto' }}>
                    <SingleToast
                        reminder={r}
                        onRespond={onRespond}
                        onDismiss={onDismiss}
                        onSnooze={onSnooze}
                    />
                </div>
            ))}
        </div>,
        document.body
    );
}

export { SNOOZE_MINUTES };
