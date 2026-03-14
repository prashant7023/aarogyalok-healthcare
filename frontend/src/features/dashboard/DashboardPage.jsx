import { useEffect, useMemo, useState } from 'react';
import useAuthStore from '../auth/authStore';
import { Activity, Pill, Users, FileText, Clock3, TrendingUp } from 'lucide-react';
import api from '../../shared/utils/api';

const SEV_SCORE = { mild: 1, moderate: 2, severe: 3, critical: 3 };
const toNum = (val, fallback = 0) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const getHighestSeverity = (reports = []) => {
    const values = reports
        .map((r) => r?.aiResult?.severity)
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

    if (values.length === 0) return 'mild';

    return values.reduce((max, s) => (SEV_SCORE[s] > SEV_SCORE[max] ? s : max), 'mild');
};

function CircularStat({ label, value, subtitle, color = '#2563eb' }) {
    const safe = clamp(Number(value) || 0, 0, 100);
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const dash = (safe / 100) * circumference;

    return (
        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="78" height="78" viewBox="0 0 78 78" aria-hidden="true">
                <circle cx="39" cy="39" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                    cx="39"
                    cy="39"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    transform="rotate(-90 39 39)"
                />
                <text x="39" y="43" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{safe}%</text>
            </svg>
            <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{subtitle}</div>
            </div>
        </div>
    );
}

function BarTrend({ title, items = [], color = '#2563eb' }) {
    const max = Math.max(...items.map((x) => x.value), 1);
    return (
        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.8rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>{title}</div>
            <div style={{ display: 'grid', gap: '0.45rem' }}>
                {items.map((it) => (
                    <div key={it.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.18rem' }}>
                            <span>{it.label}</span>
                            <strong>{it.value}</strong>
                        </div>
                        <div style={{ width: '100%', height: '7px', borderRadius: '999px', background: '#e2e8f0' }}>
                            <div style={{ width: `${(it.value / max) * 100}%`, height: '100%', borderRadius: '999px', background: color }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AnalyticsLineChart({ title, subtitle, labels = [], series = [] }) {
    const width = 760;
    const height = 240;
    const left = 42;
    const right = 16;
    const top = 20;
    const bottom = 34;
    const chartW = width - left - right;
    const chartH = height - top - bottom;

    const allValues = series.flatMap((s) => s.data || []);
    const maxVal = Math.max(...allValues, 1);
    const steps = 4;

    const x = (i) => left + (labels.length <= 1 ? 0 : (i / (labels.length - 1)) * chartW);
    const y = (v) => top + chartH - (v / maxVal) * chartH;

    const linePath = (data = []) => data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
    const areaPath = (data = []) => {
        if (!data.length) return '';
        const startX = x(0);
        const endX = x(data.length - 1);
        return `${linePath(data)} L ${endX} ${top + chartH} L ${startX} ${top + chartH} Z`;
    };

    return (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.85rem 0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.7rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{title}</div>
                    {subtitle && <div style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>{subtitle}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {series.map((s) => (
                        <span key={s.key} style={{ fontSize: '0.72rem', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '0.18rem 0.5rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '999px', background: s.color }} /> {s.label}
                        </span>
                    ))}
                </div>
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 560, display: 'block' }} role="img" aria-label={title}>
                    {[...Array(steps + 1)].map((_, i) => {
                        const val = (maxVal / steps) * i;
                        const yy = y(val);
                        return (
                            <g key={i}>
                                <line x1={left} y1={yy} x2={width - right} y2={yy} stroke="#e2e8f0" strokeWidth="1" />
                                <text x={left - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(val)}</text>
                            </g>
                        );
                    })}

                    {series.map((s) => (
                        <g key={s.key}>
                            <path d={areaPath(s.data)} fill={s.color} opacity="0.12" />
                            <path d={linePath(s.data)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
                            {(s.data || []).map((v, i) => (
                                <circle key={`${s.key}-${i}`} cx={x(i)} cy={y(v)} r="2.6" fill={s.color} />
                            ))}
                        </g>
                    ))}

                    {labels.map((lb, i) => (
                        <text key={lb + i} x={x(i)} y={height - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">{lb}</text>
                    ))}
                </svg>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const role = String(user?.role || 'user').toLowerCase();
    const isEndUserRole = role === 'patient' || role === 'user';
    const isProviderRole = role === 'doctor' || role === 'admin' || role === 'hospital';
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({
        symptomChecks: 0,
        symptomChecks7d: 0,
        highestSeverity: 'mild',
        medications: 0,
        adherenceRate: 0,
        remindersToday: 0,
        remindersPendingToday: 0,
        records: 0,
        queuePrimary: 0,
        queueSecondary: 0,
    });
    const [error, setError] = useState('');
    const [reportData, setReportData] = useState({
        symptomHistory: [],
        medications: [],
        remindersToday: [],
        records: [],
        queueData: [],
    });

    useEffect(() => {
        let mounted = true;

        const loadAnalytics = async () => {
            setLoading(true);
            setError('');
            try {
                const queueRequest = isEndUserRole
                    ? api.get('/queue/my-bookings')
                    : (isProviderRole ? api.get('/queue/doctor/appointments') : api.get('/queue/my-bookings'));

                const [symptomsRes, medsRes, adherenceRes, remindersRes, recordsRes, queueRes] = await Promise.allSettled([
                    api.get('/symptom/history'),
                    api.get('/medication'),
                    api.get('/medication/adherence?days=7'),
                    api.get('/medication/reminders/today'),
                    api.get('/records'),
                    queueRequest,
                ]);

                const symptomHistory = symptomsRes.status === 'fulfilled' ? (symptomsRes.value?.data?.data || []) : [];
                const medications = medsRes.status === 'fulfilled' ? (medsRes.value?.data?.data || []) : [];
                const adherence = adherenceRes.status === 'fulfilled' ? (adherenceRes.value?.data?.data || {}) : {};
                const remindersToday = remindersRes.status === 'fulfilled' ? (remindersRes.value?.data?.data || []) : [];
                const records = recordsRes.status === 'fulfilled' ? (recordsRes.value?.data?.data || []) : [];

                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                const symptomChecks7d = symptomHistory.filter((r) => {
                    const t = new Date(r?.createdAt || 0).getTime();
                    return Number.isFinite(t) && t >= sevenDaysAgo.getTime();
                }).length;

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
                    symptomChecks7d,
                    highestSeverity: getHighestSeverity(symptomHistory),
                    medications: medications.length,
                    adherenceRate: toNum(adherence?.adherenceRate),
                    remindersToday: remindersToday.length,
                    remindersPendingToday: remindersToday.filter((r) => r?.status === 'pending').length,
                    records: records.length,
                    queuePrimary,
                    queueSecondary,
                });

                setReportData({
                    symptomHistory,
                    medications,
                    remindersToday,
                    records,
                    queueData: queueRes.status === 'fulfilled' ? (queueRes.value?.data?.data || []) : [],
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
    const adherenceBand = analytics.adherenceRate >= 80 ? 'Good' : analytics.adherenceRate >= 50 ? 'Average' : 'Needs Attention';
    const reportTitle = isEndUserRole ? 'Personalized Report' : 'Dashboard Analytics';
    const reportSubtitle = isEndUserRole
        ? 'Your health activity snapshot built from symptoms, medication, queue, and records data.'
        : 'Platform analytics across clinical operations.';

    const presentSnapshot = useMemo(() => {
        const latestSymptom = [...reportData.symptomHistory]
            .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0];
        const latestRecord = [...reportData.records]
            .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0];

        const activeQueue = reportData.queueData.filter((q) => ['confirmed', 'pending'].includes(String(q?.status || '').toLowerCase())).length;
        const remindersPending = reportData.remindersToday.filter((r) => r?.status === 'pending').length;

        const sortedBookings = [...reportData.queueData].sort((a, b) => {
            const ta = new Date(a?.appointmentId?.appointmentDate || a?.appointmentDate || a?.updatedAt || a?.createdAt || 0).getTime();
            const tb = new Date(b?.appointmentId?.appointmentDate || b?.appointmentDate || b?.updatedAt || b?.createdAt || 0).getTime();
            return tb - ta;
        });

        const consultedBookings = sortedBookings
            .filter((b) => {
                const status = String(b?.status || '').toLowerCase();
                const markedBy = String(b?.markedBy || '').toLowerCase();
                return status === 'completed' || markedBy === 'completed';
            });

        const lastConsulted = consultedBookings[0] || sortedBookings[0];
        const lastConsultedDoctor =
            lastConsulted?.appointmentId?.doctorId?.name ||
            lastConsulted?.appointmentId?.doctorName ||
            lastConsulted?.doctorId?.name ||
            lastConsulted?.doctorName ||
            'Not available';
        const lastConsultedAt =
            lastConsulted?.appointmentId?.appointmentDate ||
            lastConsulted?.appointmentDate ||
            lastConsulted?.updatedAt ||
            lastConsulted?.createdAt ||
            null;

        return {
            latestSeverity: String(latestSymptom?.aiResult?.severity || 'Not available'),
            latestSymptomAt: latestSymptom?.createdAt || null,
            activeMedications: reportData.medications.length,
            remindersPending,
            activeQueue,
            lastConsultedDoctor,
            lastConsultedAt,
            latestRecordTitle: latestRecord?.title || 'Not available',
            latestRecordAt: latestRecord?.createdAt || null,
        };
    }, [reportData]);

    const historySummary = useMemo(() => {
        const now = Date.now();
        const daysAgo = (d) => now - d * 24 * 60 * 60 * 1000;

        const countSince = (arr, d) =>
            arr.filter((x) => new Date(x?.createdAt || x?.scheduledAt || 0).getTime() >= daysAgo(d)).length;

        const symptoms30d = countSince(reportData.symptomHistory, 30);
        const records30d = countSince(reportData.records, 30);
        const bookings30d = countSince(reportData.queueData, 30);

        const recentActivity = [
            ...reportData.symptomHistory.map((x) => ({ type: 'Symptom check', when: x?.createdAt, label: x?.aiResult?.severity || 'Analysis' })),
            ...reportData.records.map((x) => ({ type: 'Record uploaded', when: x?.createdAt, label: x?.title || 'Document' })),
            ...reportData.queueData.map((x) => ({ type: 'Queue booking', when: x?.createdAt, label: x?.status || 'Status' })),
        ]
            .filter((x) => x.when)
            .sort((a, b) => new Date(b.when) - new Date(a.when))
            .slice(0, 5);

        return { symptoms30d, records30d, bookings30d, recentActivity };
    }, [reportData]);

    const graphData = useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 27);
        weekStart.setHours(0, 0, 0, 0);

        const weeks = [0, 1, 2, 3].map((i) => ({ label: `W${i + 1}`, value: 0 }));
        reportData.symptomHistory.forEach((s) => {
            const t = new Date(s?.createdAt || 0).getTime();
            if (!Number.isFinite(t) || t < weekStart.getTime()) return;
            const diffDays = Math.floor((t - weekStart.getTime()) / (24 * 60 * 60 * 1000));
            const idx = Math.min(3, Math.floor(diffDays / 7));
            weeks[idx].value += 1;
        });

        const pending = reportData.remindersToday.filter((r) => r?.status === 'pending').length;
        const done = reportData.remindersToday.filter((r) => ['taken', 'skipped'].includes(String(r?.status || '').toLowerCase())).length;
        const total = reportData.remindersToday.length || 1;
        const completion = clamp(Math.round((done / total) * 100));

        const dayLabels = [];
        const symptomDaily = [];
        const bookingDaily = [];
        const recordsDaily = [];

        const mkDayKey = (d) => {
            const x = new Date(d);
            x.setHours(0, 0, 0, 0);
            return x.getTime();
        };

        const nowDay = new Date();
        nowDay.setHours(0, 0, 0, 0);
        const start14 = new Date(nowDay);
        start14.setDate(start14.getDate() - 13);

        const symptomMap = new Map();
        const bookingMap = new Map();
        const recordMap = new Map();

        reportData.symptomHistory.forEach((x) => {
            const key = mkDayKey(x?.createdAt || 0);
            if (key < start14.getTime()) return;
            symptomMap.set(key, (symptomMap.get(key) || 0) + 1);
        });
        reportData.queueData.forEach((x) => {
            const key = mkDayKey(x?.createdAt || x?.appointmentDate || 0);
            if (key < start14.getTime()) return;
            bookingMap.set(key, (bookingMap.get(key) || 0) + 1);
        });
        reportData.records.forEach((x) => {
            const key = mkDayKey(x?.createdAt || 0);
            if (key < start14.getTime()) return;
            recordMap.set(key, (recordMap.get(key) || 0) + 1);
        });

        for (let i = 0; i < 14; i += 1) {
            const d = new Date(start14);
            d.setDate(start14.getDate() + i);
            const key = d.getTime();
            dayLabels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
            symptomDaily.push(symptomMap.get(key) || 0);
            bookingDaily.push(bookingMap.get(key) || 0);
            recordsDaily.push(recordMap.get(key) || 0);
        }

        return {
            symptomWeekly: weeks,
            trendLabels14d: dayLabels,
            symptomDaily14d: symptomDaily,
            bookingDaily14d: bookingDaily,
            recordDaily14d: recordsDaily,
            reminderCompletion: completion,
            queueBars: [
                { label: 'Bookings (30d)', value: historySummary.bookings30d },
                { label: 'Records (30d)', value: historySummary.records30d },
                { label: 'Symptoms (30d)', value: historySummary.symptoms30d },
            ],
            pendingRatio: clamp(Math.round((pending / total) * 100)),
        };
    }, [reportData, historySummary]);

    const fmt = (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return '—';
        return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="fade-in">
            <div className="card" style={{ marginBottom: '1rem', padding: '1.4rem' }}>
                <div className="badge badge-blue" style={{ marginBottom: '0.65rem' }}>ArogyaLok Platform</div>
                <h1 style={{ marginBottom: '0.35rem' }}>
                    {reportTitle}: {user?.name?.split(' ')[0] || 'User'}
                </h1>
                <p style={{ maxWidth: 680 }}>
                    {reportSubtitle}
                </p>
                <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-gray">Role: {roleLabel}</span>
                    <span className="badge badge-green">{isEndUserRole ? 'Patient Specific' : 'Analytics Mode'}</span>
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

            {isEndUserRole && (
                <div className="card" style={{ padding: '1rem 1.1rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.98rem', marginBottom: '0.7rem' }}>Personalized Insights</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.7rem' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Symptom checks (7 days)</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{loading ? '...' : analytics.symptomChecks7d}</div>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Today reminders pending</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{loading ? '...' : analytics.remindersPendingToday}</div>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Today reminders total</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{loading ? '...' : analytics.remindersToday}</div>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Adherence status</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{loading ? '...' : adherenceBand}</div>
                        </div>
                    </div>
                </div>
            )}

            {isEndUserRole && (
                <>
                    <div className="card" style={{ padding: '1rem 1.1rem', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.98rem', marginBottom: '0.7rem' }}>Present Status</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.7rem' }}>
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Latest symptom severity</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, textTransform: 'capitalize' }}>{loading ? '...' : presentSnapshot.latestSeverity}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Updated: {loading ? '...' : fmt(presentSnapshot.latestSymptomAt)}</div>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Current treatment load</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{loading ? '...' : `${presentSnapshot.activeMedications} active meds`}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{loading ? '...' : `${presentSnapshot.remindersPending} reminders pending today`}</div>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Current queue status</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{loading ? '...' : `${presentSnapshot.activeQueue} active bookings`}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Track in Queue module</div>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Last consulted doctor</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{loading ? '...' : presentSnapshot.lastConsultedDoctor}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Consultation date: {loading ? '...' : fmt(presentSnapshot.lastConsultedAt)}</div>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Latest clinical record</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{loading ? '...' : presentSnapshot.latestRecordTitle}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Uploaded: {loading ? '...' : fmt(presentSnapshot.latestRecordAt)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1rem 1.1rem', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.98rem', marginBottom: '0.7rem' }}>History (Last 30 Days)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.7rem', marginBottom: '0.75rem' }}>
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Symptom analyses</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{loading ? '...' : historySummary.symptoms30d}</div>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Records uploaded</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{loading ? '...' : historySummary.records30d}</div>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Queue bookings</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{loading ? '...' : historySummary.bookings30d}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '0.4rem' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.45rem' }}>Recent Activity Timeline</div>
                            {loading ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Loading timeline...</div>
                            ) : historySummary.recentActivity.length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>No recent activity found.</div>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.45rem' }}>
                                    {historySummary.recentActivity.map((a, idx) => (
                                        <div key={`${a.type}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.84rem', borderBottom: '1px dashed var(--border)', paddingBottom: '0.4rem' }}>
                                            <div>
                                                <strong>{a.type}</strong> — <span style={{ textTransform: 'capitalize' }}>{a.label}</span>
                                            </div>
                                            <span style={{ color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{fmt(a.when)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1rem 1.1rem', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.98rem', marginBottom: '0.7rem' }}>Visual Health Graphs</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '0.75rem' }}>
                            <CircularStat
                                label="Reminder completion today"
                                value={loading ? 0 : graphData.reminderCompletion}
                                subtitle={loading ? 'Loading...' : `${graphData.reminderCompletion}% complete`}
                                color="#0ea5e9"
                            />
                            <CircularStat
                                label="Pending reminder pressure"
                                value={loading ? 0 : graphData.pendingRatio}
                                subtitle={loading ? 'Loading...' : `${analytics.remindersPendingToday} pending`}
                                color="#f59e0b"
                            />
                            <BarTrend
                                title="Symptom trend (last 4 weeks)"
                                items={loading ? [{ label: 'W1', value: 0 }, { label: 'W2', value: 0 }, { label: 'W3', value: 0 }, { label: 'W4', value: 0 }] : graphData.symptomWeekly}
                                color="#2563eb"
                            />
                            <BarTrend
                                title="History volume comparison"
                                items={loading ? [{ label: 'Bookings (30d)', value: 0 }, { label: 'Records (30d)', value: 0 }, { label: 'Symptoms (30d)', value: 0 }] : graphData.queueBars}
                                color="#16a34a"
                            />
                        </div>

                        <div style={{ marginTop: '0.75rem' }}>
                            <AnalyticsLineChart
                                title="Engagement trend (last 14 days)"
                                subtitle="Daily activity for last 14 days"
                                labels={loading ? Array.from({ length: 14 }, (_, i) => `D${i + 1}`) : graphData.trendLabels14d}
                                series={[
                                    { key: 'symptoms', label: 'Symptoms', color: '#2563eb', data: loading ? Array(14).fill(0) : graphData.symptomDaily14d },
                                    { key: 'bookings', label: 'Bookings', color: '#16a34a', data: loading ? Array(14).fill(0) : graphData.bookingDaily14d },
                                    { key: 'records', label: 'Records', color: '#f59e0b', data: loading ? Array(14).fill(0) : graphData.recordDaily14d },
                                ]}
                            />
                        </div>
                    </div>
                </>
            )}

            <div className="card" style={{ padding: '1rem 1.1rem' }}>
                <h3 style={{ fontSize: '0.98rem', marginBottom: '0.35rem' }}>{isEndUserRole ? 'Personalized Report Notes' : 'Analytics Notes'}</h3>
                <p style={{ fontSize: '0.86rem' }}>
                    These numbers are calculated from live feature data. Use side navigation for operations and this dashboard for monitoring trends.
                </p>
            </div>
        </div>
    );
}
