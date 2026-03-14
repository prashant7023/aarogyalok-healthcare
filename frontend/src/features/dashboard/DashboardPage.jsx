import { useEffect, useMemo, useState } from 'react';
import useAuthStore from '../auth/authStore';
import { Activity, Pill, Users, FileText, Clock3, TrendingUp } from 'lucide-react';
import api from '../../shared/utils/api';

const SEV_SCORE = { mild: 1, moderate: 2, severe: 3, critical: 3 };
const toNum = (val, fallback = 0) => (Number.isFinite(Number(val)) ? Number(val) : fallback);

const getHighestSeverity = (reports = []) => {
    const values = reports
        .map((r) => r?.aiResult?.severity)
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

    if (values.length === 0) return 'mild';

    return values.reduce((max, s) => (SEV_SCORE[s] > SEV_SCORE[max] ? s : max), 'mild');
};

export default function DashboardPage() {
    const { user } = useAuthStore();
    const role = String(user?.role || 'user').toLowerCase();
    const isEndUserRole = role === 'patient' || role === 'user';
    const isProviderRole = role === 'doctor' || role === 'admin' || role === 'hospital';
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({
        symptomChecks: 0,
        highestSeverity: 'mild',
        medications: 0,
        adherenceRate: 0,
        records: 0,
        queuePrimary: 0,
        queueSecondary: 0,
    });
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadAnalytics = async () => {
            setLoading(true);
            setError('');
            try {
                const queueRequest = isEndUserRole
                    ? api.get('/queue/my-bookings')
                    : (isProviderRole ? api.get('/queue/doctor/appointments') : api.get('/queue/my-bookings'));

                const [symptomsRes, medsRes, adherenceRes, recordsRes, queueRes] = await Promise.allSettled([
                    api.get('/symptom/history'),
                    api.get('/medication'),
                    api.get('/medication/adherence?days=7'),
                    api.get('/records'),
                    queueRequest,
                ]);

                const symptomHistory = symptomsRes.status === 'fulfilled' ? (symptomsRes.value?.data?.data || []) : [];
                const medications = medsRes.status === 'fulfilled' ? (medsRes.value?.data?.data || []) : [];
                const adherence = adherenceRes.status === 'fulfilled' ? (adherenceRes.value?.data?.data || {}) : {};
                const records = recordsRes.status === 'fulfilled' ? (recordsRes.value?.data?.data || []) : [];

                let queuePrimary = 0;
                let queueSecondary = 0;

                if (queueRes.status === 'fulfilled') {
                    const queueData = queueRes.value?.data?.data || [];
                    if (isEndUserRole) {
                        queuePrimary = queueData.filter((b) => b?.status === 'confirmed').length;
                        queueSecondary = queueData.length;
                    } else {
                        queuePrimary = queueData.length;
                        queueSecondary = queueData.reduce((sum, apt) => sum + toNum(apt?.totalTokensIssued), 0);
                    }
                }

                if (!mounted) return;

                setAnalytics({
                    symptomChecks: symptomHistory.length,
                    highestSeverity: getHighestSeverity(symptomHistory),
                    medications: medications.length,
                    adherenceRate: toNum(adherence?.adherenceRate),
                    records: records.length,
                    queuePrimary,
                    queueSecondary,
                });
            } catch (_) {
                if (!mounted) return;
                setError('Could not load complete analytics. Some cards may show 0.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadAnalytics();
        return () => { mounted = false; };
    }, [isEndUserRole, isProviderRole]);

    const cards = useMemo(() => {
        const baseCards = [
            {
                label: 'Symptom Analyses',
                value: analytics.symptomChecks,
                hint: `Highest severity: ${analytics.highestSeverity}`,
                icon: Activity,
            },
            {
                label: 'Active Medications',
                value: analytics.medications,
                hint: 'Current medication plans',
                icon: Pill,
            },
            {
                label: 'Adherence (7 Days)',
                value: `${analytics.adherenceRate}%`,
                hint: 'Dose completion ratio',
                icon: TrendingUp,
            },
            {
                label: isEndUserRole ? 'My Health Records' : 'Patient Records',
                value: analytics.records,
                hint: 'Uploaded clinical documents',
                icon: FileText,
            },
        ];

        if (isEndUserRole) {
            baseCards.push(
                {
                    label: 'Active Queue Tokens',
                    value: analytics.queuePrimary,
                    hint: 'Awaiting consultation',
                    icon: Users,
                },
                {
                    label: 'Total Bookings',
                    value: analytics.queueSecondary,
                    hint: 'All queue bookings',
                    icon: Clock3,
                }
            );
        } else {
            baseCards.push(
                {
                    label: 'Appointments Managed',
                    value: analytics.queuePrimary,
                    hint: 'Doctor queue sessions',
                    icon: Users,
                },
                {
                    label: 'Tokens Issued',
                    value: analytics.queueSecondary,
                    hint: 'Across all appointments',
                    icon: Clock3,
                }
            );
        }

        return baseCards;
    }, [analytics, isEndUserRole]);

    const roleLabel = isEndUserRole ? 'Patient/User' : (isProviderRole ? 'Doctor/Admin' : role);

    return (
        <div className="fade-in">
            <div className="card" style={{ marginBottom: '1rem', padding: '1.4rem' }}>
                <div className="badge badge-blue" style={{ marginBottom: '0.65rem' }}>ArogyaLok Platform</div>
                <h1 style={{ marginBottom: '0.35rem' }}>
                    Welcome, {user?.name?.split(' ')[0] || 'User'}
                </h1>
                <p style={{ maxWidth: 680 }}>
                    Dashboard now shows analytics only: symptom activity, medication adherence, queue progress, and records insights.
                </p>
                <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-gray">Role: {roleLabel}</span>
                    <span className="badge badge-green">Analytics Mode</span>
                </div>
            </div>

            {error && (
                <div className="form-error" style={{ marginBottom: '0.8rem' }}>
                    {error}
                </div>
            )}

            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                {cards.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                                <div className="stat-label">{s.label}</div>
                                <Icon size={15} color="var(--text-light)" />
                            </div>
                            <div className="stat-value">{loading ? '...' : s.value}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>{s.hint}</div>
                        </div>
                    );
                })}
            </div>

            <div className="card" style={{ padding: '1rem 1.1rem' }}>
                <h3 style={{ fontSize: '0.98rem', marginBottom: '0.35rem' }}>Analytics Notes</h3>
                <p style={{ fontSize: '0.86rem' }}>
                    These numbers are calculated from live feature data. Use side navigation for operations and this dashboard for monitoring trends.
                </p>
            </div>
        </div>
    );
}
