import { useState, useEffect, useRef } from 'react';
import api from '../../shared/utils/api';
import useAuthStore from '../auth/authStore';
import { FileText, Image as ImageIcon, File, UploadCloud, Trash2, ExternalLink, Activity, X, User, Search } from 'lucide-react';
import './records.css';

export default function RecordsPage() {
    const { user } = useAuthStore();
    const isDoctor = ['doctor', 'hospital', 'admin'].includes(user?.role);

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    // Upload form state
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', description: '' });
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();

    // Doctor: patient search state
    const [searchEmail, setSearchEmail] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [foundPatient, setFoundPatient] = useState(null); // { _id, name, email }
    const [searchError, setSearchError] = useState('');

    useEffect(() => {
        api.get('/records')
            .then(r => setRecords(r.data.data || []))
            .catch(() => setRecords([]))
            .finally(() => setLoading(false));
    }, []);

    const handleSearchPatient = async (e) => {
        e.preventDefault();
        setSearchError('');
        setFoundPatient(null);
        setSearchLoading(true);
        try {
            const res = await api.get(`/records/search-patient?email=${encodeURIComponent(searchEmail)}`);
            setFoundPatient(res.data.data);
            setShowForm(true);
        } catch (err) {
            setSearchError(err.response?.data?.message || 'Patient not found');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('description', form.description);
            if (file) fd.append('file', file);
            // Doctor uploads on behalf of patient
            if (isDoctor && foundPatient) fd.append('patientId', foundPatient._id);
            const res = await api.post('/records/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setRecords(prev => [res.data.data, ...prev]);
            setShowForm(false);
            setForm({ title: '', description: '' });
            setFile(null);
            setFoundPatient(null);
            setSearchEmail('');
        } catch (err) { alert(err.response?.data?.message || 'Failed to upload'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await api.delete(`/records/${id}`);
            setRecords(prev => prev.filter(r => r._id !== id));
        } catch { alert('Failed to delete'); }
    };

    const getIcon = (type) => {
        if (type === 'pdf') return <FileText size={24} color="#c43256" />;
        if (['jpg', 'png', 'jpeg'].includes(type)) return <ImageIcon size={24} color="var(--primary)" />;
        return <File size={24} color="var(--text-mid)" />;
    };

    const getPatientName = (rec) =>
        rec.userId && typeof rec.userId === 'object' ? rec.userId.name : null;

    const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

    return (
        <div className="fade-in records-page">
            <div className="page-header" style={{ alignItems: 'center' }}>
                <div>
                    <h1>{isDoctor ? 'Clinical Records' : 'Health Records'}</h1>
                    <p>{isDoctor ? 'View all patient records and add new ones by searching a patient.' : 'Your digitized health history, lab reports, and prescriptions.'}</p>
                </div>
                {!isDoctor && (
                    <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
                        {showForm ? <><X size={18} /> Cancel</> : <><UploadCloud size={18} /> Upload Record</>}
                    </button>
                )}
            </div>

            {/* ── DOCTOR: patient search + upload ── */}
            {isDoctor && (
                <div className="card fade-in records-highlight-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} color="var(--primary)" /> Add Record for Patient
                    </h3>
                    <form onSubmit={handleSearchPatient} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <input
                            className="input"
                            type="email"
                            placeholder="Search patient by email…"
                            value={searchEmail}
                            onChange={e => { setSearchEmail(e.target.value); setFoundPatient(null); setShowForm(false); setSearchError(''); }}
                            style={{ flex: 1, minWidth: '220px' }}
                        />
                        <button className="btn btn-primary" type="submit" disabled={searchLoading || !searchEmail} style={{ whiteSpace: 'nowrap' }}>
                            <Search size={16} /> {searchLoading ? 'Searching…' : 'Find Patient'}
                        </button>
                    </form>
                    {searchError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{searchError}</p>}

                    {/* Upload form appears after patient found */}
                    {showForm && foundPatient && (
                        <form onSubmit={handleUpload} style={{ marginTop: '1.25rem', borderTop: '1px solid #c7dcf6', paddingTop: '1.25rem' }}>
                            {/* Patient chip */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', background: 'var(--primary-soft)', borderRadius: '8px', padding: '0.5rem 0.75rem', width: 'fit-content' }}>
                                <User size={15} color="var(--primary)" />
                                <span style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>{foundPatient.name}</span>
                                <span style={{ color: 'var(--text-mid)', fontSize: '0.82rem' }}>{foundPatient.email}</span>
                                <button type="button" onClick={() => { setFoundPatient(null); setShowForm(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mid)', paddingLeft: '4px' }}><X size={14} /></button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: 'var(--primary-dark)' }}>Document Title *</label>
                                    <input className="input" required placeholder="e.g. Blood Report" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: 'var(--primary-dark)' }}>Description (optional)</label>
                                    <input className="input" placeholder="Notes…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                </div>
                            </div>

                            <div
                                onClick={() => fileRef.current.click()}
                                style={{ border: '2px dashed #c7dcf6', borderRadius: '10px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: '#fff', marginBottom: '1rem' }}
                            >
                                <UploadCloud size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{file ? file.name : 'Click to attach PDF or Image (optional)'}</div>
                                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                            </div>

                            <button className="btn btn-primary" type="submit" disabled={saving}>
                                <UploadCloud size={16} /> {saving ? 'Uploading…' : 'Add Record'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* ── PATIENT: self-upload form ── */}
            {!isDoctor && showForm && (
                <div className="card fade-in records-highlight-card">
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--primary-dark)' }}>Upload New Document</h3>
                    <form onSubmit={handleUpload}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ color: 'var(--primary-dark)' }}>Document Title</label>
                                <input className="input" required placeholder="e.g. Complete Blood Count" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ color: 'var(--primary-dark)' }}>Brief Description (Optional)</label>
                                <input className="input" placeholder="Enter notes..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                        </div>
                        <div
                            onClick={() => fileRef.current.click()}
                            style={{ border: '2px dashed #c7dcf6', borderRadius: '12px', padding: '3rem', textAlign: 'center', cursor: 'pointer', background: '#fff', marginBottom: '1.5rem' }}
                        >
                            <UploadCloud size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>{file ? file.name : 'Click to select PDF or Image file'}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-mid)' }}>Max file size: 10MB</div>
                            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={saving} style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
                            {saving ? 'Uploading...' : 'Submit Document'}
                        </button>
                    </form>
                </div>
            )}

            {loading && <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-mid)' }}>Loading records...</div>}

            {!loading && (
                <div className="records-grid">
                    {records.map(rec => {
                        const patientName = getPatientName(rec);
                        return (
                            <div key={rec._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                                {isDoctor && patientName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem', background: 'var(--primary-soft)', borderRadius: '8px', padding: '0.4rem 0.75rem', width: 'fit-content' }}>
                                        <User size={13} color="var(--primary)" />
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{patientName}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ background: 'var(--surface-subtle)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {getIcon(rec.fileType)}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem', color: 'var(--text-dark)' }}>{rec.title}</h3>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-mid)', background: 'var(--surface-subtle)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                                            {new Date(rec.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-mid)', lineHeight: 1.5, flex: 1, marginBottom: '1.5rem' }}>
                                    {rec.description || 'No description provided.'}
                                </p>
                                {rec.diagnosisHistory?.length > 0 && (
                                    <div style={{ background: 'var(--surface-subtle)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-mid)', marginBottom: '0.5rem', letterSpacing: '.05em' }}>Diagnoses attached</div>
                                        {rec.diagnosisHistory.map((d, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-dark)' }}>
                                                <Activity size={14} color="var(--primary)" /> {d.diagnosis} <span style={{ color: 'var(--text-light)' }}>({d.doctor})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    {rec.fileUrl && (
                                        <a href={`${BASE_URL}${rec.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1 }}>
                                            <ExternalLink size={16} /> View
                                        </a>
                                    )}
                                    <button className="btn btn-ghost" onClick={() => handleDelete(rec._id)} style={{ color: 'var(--danger)' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {records.length === 0 && (
                        <div className="records-empty">
                            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>No records found</div>
                            <p>{isDoctor ? 'Search a patient above to add their first record.' : 'Upload a PDF or image to get started.'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
