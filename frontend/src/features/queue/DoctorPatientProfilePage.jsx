import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Pill, User, Activity } from 'lucide-react';
import useAuthStore from '../auth/authStore';
import api from '../../shared/utils/api';
import './queue.css';

function fmt(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function fmtDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
}

export default function DoctorPatientProfilePage() {
    const { user } = useAuthStore();
    const isDoctor = user?.role === 'doctor';
    const { patientId } = useParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [payload, setPayload] = useState(null);

    useEffect(() => {
        if (!isDoctor || !patientId) return;
        fetchData();
    }, [isDoctor, patientId]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/queue/doctor/patients/${patientId}`);
            setPayload(res?.data?.data || null);
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to load patient details');
            setPayload(null);
        } finally {
            setLoading(false);
        }
    };

    const summaryCards = useMemo(() => {
        const s = payload?.summary || {};
        return [
            { label: 'Consultations', value: s.totalConsultations || 0, icon: Calendar },
            { label: 'Doctor Records', value: s.recordsCount || 0, icon: FileText },
            { label: 'Doctor Medications', value: s.medicationsCount || 0, icon: Pill },
            { label: 'Adherence', value: `${s.adherence?.adherenceRate || 0}%`, icon: Activity },
        ];
    }, [payload]);

    if (!isDoctor) {
        return <Navigate to="/queue" replace />;
    }

    return (
        <div className="fade-in queue-page">
            <div className="page-header" style={{ marginBottom: '1rem' }}>
                <div>
                    <h1>Patient Details</h1>
                    <p>Doctor-scoped data only (no cross-doctor leakage)</p>
                </div>
                <Link to="/queue/patient-crm" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowLeft size={16} /> Back to CRM
                </Link>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-mid)' }}>Loading patient details...</div>
            ) : error ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>{error}</div>
            ) : !payload ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-mid)' }}>No patient details found.</div>
            ) : (
                <>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
                            <User size={18} color="var(--primary)" />
                            <h3 style={{ margin: 0 }}>{payload.patient?.name || '-'}</h3>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-mid)' }}>
                            {payload.patient?.email || '-'} | {payload.patient?.phone || '-'}
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.9rem', marginBottom: '1rem' }}>
                        {summaryCards.map(({ label, value, icon: Icon }) => (
                            <div key={label} className="card queue-crm-kpi-card">
                                <div className="queue-crm-kpi-icon"><Icon size={18} /></div>
                                <div className="queue-crm-kpi-meta">
                                    <p>{label}</p>
                                    <h3>{value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card" style={{ marginBottom: '1rem', overflowX: 'auto' }}>
                        <h3 style={{ marginBottom: '0.8rem' }}>Bookings With You</h3>
                        <table className="queue-crm-table">
                            <thead>
                                <tr>
                                    <th>Appointment</th>
                                    <th>Date</th>
                                    <th>Token</th>
                                    <th>Status</th>
                                    <th>Review</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(payload.bookings || []).length === 0 ? (
                                    <tr><td colSpan={5} className="queue-crm-empty">No bookings found</td></tr>
                                ) : (
                                    (payload.bookings || []).map((b) => (
                                        <tr key={b._id}>
                                            <td>
                                                <div>{b.appointmentTitle || '-'}</div>
                                                <div className="queue-crm-muted">{b.specialization || '-'}</div>
                                            </td>
                                            <td>{fmt(b.appointmentDate || b.consultedAt)}</td>
                                            <td>{b.tokenNumber || '-'}</td>
                                            <td>{b.status || '-'}</td>
                                            <td>
                                                {Number(b?.patientReview?.rating || 0) > 0
                                                    ? `${Number(b.patientReview.rating).toFixed(1)}/5`
                                                    : 'No review'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="card" style={{ marginBottom: '1rem', overflowX: 'auto' }}>
                        <h3 style={{ marginBottom: '0.8rem' }}>Records Added By You</h3>
                        <table className="queue-crm-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Description</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(payload.records || []).length === 0 ? (
                                    <tr><td colSpan={3} className="queue-crm-empty">No doctor-linked records found</td></tr>
                                ) : (
                                    (payload.records || []).map((r) => (
                                        <tr key={r._id}>
                                            <td>{r.title || '-'}</td>
                                            <td>{r.description || r.ocrSummary || '-'}</td>
                                            <td>{fmtDate(r.createdAt)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="card" style={{ overflowX: 'auto' }}>
                        <h3 style={{ marginBottom: '0.8rem' }}>Medications Prescribed By You</h3>
                        <table className="queue-crm-table">
                            <thead>
                                <tr>
                                    <th>Medicine</th>
                                    <th>Schedule</th>
                                    <th>Duration</th>
                                    <th>Taken</th>
                                    <th>Skipped</th>
                                    <th>Missed</th>
                                    <th>Pending</th>
                                    <th>Adherence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(payload.medications || []).length === 0 ? (
                                    <tr><td colSpan={8} className="queue-crm-empty">No doctor-linked medications found</td></tr>
                                ) : (
                                    (payload.medications || []).map((m) => (
                                        <tr key={m._id}>
                                            <td>
                                                <div>{m.medicineName || '-'}</div>
                                                <div className="queue-crm-muted">{m.dosage || '-'}</div>
                                            </td>
                                            <td>{Array.isArray(m.scheduleTimes) && m.scheduleTimes.length ? m.scheduleTimes.join(', ') : '-'}</td>
                                            <td>{fmtDate(m.startDate)} to {fmtDate(m.endDate)}</td>
                                            <td>{m?.adherence?.taken || 0}</td>
                                            <td>{m?.adherence?.skipped || 0}</td>
                                            <td>{m?.adherence?.missed || 0}</td>
                                            <td>{m?.adherence?.pending || 0}</td>
                                            <td>{m?.adherence?.adherenceRate || 0}%</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
