/**
 * MedicationPage.jsx
 *
 * Entry page for the medication feature.
 * All socket + API logic is contained within this feature folder:
 *   hooks/useMedications.js        — REST API calls
 *   hooks/useMedicationSocket.js   — Socket.IO real-time reminders
 *   components/ReminderToast.jsx   — Floating reminder popup
 *   components/TodayReminders.jsx  — Today's reminder list
 *   components/AdherenceStats.jsx  — 7-day adherence ring chart
 *
 * Nothing is added to App.jsx, main.jsx, or AppLayout.jsx.
 */
import { useState, useCallback } from 'react';
import { Pill, Check, Clock, X, Plus, Calendar, Activity, Trash2, Bell } from 'lucide-react';

import { useMedications } from './hooks/useMedications';
import { useMedicationSocket } from './hooks/useMedicationSocket';
import ReminderToast from './components/ReminderToast';
import TodayReminders from './components/TodayReminders';
import AdherenceStats from './components/AdherenceStats';
import AddMedicationModal from './components/AddMedicationModal';
import './medication.css';


/* ---------- Single medication card ---------- */
function MedCard({ med, onDelete }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1.25rem 1.5rem' }}>
            <div style={{ background: 'var(--primary-soft)', width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pill size={22} color="var(--primary)" />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '3px' }}>{med.medicineName}</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-mid)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} color="var(--text-light)" /> {med.scheduleTimes?.join(', ')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={14} color="var(--text-light)" /> {med.dosage}</span>
                </div>
            </div>
            <button onClick={() => onDelete(med._id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: 'var(--danger)' }}
                title="Remove medication">
                <Trash2 size={18} />
            </button>
        </div>
    );
}

/* ---------- Main page ---------- */
export default function MedicationPage() {
    const {
        meds, todayReminders, adherence, loading, error,
        addMedication, deleteMedication, respondToReminder,
        addIncomingReminder, refetchReminders,
    } = useMedications();

    // Active toasts (real-time reminders from socket)
    const [toasts, setToasts] = useState([]);

    // Called when socket fires a reminder
    const handleSocketReminder = useCallback((data) => {
        addIncomingReminder(data);
        setToasts((prev) => {
            const exists = prev.find((t) => t.reminderId === data.reminderId);
            if (exists) return prev;
            return [...prev.slice(-4), data]; // max 5 stacked
        });
    }, [addIncomingReminder]);

    // Socket connection — self-contained, no parent changes needed
    useMedicationSocket({ onReminder: handleSocketReminder });

    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('today'); // 'today' | 'active'

    const handleRespond = async (reminderId, status) => {
        await respondToReminder(reminderId, status);
        setToasts((prev) => prev.filter((t) => (t.reminderId || t._id) !== reminderId));
    };

    const dismissToast = (reminderId) => {
        setToasts((prev) => prev.filter((t) => (t.reminderId || t._id) !== reminderId));
    };

    // Snooze: remove from queue now, re-add after SNOOZE_MINUTES
    const handleSnooze = useCallback((reminder) => {
        const id = reminder.reminderId || reminder._id;
        setToasts((prev) => prev.filter((t) => (t.reminderId || t._id) !== id));
        const snoozeMs = parseInt(import.meta.env.VITE_SNOOZE_MINUTES || '5', 10) * 60 * 1000;
        setTimeout(() => {
            setToasts((prev) => {
                // Only re-add if not already responded
                const exists = prev.find((t) => (t.reminderId || t._id) === id);
                if (exists) return prev;
                return [...prev.slice(-4), { ...reminder, _snoozed: true }];
            });
        }, snoozeMs);
    }, []);

    // Summary counts from today's reminders
    const counts = {
        total: meds.length,
        taken: todayReminders.filter((r) => r.status === 'taken').length,
        pending: todayReminders.filter((r) => r.status === 'pending').length,
        missed: todayReminders.filter((r) => r.status === 'missed').length,
    };

    return (
        <div className="fade-in med-page">
            <div className="page-header">
                <div>
                    <h1>Medication Reminder</h1>
                    <p>Track scheduled doses, daily adherence, and missed medication patterns.</p>
                </div>
                <div className="med-header-actions">
                    {toasts.length > 0 && (
                        <span style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '999px', padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #ffd3df' }}>
                            <Bell size={12} /> {toasts.length}
                        </span>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
                        {showForm ? <><X size={15} /> Close</> : <><Plus size={15} /> Add Medication</>}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: 'var(--danger-soft)', color: '#a32043', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Adherence ring */}
            <AdherenceStats adherence={adherence} />

            {/* Compact auto-fitting stat row */}
            <div className="med-stats-grid">
                {[
                    { icon: Pill, label: 'Active Meds', val: counts.total, bg: 'var(--primary-soft)', col: 'var(--primary)' },
                    { icon: Check, label: 'Taken Today', val: counts.taken, bg: 'var(--success-soft)', col: 'var(--success)' },
                    { icon: Clock, label: 'Pending', val: counts.pending, bg: 'var(--warning-soft)', col: 'var(--warning)' },
                    { icon: X, label: 'Missed', val: counts.missed, bg: 'var(--danger-soft)', col: 'var(--danger)' },
                ].map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} style={{
                            background: '#fff', border: '1px solid var(--border)',
                            borderRadius: '10px', padding: '0.7rem 0.9rem',
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                        }}>
                            <div style={{ width: 34, height: 34, borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon size={16} color={s.col} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1 }}>{s.val}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '1px', fontWeight: 600 }}>{s.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Slide-in drawer modal */}
            <AddMedicationModal
                open={showForm}
                onClose={() => setShowForm(false)}
                onAdd={addMedication}
                loading={loading}
            />

            {/* Tabs */}
            <div className="med-tabs">
                {[
                    { key: 'today', label: "Today's Reminders", icon: Calendar },
                    { key: 'active', label: 'Active Medications', icon: Pill },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '5px',
                                fontSize: '0.8rem', fontWeight: 600,
                                background: activeTab === tab.key ? '#fff' : 'transparent',
                                color: activeTab === tab.key ? 'var(--text-dark)' : 'var(--text-mid)',
                                boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
                                transition: 'all .15s',
                            }}>
                            <Icon size={13} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            {activeTab === 'today' && (
                <TodayReminders
                    reminders={todayReminders}
                    onRespond={handleRespond}
                    onRefresh={refetchReminders}
                />
            )}

            {activeTab === 'active' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {meds.length === 0 ? (
                        <div className="med-empty">
                            <Pill size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <div style={{ fontWeight: 600 }}>No active medications</div>
                            <p>Click "Add Medication" to create your first schedule.</p>
                        </div>
                    ) : (
                        meds.map((med) => <MedCard key={med._id} med={med} onDelete={deleteMedication} />)
                    )}
                </div>
            )}

            {/* Real-time reminder toasts — fixed bottom-right */}
            <ReminderToast
                reminders={toasts}
                onRespond={handleRespond}
                onDismiss={dismissToast}
                onSnooze={handleSnooze}
            />
        </div>
    );
}
