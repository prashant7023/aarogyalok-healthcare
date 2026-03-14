import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from './authStore';
import { Activity } from 'lucide-react';
import api from '../../shared/utils/api';

// Removing Hospital from frontend UI, retaining Patient and Doctor
const ROLES = [
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor' }
];

export default function RegisterPage() {
    const [form, setForm] = useState({
        name: '', email: '', password: '', role: 'patient',
        // Doctor-specific fields
        specialization: '', qualification: '', experience: '', consultationFee: '', clinicAddress: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { name, email, password, role, ...extra } = form;
            // Strip empty optional doctor fields; keep non-empty ones
            const extraData = Object.fromEntries(
                Object.entries(extra).filter(([, v]) => v !== '')
            );
            const res = await api.post('/auth/register', { name, email, password, role, ...extraData });
            const { user, token } = res.data.data;
            useAuthStore.getState().setAuth(user, token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page fade-in">
            <div className="auth-shell" style={{ maxWidth: '450px' }}>
                <div className="auth-brand">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.45rem' }}>
                        <Activity size={28} color="#005bd3" strokeWidth={2.3} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Create account</h1>
                    <p style={{ fontSize: '0.88rem', color: '#616161' }}>Patient and doctor onboarding</p>
                </div>

                <div className="auth-card">
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Registration</h2>

                    {error && (
                        <div style={{ background: '#fff1f4', color: '#a32043', padding: '0.7rem 0.85rem', borderRadius: '8px', marginBottom: '0.9rem', fontSize: '0.84rem', border: '1px solid #ffd3df' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {ROLES.map(r => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, role: r.value }))}
                                style={{
                                    padding: '0.65rem 0.5rem', borderRadius: '8px', border: '1px solid',
                                    borderColor: form.role === r.value ? '#005bd3' : '#d2d5d8',
                                    background: form.role === r.value ? '#ebf4ff' : '#fff',
                                    color: form.role === r.value ? '#0048a8' : '#616161',
                                    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                                    transition: 'all .15s',
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit}>
                        {[['Full Name', 'text', 'name', 'e.g. Ramesh Kumar'], ['Email', 'email', 'email', 'you@example.com'], ['Password', 'password', 'password', '••••••••']].map(([label, type, key, ph]) => (
                            <div className="form-group" key={key}>
                                <label>{label}</label>
                                <input
                                    className="input"
                                    type={type}
                                    placeholder={ph}
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                />
                            </div>
                        ))}

                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1rem', color: '#616161', fontSize: '0.85rem' }}>
                        Already registered? <Link to="/login" style={{ color: '#005bd3', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
