import { useState, useEffect } from 'react';
import api from '../../shared/utils/api';
import { Pill, Check, Clock, AlertCircle, Plus, X, Calendar, Edit3, Activity } from 'lucide-react';

const STATUS_STYLE = {
    completed: { border: '#e2e8f0', bg: '#f8fafc', badge: 'badge badge-green', label: 'Taken', Icon: Check },
    pending: { border: '#fef3c7', bg: '#fffbeb', badge: 'badge badge-yellow', label: 'Pending', Icon: Clock },
    missed: { border: '#fee2e2', bg: '#fef2f2', badge: 'badge badge-red', label: 'Missed', Icon: AlertCircle },
};

const DEFAULT_MEDS = [
    { _id: '1', medicineName: 'Insulin (Glargine)', dosage: '10 units', scheduleTimes: ['07:00'], status: 'completed' },
    { _id: '2', medicineName: 'Metformin 500mg', dosage: '500 mg', scheduleTimes: ['08:30'], status: 'completed' },
    { _id: '3', medicineName: 'Paracetamol', dosage: '500 mg', scheduleTimes: ['14:00'], status: 'pending' },
    { _id: '4', medicineName: 'Amlodipine 5mg', dosage: '5 mg', scheduleTimes: ['15:00'], status: 'pending' },
    { _id: '5', medicineName: 'Atorvastatin', dosage: '20 mg', scheduleTimes: ['22:00'], status: 'missed' },
];

export default function MedicationPage() {
    const [meds, setMeds] = useState(DEFAULT_MEDS);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ medicineName: '', dosage: '', scheduleTimes: '', startDate: '', endDate: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/medication').then(r => { if (r.data.data?.length) setMeds(r.data.data); }).catch(() => { });
    }, []);

    const counts = {
        total: meds.length,
        completed: meds.filter(m => m.status === 'completed').length,
        pending: meds.filter(m => m.status === 'pending').length,
        missed: meds.filter(m => m.status === 'missed').length,
    };

    const handleAdd = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const payload = { ...form, scheduleTimes: form.scheduleTimes.split(',').map(s => s.trim()) };
            const res = await api.post('/medication', payload);
            setMeds(prev => [...prev, res.data.data]);
            setShowForm(false);
            setForm({ medicineName: '', dosage: '', scheduleTimes: '', startDate: '', endDate: '' });
        } catch (e) { alert(e.response?.data?.message || 'Failed to add'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fade-in">
            <div className="page-header" style={{ alignItems: 'center' }}>
                <div>
                    <h1>Medication Reminder</h1>
                    <p>Track your daily medications, dosage, and schedules.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
                    {showForm ? <><X size={18} /> Close Panel</> : <><Plus size={18} /> Add Medication</>}
                </button>
            </div>

            {/* Summary */}
            <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
                {[
                    { icon: Pill, label: 'Total Meds', val: counts.total, bg: '#eff6ff', col: '#2563eb' },
                    { icon: Check, label: 'Completed', val: counts.completed, bg: '#d1fae5', col: '#10b981' },
                    { icon: Clock, label: 'Pending', val: counts.pending, bg: '#fef3c7', col: '#f59e0b' },
                    { icon: X, label: 'Missed', val: counts.missed, bg: '#fee2e2', col: '#ef4444' }
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-icon" style={{ background: s.bg, color: s.col }}><Icon size={24} /></div>
                            <div>
                                <div className="stat-value">{s.val}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Add form */}
            {showForm && (
                <div className="card fade-in" style={{ marginBottom: '2.5rem', background: '#eff6ff', border: 'none' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontSize: '1.2rem' }}><Edit3 size={20} /> Setup New Schedule</h3>
                    <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '1.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}><label style={{ color: '#1e40af' }}>Medicine Name</label><input className="input" required value={form.medicineName} onChange={e => setForm(f => ({ ...f, medicineName: e.target.value }))} placeholder="e.g. Paracetamol" /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label style={{ color: '#1e40af' }}>Dosage</label><input className="input" required value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label style={{ color: '#1e40af' }}>Times (comma-separated)</label><input className="input" required value={form.scheduleTimes} onChange={e => setForm(f => ({ ...f, scheduleTimes: e.target.value }))} placeholder="08:00, 14:00" /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label style={{ color: '#1e40af' }}>Start Date</label><input className="input" type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label style={{ color: '#1e40af' }}>End Date</label><input className="input" type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 0 }}>
                            <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', padding: '0.85rem' }}>{saving ? 'Saving...' : 'Save Settings'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Med list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} /> {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                {meds.map(med => {
                    const s = STATUS_STYLE[med.status || 'pending'];
                    const StatusIcon = s.Icon;
                    return (
                        <div key={med._id} className="card" style={{
                            background: s.bg, border: `1px solid ${s.border}`,
                            padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
                            transition: 'all .15s'
                        }}>
                            <div style={{ background: '#fff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)', flexShrink: 0 }}>
                                <Pill size={24} color="#64748b" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem', fontSize: '1.1rem' }}>{med.medicineName}</div>
                                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#64748b' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} color="#94a3b8" /> {med.scheduleTimes?.join(', ')}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={16} color="#94a3b8" /> {med.dosage}</span>
                                </div>
                            </div>
                            <span className={s.badge} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                                <StatusIcon size={16} /> {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
