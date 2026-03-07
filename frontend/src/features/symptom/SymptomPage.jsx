import { useState, useEffect } from 'react';
import api from '../../shared/utils/api';
import { Activity, AlertTriangle, Search, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

const QUICK_TAGS = [
    { label: 'Fever', value: 'fever' },
    { label: 'Cough', value: 'cough' },
    { label: 'Headache', value: 'headache' },
    { label: 'Stomachache', value: 'stomachache' },
    { label: 'Fatigue', value: 'fatigue' },
    { label: 'Chest Pain', value: 'chest pain' },
    { label: 'Back Pain', value: 'back pain' },
    { label: 'Dizziness', value: 'dizziness' },
];

const SEV_CLASS = { mild: 'badge badge-green', moderate: 'badge badge-yellow', critical: 'badge badge-red' };
const SEV_LABEL = { mild: 'Mild', moderate: 'Moderate', critical: 'Critical' };

export default function SymptomPage() {
    const [input, setInput] = useState('');
    const [selected, setSelected] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleTag = (val) => {
        setSelected(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
    };

    const analyze = async () => {
        const all = [...new Set([...selected, ...input.split(',').map(s => s.trim()).filter(Boolean)])];
        if (!all.length) { setError('Please enter or select at least one symptom'); return; }
        setError(''); setLoading(true); setResult(null);
        try {
            const res = await api.post('/symptom/analyze', { symptoms: all });
            setResult(res.data.data);
        } catch (e) {
            setError(e.response?.data?.message || 'Analysis failed. Please try again.');
        } finally { setLoading(false); }
    };

    const reset = () => { setInput(''); setSelected([]); setResult(null); setError(''); };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1>AI Symptom Checker</h1>
                    <p>Instant clinical analysis powered by Gemini.</p>
                </div>
            </div>

            {/* Disclaimer */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem 1.25rem', fontSize: '0.9rem', color: '#b45309', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ lineHeight: 1.5 }}>This tool provides general health information only and is <strong>NOT</strong> a substitute for professional medical diagnosis, treatment, or advice. Always consult a licensed doctor for any health concerns.</span>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem', color: '#0f172a' }}>
                    <Search size={16} color="#3b82f6" /> Quick-select common symptoms
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {QUICK_TAGS.map(t => (
                        <button key={t.value} type="button"
                            onClick={() => toggleTag(t.value)}
                            style={{
                                padding: '0.6rem 1.25rem', borderRadius: '999px', fontSize: '0.875rem',
                                border: '1px solid', cursor: 'pointer', transition: 'all .15s', fontWeight: 600,
                                borderColor: selected.includes(t.value) ? '#2563eb' : '#e2e8f0',
                                background: selected.includes(t.value) ? '#eff6ff' : '#f8fafc',
                                color: selected.includes(t.value) ? '#1d4ed8' : '#64748b',
                                boxShadow: selected.includes(t.value) ? '0 0 0 2px rgba(37,99,235,.2)' : 'none'
                            }}
                        >{t.label}</button>
                    ))}
                </div>

                <label style={{ color: '#0f172a', marginBottom: '0.75rem' }}>Or type additional symptoms (comma-separated)</label>
                <input className="input" placeholder="e.g. nausea, joint pain, sore throat..." value={input} onChange={e => setInput(e.target.value)} style={{ padding: '0.8rem 1rem' }} />

                {error && <p className="form-error" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> {error}</p>}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={analyze} disabled={loading} style={{ flex: 1, minWidth: '200px', padding: '0.85rem' }}>
                        {loading ? <><span className="spinner" /> Analyzing...</> : <><Activity size={18} /> Analyze Symptoms</>}
                    </button>
                    <button className="btn btn-secondary" onClick={reset}><RefreshCw size={16} /> Reset</button>
                </div>
            </div>

            {/* Result */}
            {result && (
                <div className="card fade-in" style={{ border: 'none', background: '#eff6ff', position: 'relative', padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '.05em', marginBottom: '0.5rem' }}>AI Diagnosis Results</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2, marginBottom: '0.5rem' }}>
                                {result.aiResult?.possible_diseases?.[0] || 'Analysis Complete'}
                            </div>
                            <div style={{ fontSize: '0.95rem', color: '#475569' }}>
                                {result.aiResult?.possible_diseases?.slice(1).join(' • ')}
                            </div>
                        </div>
                        <span className={SEV_CLASS[result.aiResult?.severity] || 'badge badge-gray'} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                            Severity: {SEV_LABEL[result.aiResult?.severity] || 'Moderate'}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '2rem', marginBottom: '2rem' }}>
                        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={16} /> Possible Conditions
                            </div>
                            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.95rem', lineHeight: 1.6, color: '#334155', margin: 0 }}>
                                {result.aiResult?.possible_diseases?.map(d => <li key={d} style={{ marginBottom: '0.4rem' }}>{d}</li>)}
                            </ul>
                        </div>
                        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={16} /> Home Advice
                            </div>
                            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#334155', margin: 0 }}>{result.aiResult?.home_advice}</p>
                        </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #bfdbfe', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 600 }}>Recommended Specialist</div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>{result.aiResult?.recommended_specialist}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 600 }}>Action Required</div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', textTransform: 'capitalize' }}>{result.aiResult?.urgency_level}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
