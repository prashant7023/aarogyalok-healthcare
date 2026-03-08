/**
 * components/AddMedicationModal.jsx
 *
 * Slide-in right-side drawer for adding a new medication schedule.
 * Rendered via React Portal directly on document.body so it floats
 * above all page content regardless of scroll position.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Edit3 } from 'lucide-react';

export default function AddMedicationModal({ open, onClose, onAdd, loading }) {
    const [form, setForm] = useState({ medicineName: '', dosage: '', startDate: '', endDate: '' });
    const [times, setTimes] = useState(['']);

    const addTimeSlot = () => setTimes((t) => [...t, '']);
    const removeTimeSlot = (i) => setTimes((t) => t.filter((_, idx) => idx !== i));
    const updateTime = (i, val) => setTimes((t) => t.map((v, idx) => (idx === i ? val : v)));

    const reset = () => {
        setForm({ medicineName: '', dosage: '', startDate: '', endDate: '' });
        setTimes(['']);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const filledTimes = times.filter(Boolean);
        if (!filledTimes.length) { alert('Add at least one reminder time.'); return; }
        const ok = await onAdd({ ...form, scheduleTimes: filledTimes.join(',') });
        if (ok) { reset(); onClose(); }
    };

    const handleClose = () => { reset(); onClose(); };

    if (!open) return null;

    const label = (text, required, optText) => (
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>
            {text}
            {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
            {optText && <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 4 }}>(optional)</span>}
        </label>
    );

    const inputStyle = {
        width: '100%', padding: '0.55rem 0.75rem',
        border: '1px solid #d1d5db', borderRadius: '8px',
        fontSize: '0.875rem', color: '#111827',
        background: '#fff', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color .15s, box-shadow .15s',
        fontFamily: 'inherit',
    };

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                onClick={handleClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 1000,
                    animation: 'fadeIn .2s ease',
                }}
            />

            {/* Drawer panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0,
                width: '100%', maxWidth: 420,
                height: '100vh',
                background: '#fff',
                boxShadow: '-8px 0 40px rgba(0,0,0,.18)',
                zIndex: 1001,
                display: 'flex', flexDirection: 'column',
                animation: 'slideInRight .25s ease',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.1rem 1.25rem',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    background: '#fff',
                }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '8px',
                        background: '#eff6ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Edit3 size={16} color="#2563eb" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>New Medication</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Set up a reminder schedule</div>
                    </div>
                    <button onClick={handleClose} style={{
                        background: '#f9fafb', border: '1px solid #e5e7eb',
                        borderRadius: '8px', width: 30, height: 30,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#6b7280', flexShrink: 0,
                    }}>
                        <X size={15} />
                    </button>
                </div>

                {/* Scrollable form body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                    <form id="med-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Medicine Name */}
                        <div>
                            {label('Medicine Name', true)}
                            <input style={inputStyle} required placeholder="e.g. Paracetamol"
                                value={form.medicineName}
                                onChange={(e) => setForm((f) => ({ ...f, medicineName: e.target.value }))}
                                onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {/* Dosage */}
                        <div>
                            {label('Dosage', false, true)}
                            <input style={inputStyle} placeholder="e.g. 500mg, 1 tablet"
                                value={form.dosage}
                                onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
                                onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {/* Date row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                {label('Start Date', true)}
                                <input type="date" style={inputStyle} required
                                    value={form.startDate}
                                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                            <div>
                                {label('End Date', false, true)}
                                <input type="date" style={inputStyle}
                                    value={form.endDate}
                                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        {/* Reminder times */}
                        <div>
                            {label('Reminder Times', true)}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {times.map((t, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input type="time" required value={t}
                                            style={{ ...inputStyle, flex: 1 }}
                                            onChange={(e) => updateTime(i, e.target.value)}
                                            onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                                        />
                                        {times.length > 1 && (
                                            <button type="button" onClick={() => removeTimeSlot(i)}
                                                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.45rem 0.55rem', cursor: 'pointer', color: '#ef4444', display: 'flex', flexShrink: 0 }}>
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addTimeSlot} style={{
                                    alignSelf: 'flex-start', background: 'none',
                                    border: '1px dashed #bfdbfe', borderRadius: '8px',
                                    padding: '0.35rem 0.85rem', color: '#2563eb',
                                    fontSize: '0.8rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600,
                                }}>
                                    <Plus size={13} /> Add time
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer — sticky */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex', gap: '0.6rem',
                    background: '#fff',
                }}>
                    <button type="button" onClick={handleClose} style={{
                        flex: 1, padding: '0.65rem', borderRadius: '8px',
                        border: '1px solid #e5e7eb', background: '#fff',
                        color: '#374151', fontWeight: 600, fontSize: '0.875rem',
                        cursor: 'pointer',
                    }}>
                        Cancel
                    </button>
                    <button type="submit" form="med-form" disabled={loading} style={{
                        flex: 2, padding: '0.65rem', borderRadius: '8px',
                        border: 'none', background: '#2563eb',
                        color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.65 : 1,
                    }}>
                        {loading ? 'Saving…' : 'Save Medication'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </>,
        document.body
    );
}
