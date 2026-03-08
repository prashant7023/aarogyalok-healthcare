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
import { Pill, Check, Clock, X, Plus, Calendar, Edit3, Activity, Trash2, Bell } from 'lucide-react';

import { useMedications } from './hooks/useMedications';
import { useMedicationSocket } from './hooks/useMedicationSocket';
import ReminderToast from './components/ReminderToast';
import TodayReminders from './components/TodayReminders';
import AdherenceStats from './components/AdherenceStats';

/* ---------- Add medication form ---------- */
function AddMedicationForm({ onAdd, loading }) {
    const [form, setForm] = useState({
        medicineName: '', dosage: '', startDate: '', endDate: ''
    });
    // Multiple time slots as an array
    const [times, setTimes] = useState(['']);

    const addTimeSlot = () => setTimes((t) => [...t, '']);
    const removeTimeSlot = (i) => setTimes((t) => t.filter((_, idx) => idx !== i));
    const updateTime = (i, val) => setTimes((t) => t.map((v, idx) => idx === i ? val : v));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const filledTimes = times.filter(Boolean);
        if (!filledTimes.length) {
            alert('Please add at least one reminder time.');
            return;
        }
        // Pass scheduleTimes as comma string — useMedications hook splits it
        const ok = await onAdd({ ...form, scheduleTimes: filledTimes.join(',') });
        if (ok) {
            setForm({ medicineName: '', dosage: '', startDate: '', endDate: '' });
            setTimes(['']);
        }
    };

    const inputStyle = { color: '#1e40af' };

    return (
        <div className="card fade-in" style={{ marginBottom: '2rem', background: '#eff6ff', border: 'none' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontSize: '1.2rem' }}>
                <Edit3 size={20} /> Setup New Schedule
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1.25rem' }}>

                {/* Medicine Name */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={inputStyle}>Medicine Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="input" required placeholder="e.g. Paracetamol"
                        value={form.medicineName} onChange={(e) => setForm((f) => ({ ...f, medicineName: e.target.value }))} />
                </div>

                {/* Dosage — optional */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={inputStyle}>Dosage <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>(optional)</span></label>
                    <input className="input" placeholder="e.g. 500mg, 10 units"
                        value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))} />
                </div>

                {/* Start Date */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={inputStyle}>Start Date <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="input" type="date" required
                        value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>

                {/* End Date */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={inputStyle}>End Date <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>(optional)</span></label>
                    <input className="input" type="date"
                        value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>

                {/* Reminder Times — multi-slot time picker */}
                <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label style={inputStyle}>Reminder Times <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {times.map((t, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input className="input" type="time" required value={t}
                                    onChange={(e) => updateTime(i, e.target.value)}
                                    style={{ flex: 1, maxWidth: '200px' }} />
                                {times.length > 1 && (
                                    <button type="button" onClick={() => removeTimeSlot(i)}
                                        style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '0.45rem 0.6rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addTimeSlot}
                            style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #93c5fd', borderRadius: '8px', padding: '0.4rem 0.9rem', color: '#2563eb', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <Plus size={14} /> Add another time
                        </button>
                    </div>
                </div>

                {/* Submit */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 0, gridColumn: '1 / -1' }}>
                    <button className="btn btn-primary" type="submit" disabled={loading}
                        style={{ width: '100%', padding: '0.85rem' }}>
                        {loading ? 'Saving...' : 'Save Medication'}
                    </button>
                </div>
            </form>
        </div>
    );
}

/* ---------- Single medication card ---------- */
function MedCard({ med, onDelete }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1.25rem 1.5rem' }}>
            <div style={{ background: '#eff6ff', width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pill size={22} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '3px' }}>{med.medicineName}</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} color="#94a3b8" /> {med.scheduleTimes?.join(', ')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={14} color="#94a3b8" /> {med.dosage}</span>
                </div>
            </div>
            <button onClick={() => onDelete(med._id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: '#ef4444' }}
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
        addIncomingReminder(data); // Add to today's list
        setToasts((prev) => {
            const exists = prev.find((t) => t.reminderId === data.reminderId);
            if (exists) return prev;
            // Auto-dismiss after 30 s
            setTimeout(() => {
                setToasts((t) => t.filter((x) => x.reminderId !== data.reminderId));
            }, 30000);
            return [...prev.slice(-4), data]; // max 5 stacked
        });
    }, [addIncomingReminder]);

    // Socket connection — self-contained, no parent changes needed
    useMedicationSocket({ onReminder: handleSocketReminder });

    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('today'); // 'today' | 'active'

    const handleRespond = async (reminderId, status) => {
        await respondToReminder(reminderId, status);
        setToasts((prev) => prev.filter((t) => t.reminderId !== reminderId));
    };

    const dismissToast = (reminderId) => {
        setToasts((prev) => prev.filter((t) => t.reminderId !== reminderId));
    };

    // Summary counts from today's reminders
    const counts = {
        total: meds.length,
        taken: todayReminders.filter((r) => r.status === 'taken').length,
        pending: todayReminders.filter((r) => r.status === 'pending').length,
        missed: todayReminders.filter((r) => r.status === 'missed').length,
    };

    return (
        <div className="fade-in">
            {/* Page header */}
            <div className="page-header" style={{ alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1>Medication Reminder</h1>
                    <p>Track your daily medications with real-time reminders.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {toasts.length > 0 && (
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Bell size={14} /> {toasts.length} Alert{toasts.length > 1 ? 's' : ''}
                        </span>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
                        {showForm ? <><X size={18} /> Close</> : <><Plus size={18} /> Add Medication</>}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Adherence ring */}
            <AdherenceStats adherence={adherence} />

            {/* Summary stat cards */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                {[
                    { icon: Pill, label: 'Active Meds', val: counts.total, bg: '#eff6ff', col: '#2563eb' },
                    { icon: Check, label: 'Taken Today', val: counts.taken, bg: '#d1fae5', col: '#10b981' },
                    { icon: Clock, label: 'Pending', val: counts.pending, bg: '#fef3c7', col: '#f59e0b' },
                    { icon: X, label: 'Missed', val: counts.missed, bg: '#fee2e2', col: '#ef4444' },
                ].map((s) => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-icon" style={{ background: s.bg, color: s.col }}><Icon size={24} /></div>
                            <div>
                                <div className="stat-value">{s.val}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add form */}
            {showForm && <AddMedicationForm onAdd={addMedication} loading={loading} />}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', background: '#f1f5f9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
                {[
                    { key: 'today', label: "Today's Reminders", icon: Calendar },
                    { key: 'active', label: 'Active Medications', icon: Pill },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600,
                                background: activeTab === tab.key ? '#fff' : 'transparent',
                                color: activeTab === tab.key ? '#0f172a' : '#64748b',
                                boxShadow: activeTab === tab.key ? 'var(--shadow)' : 'none',
                                transition: 'all .15s',
                            }}>
                            <Icon size={15} /> {tab.label}
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
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
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
            />
        </div>
    );
}
