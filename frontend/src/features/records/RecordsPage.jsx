import { useState, useEffect, useRef } from 'react';
import api from '../../shared/utils/api';
import useAuthStore from '../auth/authStore';
import { jsPDF } from 'jspdf';
import { FileText, Image as ImageIcon, File, UploadCloud, Trash2, ExternalLink, Activity, X, User, Search } from 'lucide-react';

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
            let extractedText = '';
            if (file?.type?.startsWith('image/') && window.puter?.ai?.img2txt) {
                const imageDataUrl = await fileToDataUrl(file);
                extractedText = (await window.puter.ai.img2txt(imageDataUrl)) || '';
            }

            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('description', form.description);
            if (file) fd.append('file', file);
            if (extractedText.trim()) fd.append('ocrText', extractedText.trim());
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

    const fileToDataUrl = (selectedFile) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file for OCR'));
        reader.readAsDataURL(selectedFile);
    });

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await api.delete(`/records/${id}`);
            setRecords(prev => prev.filter(r => r._id !== id));
        } catch { alert('Failed to delete'); }
    };

    const getIcon = (type) => {
        if (type === 'pdf') return <FileText size={24} color="#dc2626" />;
        if (['jpg', 'png', 'jpeg'].includes(type)) return <ImageIcon size={24} color="#2563eb" />;
        return <File size={24} color="#64748b" />;
    };

    const getPatientName = (rec) =>
        rec.userId && typeof rec.userId === 'object' ? rec.userId.name : null;

    const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

    const getMedicineRows = (rec) => (Array.isArray(rec?.medicineMap) ? rec.medicineMap : []);

    const downloadSummaryPdf = (rec) => {
        const doc = new jsPDF();
        const title = rec?.title || 'Medical Record';
        const summary = rec?.ocrSummary || 'No summary available.';
        const medicines = getMedicineRows(rec);

        let y = 16;
        doc.setFontSize(14);
        doc.text('ArogyaLok - Extracted Record Summary', 14, y);
        y += 8;

        doc.setFontSize(11);
        doc.text(`Document: ${title}`, 14, y);
        y += 7;
        doc.text(`Date: ${new Date(rec.createdAt).toLocaleDateString('en-IN')}`, 14, y);
        y += 9;

        doc.setFontSize(12);
        doc.text('Summary', 14, y);
        y += 6;
        doc.setFontSize(10);
        const summaryLines = doc.splitTextToSize(summary, 180);
        doc.text(summaryLines, 14, y);
        y += summaryLines.length * 5 + 6;

        doc.setFontSize(12);
        doc.text('Medicine Key Map', 14, y);
        y += 6;
        doc.setFontSize(10);

        if (medicines.length === 0) {
            doc.text('No medicines detected.', 14, y);
        } else {
            medicines.forEach((m, idx) => {
                const row = `${idx + 1}. ${m.name || '-'} | Dosage: ${m.dosage || '-'} | Frequency: ${m.frequency || '-'} | Duration: ${m.duration || '-'}`;
                const rowLines = doc.splitTextToSize(row, 180);
                if (y > 275) {
                    doc.addPage();
                    y = 16;
                }
                doc.text(rowLines, 14, y);
                y += rowLines.length * 5 + 2;
            });
        }

        doc.save(`${(title || 'record-summary').replace(/\s+/g, '-').toLowerCase()}-summary.pdf`);
    };

    return (
        <div className="fade-in">
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
                <div className="card fade-in" style={{ marginBottom: '2rem', background: '#f8faff', border: '1px solid #bfdbfe' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} color="#3b82f6" /> Add Record for Patient
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
                    {searchError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }}>{searchError}</p>}

                    {/* Upload form appears after patient found */}
                    {showForm && foundPatient && (
                        <form onSubmit={handleUpload} style={{ marginTop: '1.25rem', borderTop: '1px solid #bfdbfe', paddingTop: '1.25rem' }}>
                            {/* Patient chip */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', background: '#eff6ff', borderRadius: '8px', padding: '0.5rem 0.75rem', width: 'fit-content' }}>
                                <User size={15} color="#3b82f6" />
                                <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem' }}>{foundPatient.name}</span>
                                <span style={{ color: '#64748b', fontSize: '0.82rem' }}>{foundPatient.email}</span>
                                <button type="button" onClick={() => { setFoundPatient(null); setShowForm(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', paddingLeft: '4px' }}><X size={14} /></button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: '#1e40af' }}>Document Title *</label>
                                    <input className="input" required placeholder="e.g. Blood Report" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: '#1e40af' }}>Description (optional)</label>
                                    <input className="input" placeholder="Notes…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                </div>
                            </div>

                            <div
                                onClick={() => fileRef.current.click()}
                                style={{ border: '2px dashed #bfdbfe', borderRadius: '10px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: '#fff', marginBottom: '1rem' }}
                            >
                                <UploadCloud size={24} color="#3b82f6" style={{ marginBottom: '0.5rem' }} />
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e3a8a' }}>{file ? file.name : 'Click to attach PDF or Image (optional)'}</div>
                                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                                OCR and summary extraction runs automatically on submit (PDF/image).
                            </p>

                            <button className="btn btn-primary" type="submit" disabled={saving}>
                                <UploadCloud size={16} /> {saving ? 'Processing & Uploading…' : 'Add Record'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* ── PATIENT: self-upload form ── */}
            {!isDoctor && showForm && (
                <div className="card fade-in" style={{ marginBottom: '2rem', border: 'none', background: '#eff6ff' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: '#1e3a8a' }}>Upload New Document</h3>
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
                            style={{ border: '2px dashed #bfdbfe', borderRadius: '12px', padding: '3rem', textAlign: 'center', cursor: 'pointer', background: '#fff', marginBottom: '1.5rem' }}
                        >
                            <UploadCloud size={32} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '0.25rem' }}>{file ? file.name : 'Click to select PDF or Image file'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Max file size: 10MB</div>
                            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                            OCR and summary extraction runs automatically on submit (PDF/image).
                        </p>
                        <button className="btn btn-primary" type="submit" disabled={saving} style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
                            {saving ? 'Processing & Uploading...' : 'Submit Document'}
                        </button>
                    </form>
                </div>
            )}

            {loading && <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>Loading records…</div>}

            {!loading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {records.map(rec => {
                        const patientName = getPatientName(rec);
                        const medicines = getMedicineRows(rec);
                        return (
                            <div key={rec._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                                {isDoctor && patientName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem', background: '#eff6ff', borderRadius: '8px', padding: '0.4rem 0.75rem', width: 'fit-content' }}>
                                        <User size={13} color="#3b82f6" />
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1d4ed8' }}>{patientName}</span>
                                    </div>
                                )}
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
                                {(rec.ocrSummary || medicines.length > 0) && (
                                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                                        {rec.ocrSummary && (
                                            <>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.4rem', letterSpacing: '.05em' }}>
                                                    Extracted Summary
                                                </div>
                                                <p style={{ fontSize: '0.85rem', color: '#0f172a', marginBottom: medicines.length ? '0.75rem' : 0 }}>
                                                    {rec.ocrSummary}
                                                </p>
                                            </>
                                        )}
                                        {medicines.length > 0 && (
                                            <>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.35rem', letterSpacing: '.05em' }}>
                                                    Medicine Key Map
                                                </div>
                                                {medicines.slice(0, 4).map((m, idx) => (
                                                    <div key={idx} style={{ fontSize: '0.82rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                                                        • <strong>{m.name || '-'}</strong>
                                                        {m.dosage ? ` | ${m.dosage}` : ''}
                                                        {m.frequency ? ` | ${m.frequency}` : ''}
                                                        {m.duration ? ` | ${m.duration}` : ''}
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                )}
                                {rec.diagnosisHistory?.length > 0 && (
                                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '.05em' }}>Diagnoses attached</div>
                                        {rec.diagnosisHistory.map((d, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#0f172a' }}>
                                                <Activity size={14} color="#3b82f6" /> {d.diagnosis} <span style={{ color: '#94a3b8' }}>({d.doctor})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    {rec.fileUrl && (
                                        <a href={`${BASE_URL}${rec.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1, background: '#f1f5f9', color: '#0f172a' }}>
                                            <ExternalLink size={16} /> View
                                        </a>
                                    )}
                                    {(rec.ocrSummary || medicines.length > 0) && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => downloadSummaryPdf(rec)}
                                            style={{ background: '#eef2ff', color: '#3730a3' }}
                                        >
                                            <FileText size={16} /> PDF
                                        </button>
                                    )}
                                    <button className="btn btn-ghost" onClick={() => handleDelete(rec._id)} style={{ color: '#ef4444' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {records.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>No records found</div>
                            <p>{isDoctor ? 'Search a patient above to add their first record.' : 'Upload a PDF or image to get started.'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
