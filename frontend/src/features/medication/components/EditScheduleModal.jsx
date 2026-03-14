import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock3 } from 'lucide-react';

export default function EditScheduleModal({ open, medication, loading, onClose, onSave }) {
    const [times, setTimes] = useState([]);

    useEffect(() => {
        if (!open || !medication) return;
        const initialTimes = Array.isArray(medication.scheduleTimes) && medication.scheduleTimes.length
            ? medication.scheduleTimes
            : [''];
        setTimes(initialTimes);
    }, [open, medication]);

    if (!open || !medication) return null;

    const updateTime = (index, value) => {
        setTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
    };

    const addTime = () => {
        setTimes((prev) => [...prev, '']);
    };

    const removeTime = (index) => {
        setTimes((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [''];
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleaned = times.map((t) => String(t).trim()).filter(Boolean);
        if (!cleaned.length) {
            alert('Please add at least one schedule time.');
            return;
        }

        const ok = await onSave(medication._id, cleaned);
        if (ok) onClose();
    };

    const inputStyle = {
        width: '100%',
        padding: '0.55rem 0.75rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#111827',
        background: '#fff',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color .15s, box-shadow .15s',
        fontFamily: 'inherit',
    };

    return createPortal(
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 1100,
                    animation: 'fadeIn .2s ease',
                }}
            />

            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '100%',
                    maxWidth: 420,
                    height: '100vh',
                    background: '#fff',
                    boxShadow: '-8px 0 40px rgba(0,0,0,.18)',
                    zIndex: 1101,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideInRight .25s ease',
                }}
            >
                <div
                    style={{
                        padding: '1.1rem 1.25rem',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: '#fff',
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Clock3 size={16} color="#2563eb" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>Edit Schedule</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{medication.medicineName}</div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            width: 30,
                            height: 30,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#6b7280',
                            flexShrink: 0,
                        }}
                    >
                        <X size={15} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                    <form id="edit-schedule-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>
                            Reminder Times <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
                        </label>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {times.map((t, i) => (
                                <div key={`${medication._id}-${i}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="time"
                                        required
                                        value={t}
                                        style={{ ...inputStyle, flex: 1 }}
                                        onChange={(e) => updateTime(i, e.target.value)}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#2563eb';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#d1d5db';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                    {times.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeTime(i)}
                                            style={{
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                borderRadius: '8px',
                                                padding: '0.45rem 0.55rem',
                                                cursor: 'pointer',
                                                color: '#ef4444',
                                                display: 'flex',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addTime}
                            style={{
                                alignSelf: 'flex-start',
                                background: 'none',
                                border: '1px dashed #bfdbfe',
                                borderRadius: '8px',
                                padding: '0.35rem 0.85rem',
                                color: '#2563eb',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            + Add time
                        </button>
                    </form>
                </div>

                <div
                    style={{
                        padding: '1rem 1.25rem',
                        borderTop: '1px solid #f3f4f6',
                        display: 'flex',
                        gap: '0.6rem',
                        background: '#fff',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.65rem',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            color: '#374151',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-schedule-form"
                        disabled={loading}
                        style={{
                            flex: 2,
                            padding: '0.65rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#2563eb',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.65 : 1,
                        }}
                    >
                        {loading ? 'Saving...' : 'Save Schedule'}
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
