import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Search, Users, Stethoscope, Star, Phone, Mail } from 'lucide-react';
import useAuthStore from '../auth/authStore';
import api from '../../shared/utils/api';
import './queue.css';

function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function DoctorCrmPage() {
    const { user } = useAuthStore();
    const isDoctor = user?.role === 'doctor';

    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({ totalUniquePatients: 0, totalConsultations: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isDoctor) return;

        const timeoutId = setTimeout(() => {
            fetchRows(search.trim());
        }, 250);

        return () => clearTimeout(timeoutId);
    }, [isDoctor, search]);

    const fetchRows = async (searchValue = '') => {
        setLoading(true);
        try {
            const res = await api.get('/queue/doctor/consulted-patients', {
                params: { search: searchValue || undefined },
            });
            const payload = res?.data?.data || {};
            setRows(Array.isArray(payload.patients) ? payload.patients : []);
            setSummary(payload.summary || { totalUniquePatients: 0, totalConsultations: 0 });
        } catch (error) {
            console.error('Failed to fetch consulted patients:', error);
            setRows([]);
            setSummary({ totalUniquePatients: 0, totalConsultations: 0 });
        } finally {
            setLoading(false);
        }
    };

    const kpis = useMemo(() => {
        const rated = rows.filter((row) => Number(row.lastReviewRating || 0) > 0).length;
        return [
            { label: 'Unique Patients', value: summary.totalUniquePatients || 0, icon: Users },
            { label: 'Total Consultations', value: summary.totalConsultations || 0, icon: Stethoscope },
            { label: 'Patients With Reviews', value: rated, icon: Star },
        ];
    }, [rows, summary]);

    if (!isDoctor) {
        return <Navigate to="/queue" replace />;
    }

    return (
        <div className="fade-in queue-page">
            <div className="page-header" style={{ marginBottom: '1.2rem' }}>
                <div>
                    <h1>Patient CRM</h1>
                    <p>All patients consulted by Dr. {user?.name}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem', marginBottom: '1rem' }}>
                {kpis.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="card queue-crm-kpi-card">
                        <div className="queue-crm-kpi-icon"><Icon size={18} /></div>
                        <div className="queue-crm-kpi-meta">
                            <p>{label}</p>
                            <h3>{value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card queue-filter-card" style={{ marginBottom: '1rem' }}>
                <div className="queue-crm-search-wrap">
                    <Search size={16} />
                    <input
                        className="input"
                        type="text"
                        placeholder="Search by patient name, email, or phone"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: 'none', boxShadow: 'none', paddingLeft: '0.2rem' }}
                    />
                </div>
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table className="queue-crm-table">
                    <thead>
                        <tr>
                            <th>Patient</th>
                            <th>Contact</th>
                            <th>Visits</th>
                            <th>Last Consulted</th>
                            <th>Last Appointment</th>
                            <th>Last Review</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="queue-crm-empty">Loading patient CRM data...</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="queue-crm-empty">No consulted patients found.</td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.key}>
                                    <td>
                                        <div className="queue-crm-patient-name">{row.name || '-'}</div>
                                        <div className="queue-crm-muted">{[row.age, row.gender].filter(Boolean).join(' | ') || '-'}</div>
                                    </td>
                                    <td>
                                        <div className="queue-crm-inline"><Phone size={14} /> {row.phone || '-'}</div>
                                        <div className="queue-crm-inline queue-crm-muted"><Mail size={14} /> {row.email || '-'}</div>
                                    </td>
                                    <td>
                                        <span className="badge badge-blue">{row.totalConsultations || 0}</span>
                                    </td>
                                    <td>{formatDateTime(row.lastConsultedAt)}</td>
                                    <td>
                                        <div>{row.lastAppointmentTitle || '-'}</div>
                                        <div className="queue-crm-muted">{row.specialization || '-'}</div>
                                    </td>
                                    <td>
                                        {Number(row.lastReviewRating || 0) > 0 ? (
                                            <>
                                                <div className="queue-crm-inline"><Star size={14} /> {Number(row.lastReviewRating).toFixed(1)}/5</div>
                                                <div className="queue-crm-muted">{row.lastReviewComment || 'No comment'}</div>
                                            </>
                                        ) : (
                                            <span className="queue-crm-muted">No review</span>
                                        )}
                                    </td>
                                    <td>
                                        {row.patientId ? (
                                            <Link className="btn btn-secondary" to={`/queue/patient-crm/${row.patientId}`}>
                                                Open
                                            </Link>
                                        ) : (
                                            <span className="queue-crm-muted">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
