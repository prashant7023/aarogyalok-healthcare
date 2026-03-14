import { useState, useEffect } from 'react';
import api from '../../shared/utils/api';
import { Activity, AlertTriangle, Search, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import './symptom.css';

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

const SEV_CLASS = { mild: 'badge badge-green', moderate: 'badge badge-yellow', severe: 'badge badge-red', critical: 'badge badge-red' };
const SEV_LABEL = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe', critical: 'Critical' };

export default function SymptomPage() {
    const [input, setInput] = useState('');
    const [selected, setSelected] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleTag = (val) => {
        setSelected(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
    };

    const parseFreeTextSymptoms = (text) => {
        const cleaned = String(text || '').trim();
        if (!cleaned) return [];

        const parts = cleaned
            .split(/[\n,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);

        // If it is a single paragraph, keep it as one descriptive item.
        return parts.length > 0 ? parts : [cleaned];
    };

    const analyze = async () => {
        const all = [...new Set([...selected, ...parseFreeTextSymptoms(input)])];
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

    const getConditionDetails = () => {
        const details = result?.aiResult?.condition_details;
        if (Array.isArray(details) && details.length > 0) {
            return details;
        }

        const fallbackDiseases = result?.aiResult?.possible_diseases || [];
        return fallbackDiseases.map((name) => ({
            name,
            explanation: `${name} is a possible condition linked to your symptoms. A doctor can confirm this after examination.`,
            common_causes: ['Infection', 'Inflammation', 'Allergy or environmental trigger']
        }));
    };

    return (
        <div className="fade-in symptom-page">
            <div className="page-header">
                <div>
                    <h1>AI Symptom Checker</h1>
                    <p>Capture symptoms quickly and receive structured clinical guidance.</p>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="symptom-disclaimer">
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ lineHeight: 1.5 }}>This tool provides general health information only and is <strong>NOT</strong> a substitute for professional medical diagnosis, treatment, or advice. Always consult a licensed doctor for any health concerns.</span>
            </div>

            <div className="card symptom-form-card">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.8rem', color: 'var(--text-dark)' }}>
                    <Search size={16} color="var(--primary)" /> Quick-select common symptoms
                </label>
                <div className="symptom-tags">
                    {QUICK_TAGS.map(t => (
                        <button key={t.value} type="button"
                            onClick={() => toggleTag(t.value)}
                            style={{
                                padding: '0.5rem 0.9rem', borderRadius: '999px', fontSize: '0.82rem',
                                border: '1px solid', cursor: 'pointer', transition: 'all .15s', fontWeight: 600,
                                borderColor: selected.includes(t.value) ? 'var(--primary)' : 'var(--border)',
                                background: selected.includes(t.value) ? 'var(--primary-soft)' : '#fff',
                                color: selected.includes(t.value) ? 'var(--primary-dark)' : 'var(--text-mid)',
                                boxShadow: selected.includes(t.value) ? '0 0 0 2px rgba(0,91,211,.14)' : 'none'
                            }}
                        >{t.label}</button>
                    ))}
                </div>

                <label style={{ color: 'var(--text-dark)', marginBottom: '0.55rem' }}>Or describe symptoms in your own words (paragraph or list)</label>
                <textarea
                    className="input"
                    placeholder="e.g. I have had fever since yesterday, body pain, sore throat, and mild dizziness in the morning."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    rows={3}
                    style={{ padding: '0.8rem 1rem', resize: 'vertical' }}
                />

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
                <div className="card fade-in symptom-result-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '.05em', marginBottom: '0.4rem' }}>AI Diagnosis Results</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.2, marginBottom: '0.35rem' }}>
                                {result.aiResult?.possible_diseases?.[0] || 'Analysis Complete'}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-mid)' }}>
                                {result.aiResult?.possible_diseases?.slice(1).join(' • ')}
                            </div>
                        </div>
                        <span className={SEV_CLASS[result.aiResult?.severity] || 'badge badge-gray'} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                            Severity: {SEV_LABEL[result.aiResult?.severity] || 'Moderate'}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '0.9rem', marginBottom: '0.9rem' }}>
                        <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={16} /> Possible Conditions
                            </div>
                            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-mid)', margin: 0 }}>
                                {result.aiResult?.possible_diseases?.map(d => <li key={d} style={{ marginBottom: '0.4rem' }}>{d}</li>)}
                            </ul>
                        </div>
                        <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={16} /> Home Advice
                            </div>
                            <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-mid)', margin: 0 }}>{result.aiResult?.home_advice}</p>
                        </div>
                    </div>

                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '0.9rem' }}>
                        <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.7rem' }}>
                            Condition Explanation (Patient Friendly)
                        </div>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {getConditionDetails().map((item, idx) => (
                                <div key={`${item.name}-${idx}`} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.8rem 0.9rem', background: 'var(--surface-soft)' }}>
                                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.86rem', color: 'var(--text-mid)', lineHeight: 1.55, marginBottom: '0.45rem' }}>
                                        {item.explanation}
                                    </div>
                                    {Array.isArray(item.common_causes) && item.common_causes.length > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-mid)' }}>
                                            <strong>Common causes:</strong> {item.common_causes.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--border)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.3rem', fontWeight: 600 }}>Recommended Specialist</div>
                            <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '1.05rem' }}>{result.aiResult?.recommended_specialist}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.3rem', fontWeight: 600 }}>Action Required</div>
                            <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '1.05rem', textTransform: 'capitalize' }}>{result.aiResult?.urgency_level}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
