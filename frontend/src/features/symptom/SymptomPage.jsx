import { useState } from 'react';
import api from '../../shared/utils/api';
import { Activity, AlertTriangle, Search, RefreshCw, FileText, CheckCircle2, UserRound, Hospital, BellRing, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../auth/authStore';
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
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [input, setInput] = useState('');
    const [selected, setSelected] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bookingLoadingId, setBookingLoadingId] = useState(null);
    const [bookingError, setBookingError] = useState('');
    const [bookedToken, setBookedToken] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [doctorOpenAppointments, setDoctorOpenAppointments] = useState([]);
    const [doctorOpenLoading, setDoctorOpenLoading] = useState(false);
    const [bookingForm, setBookingForm] = useState({
        patientName: user?.name || '',
        patientPhone: user?.phone || '',
        patientAge: '',
        patientGender: 'Male',
    });

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

    const reset = () => {
        setInput('');
        setSelected([]);
        setResult(null);
        setError('');
        setBookingError('');
        setBookedToken(null);
        setSelectedDoctor(null);
        setDoctorOpenAppointments([]);
    };

    const loadDoctorOpenAppointments = async (doc) => {
        if (!doc?.doctorId) return;

        setSelectedDoctor(doc);
        setDoctorOpenAppointments([]);
        setDoctorOpenLoading(true);
        setBookingError('');

        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/queue/appointments?doctorId=${doc.doctorId}&fromDate=${today}`);
            const appts = Array.isArray(res?.data?.data) ? res.data.data : [];
            setDoctorOpenAppointments(appts);
        } catch (e) {
            setBookingError(e.response?.data?.message || 'Failed to load open appointments for selected doctor.');
        } finally {
            setDoctorOpenLoading(false);
        }
    };

    const handleAutoBook = async (appointment) => {
        if (!appointment?.appointmentId) return;

        if (!bookingForm.patientName.trim()) {
            setBookingError('Patient name is required for booking.');
            return;
        }

        if (!/^\d{10}$/.test(bookingForm.patientPhone.trim())) {
            setBookingError('Please enter a valid 10-digit mobile number.');
            return;
        }

        const age = parseInt(bookingForm.patientAge, 10);
        if (!Number.isInteger(age) || age < 1 || age > 120) {
            setBookingError('Please enter valid patient age (1-120).');
            return;
        }

        setBookingError('');
        setBookedToken(null);
        setBookingLoadingId(appointment.appointmentId);

        try {
            const payload = {
                appointmentId: appointment.appointmentId,
                patientName: bookingForm.patientName.trim(),
                patientPhone: bookingForm.patientPhone.trim(),
                patientAge: age,
                patientGender: bookingForm.patientGender,
                description: (input || selected.join(', ') || 'Symptom checker consultation').trim(),
            };

            const res = await api.post('/queue/bookings', payload);
            const tokenNumber = res?.data?.data?.tokenNumber;
            setBookedToken(tokenNumber || '—');
        } catch (e) {
            setBookingError(e.response?.data?.message || 'Auto booking failed. Try another appointment.');
        } finally {
            setBookingLoadingId(null);
        }
    };

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

    const getRankedConditions = () => {
        const diseases = Array.isArray(result?.aiResult?.possible_diseases)
            ? result.aiResult.possible_diseases
            : [];
        const details = getConditionDetails();

        const normalizeKey = (value) => String(value || '')
            .toLowerCase()
            .replace(/\([^)]*\)/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const detailMap = new Map(details.map((item) => [normalizeKey(item.name), item]));

        return diseases.map((name, idx) => {
            const key = normalizeKey(name);
            const direct = detailMap.get(key);
            const loose = details.find((item) => {
                const itemKey = normalizeKey(item.name);
                return itemKey && key && (itemKey.includes(key) || key.includes(itemKey));
            });
            const resolved = direct || loose;

            return {
                rank: idx + 1,
                name,
                explanation: resolved?.explanation || `${name} is a possible condition linked to your symptoms. A doctor can confirm this after examination.`,
                common_causes: Array.isArray(resolved?.common_causes) ? resolved.common_causes : ['Infection', 'Inflammation', 'Lifestyle trigger'],
            };
        });
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
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-mid)' }}>
                                Ranked by symptom match confidence
                            </div>
                        </div>
                        <span className={SEV_CLASS[result.aiResult?.severity] || 'badge badge-gray'} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                            Severity: {SEV_LABEL[result.aiResult?.severity] || 'Moderate'}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gap: '0.55rem', marginBottom: '0.9rem' }}>
                        {getRankedConditions().map((condition) => (
                            <div key={`${condition.name}-${condition.rank}`} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.6rem 0.75rem', background: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                                <span style={{ minWidth: '24px', height: '24px', borderRadius: '999px', background: 'var(--primary-soft)', color: 'var(--primary-dark)', fontSize: '0.78rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {condition.rank}
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.92rem' }}>{condition.name}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '0.9rem', marginBottom: '0.9rem' }}>
                        <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={16} /> Possible Conditions
                            </div>
                            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-mid)', margin: 0 }}>
                                {getRankedConditions().map((item) => (
                                    <li key={`${item.name}-${item.rank}`} style={{ marginBottom: '0.4rem' }}>
                                        #{item.rank} {item.name}
                                    </li>
                                ))}
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
                            {getRankedConditions().map((item) => (
                                <div key={`${item.name}-${item.rank}`} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.8rem 0.9rem', background: 'var(--surface-soft)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                        <span style={{ minWidth: '22px', height: '22px', borderRadius: '999px', background: 'var(--primary-soft)', color: 'var(--primary-dark)', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {item.rank}
                                        </span>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-dark)' }}>{item.name}</div>
                                    </div>
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

                    {result.automationPlan && (
                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--border)', padding: '1rem', marginTop: '0.9rem' }}>
                            <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.75rem' }}>
                                Automation Workflow Output
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.7rem', marginBottom: '0.8rem' }}>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Disease Category</div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{result.automationPlan?.diseaseCategory || result.aiResult?.disease_category || 'General Medicine'}</div>
                                </div>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Workflow Stage</div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-dark)', textTransform: 'capitalize' }}>{(result.automationPlan?.workflowStage || '').replace(/-/g, ' ') || 'triage'}</div>
                                </div>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Queue Recommendation</div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{result.automationPlan?.queueRecommendation?.shouldJoinQueue ? 'Join Queue' : 'Home Care First'}</div>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.86rem', color: 'var(--text-mid)', marginBottom: '0.8rem', lineHeight: 1.5 }}>
                                {result.automationPlan?.queueRecommendation?.reason}
                            </div>

                            {Array.isArray(result.automationPlan?.recommendedProviders) && result.automationPlan.recommendedProviders.length > 0 && (
                                <div style={{ marginBottom: '0.8rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <UserRound size={14} /> Recommended Doctors
                                    </div>

                                    {result.automationPlan?.specialistMatchFound === false && (
                                        <div style={{ border: '1px solid #ffe6b3', background: '#fff8e8', borderRadius: '8px', padding: '0.55rem 0.65rem', marginBottom: '0.5rem' }}>
                                            <div style={{ fontSize: '0.78rem', color: '#8e6700', fontWeight: 600 }}>
                                                Exact specialist is not available right now. Showing alternate available doctors for immediate booking.
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {result.automationPlan.recommendedProviders.slice(0, 3).map((doc, idx) => (
                                            <div key={`${doc.name}-${idx}`} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.55rem 0.7rem', background: 'var(--surface-subtle)' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-dark)' }}>{doc.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)' }}>{doc.specialization || 'General Physician'} {doc.clinicAddress ? `• ${doc.clinicAddress}` : ''}</div>
                                                <div style={{ fontSize: '0.76rem', color: '#9a6b00', marginTop: '0.2rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fff7e6', border: '1px solid #ffe2a8', borderRadius: '999px', padding: '0.08rem 0.45rem' }}>
                                                    <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                                    {Number(doc.rating || 0) > 0
                                                        ? `${Number(doc.rating).toFixed(1)} (${Number(doc.ratingCount || 0)})`
                                                        : 'No ratings'}
                                                </div>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ marginTop: '0.45rem' }}
                                                    onClick={() => loadDoctorOpenAppointments(doc)}
                                                >
                                                    {selectedDoctor?.doctorId === doc.doctorId ? 'Doctor Selected' : 'Select Doctor'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedDoctor && (
                                <div style={{ marginBottom: '0.8rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Hospital size={14} /> Open Appointments for {selectedDoctor.name}
                                    </div>

                                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem', background: 'var(--surface-subtle)', marginBottom: '0.6rem' }}>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginBottom: '0.45rem', fontWeight: 700 }}>
                                            Quick Booking Details (for auto token assignment)
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0.5rem' }}>
                                            <input
                                                className="input"
                                                placeholder="Patient name"
                                                value={bookingForm.patientName}
                                                onChange={(e) => setBookingForm((prev) => ({ ...prev, patientName: e.target.value }))}
                                            />
                                            <input
                                                className="input"
                                                placeholder="10-digit mobile"
                                                value={bookingForm.patientPhone}
                                                onChange={(e) => setBookingForm((prev) => ({ ...prev, patientPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                            />
                                            <input
                                                className="input"
                                                type="number"
                                                min="1"
                                                max="120"
                                                placeholder="Age"
                                                value={bookingForm.patientAge}
                                                onChange={(e) => setBookingForm((prev) => ({ ...prev, patientAge: e.target.value }))}
                                            />
                                            <select
                                                className="input"
                                                value={bookingForm.patientGender}
                                                onChange={(e) => setBookingForm((prev) => ({ ...prev, patientGender: e.target.value }))}
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-light)', marginTop: '0.45rem' }}>
                                            Clicking Book Appointment auto-generates your queue token for the selected doctor's next vacant schedule slot.
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {doctorOpenLoading && (
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-mid)' }}>Loading appointments...</div>
                                        )}

                                        {!doctorOpenLoading && doctorOpenAppointments.length === 0 && (
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-mid)' }}>No open appointments found for this doctor.</div>
                                        )}

                                        {!doctorOpenLoading && doctorOpenAppointments.slice(0, 5).map((apt, idx) => (
                                            <div key={`${apt._id || idx}`} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.55rem 0.7rem', background: 'var(--surface-subtle)' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-dark)' }}>{apt.title}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)' }}>
                                                    {new Date(apt.appointmentDate).toLocaleDateString()} • Token {apt.currentTokenNumber || '-'} • Issued {apt.totalTokensIssued || 0}
                                                </div>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ marginTop: '0.45rem' }}
                                                    onClick={() => handleAutoBook({ appointmentId: apt._id })}
                                                    disabled={Boolean(bookingLoadingId)}
                                                >
                                                    {bookingLoadingId === apt._id ? 'Booking...' : 'Book Appointment'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {bookingError && (
                                        <div className="form-error" style={{ marginTop: '0.55rem' }}>
                                            {bookingError}
                                        </div>
                                    )}

                                    {bookedToken && (
                                        <div style={{ marginTop: '0.55rem', border: '1px solid #c9f0db', background: '#effaf4', borderRadius: '8px', padding: '0.6rem 0.7rem' }}>
                                            <div style={{ fontWeight: 700, color: '#127a5a', fontSize: '0.82rem' }}>
                                                Appointment booked successfully. Token #{bookedToken}
                                            </div>
                                            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.45rem' }} onClick={() => navigate('/queue/my-appointments')}>
                                                View My Appointments
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {result.automationPlan?.abnormalCaseDetected && (
                                <div style={{ border: '1px solid #ffd8e1', background: '#fff4f7', borderRadius: '9px', padding: '0.65rem 0.75rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <BellRing size={15} color="#c43256" style={{ marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#a32043', fontSize: '0.83rem' }}>Abnormal Case Escalation Triggered</div>
                                        <div style={{ fontSize: '0.78rem', color: '#7f1d38', marginTop: '2px' }}>
                                            {result.automationPlan?.doctorNotified
                                                ? `Doctor notifications sent to ${result.automationPlan?.doctorNotificationCount || 0} provider(s).`
                                                : 'Case flagged for urgent clinical attention.'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
