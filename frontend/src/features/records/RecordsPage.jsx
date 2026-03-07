import { useState, useEffect, useRef } from 'react';
import api from '../../shared/utils/api';
import { FileText, Image as ImageIcon, File, UploadCloud, Trash2, ExternalLink, Activity, X } from 'lucide-react';

const MOCK_RECORDS = [
    { _id: '1', title: 'Blood Test Report', description: 'CBC with differential — all values normal', fileType: 'pdf', createdAt: new Date('2025-03-01'), diagnosisHistory: [{ diagnosis: 'Normal CBC', doctor: 'Dr. Sharma' }] },
    { _id: '2', title: 'Chest X-Ray', description: 'No active pulmonary pathology observed', fileType: 'jpg', createdAt: new Date('2025-02-15'), diagnosisHistory: [{ diagnosis: 'Clear Lungs', doctor: 'Dr. Patel' }] },
    { _id: '3', title: 'Consultation Note', description: 'Viral Fever — prescribed Paracetamol 500mg', fileType: 'pdf', createdAt: new Date('2025-01-20'), diagnosisHistory: [{ diagnosis: 'Viral Infection', doctor: 'Dr. Rao' }] },
];

export default function RecordsPage() {
    const [records, setRecords] = useState(MOCK_RECORDS);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', description: '' });
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();

    useEffect(() => {
        api.get('/records').then(r => { if (r.data.data?.length) setRecords(r.data.data); }).catch(() => { });
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('description', form.description);
            if (file) fd.append('file', file);
            const res = await api.post('/records/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setRecords(prev => [res.data.data, ...prev]);
            setShowForm(false); setForm({ title: '', description: '' }); setFile(null);
        } catch (e) { alert(e.response?.data?.message || 'Failed to upload'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await api.delete(`/records/${id}`);
            setRecords(prev => prev.filter(r => r._id !== id));
        } catch (e) { alert('Failed to delete'); }
    };

    const getIcon = (type) => {
        if (type === 'pdf') return <FileText size={24} color="#dc2626" />;
        if (type === 'jpg' || type === 'png' || type === 'jpeg') return <ImageIcon size={24} color="#2563eb" />;
        return <File size={24} color="#64748b" />;
    };

    return (
        <div className="fade-in">
            <div className="page-header" style={{ alignItems: 'center' }}>
                <div>
                    <h1>Clinical Records</h1>
                    <p>Digitized history, lab reports, and prescriptions.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
                    {showForm ? <><X size={18} /> Cancel</> : <><UploadCloud size={18} /> Upload Record</>}
                </button>
            </div>

            {/* Upload form */}
            {showForm && (
                <div className="card fade-in" style={{ marginBottom: '2rem', border: 'none', background: '#eff6ff', position: 'relative' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: '#1e3a8a' }}>Upload New Document</h3>
                    <form onSubmit={handleUpload}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ color: '#1e40af' }}>Document Title</label>
                                <input className="input" required placeholder="e.g. Complete Blood Count" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ color: '#1e40af' }}>Brief Description (Optional)</label>
                                <input className="input" placeholder="Enter notes..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                        </div>

                        <div
                            onClick={() => fileRef.current.click()}
                            style={{ border: '2px dashed #bfdbfe', borderRadius: '12px', padding: '3rem', textAlign: 'center', cursor: 'pointer', background: '#fff', marginBottom: '1.5rem', transition: 'all .15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.background = '#fff'; }}
                        >
                            <UploadCloud size={32} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '0.25rem' }}>{file ? file.name : 'Click to select PDF or Image file'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Max file size: 10MB</div>
                            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                        </div>

                        <button className="btn btn-primary" type="submit" disabled={saving} style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
                            {saving ? 'Uploading...' : 'Submit Document'}
                        </button>
                    </form>
                </div>
            )}

            {/* Grid of cards instead of plain table */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {records.map(rec => (
                    <div key={rec._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ background: '#f8fafc', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {getIcon(rec.fileType)}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem', color: '#0f172a' }}>{rec.title}</h3>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                                    {new Date(rec.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, flex: 1, marginBottom: '1.5rem' }}>
                            {rec.description || 'No description provided.'}
                        </p>

                        {rec.diagnosisHistory?.length > 0 && (
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '.05em' }}>Diagnoses attached</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {rec.diagnosisHistory.map((d, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#0f172a' }}>
                                            <Activity size={14} color="#3b82f6" /> {d.diagnosis} <span style={{ color: '#94a3b8' }}>({d.doctor})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            {rec.fileUrl && (
                                <a href={`http://localhost:5000${rec.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1, background: '#f1f5f9', color: '#0f172a' }}>
                                    <ExternalLink size={16} /> View
                                </a>
                            )}
                            <button className="btn btn-ghost" onClick={() => handleDelete(rec._id)} style={{ color: '#ef4444' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {records.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                        <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>No records found</div>
                        <p>Upload a PDF or image to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
