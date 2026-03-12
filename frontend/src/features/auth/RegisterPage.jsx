import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from './authStore';
import { Activity } from 'lucide-react';

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
            // authStore.register only passes role; we need to send extraData too
            const res = await import('../../shared/utils/api').then(m =>
                m.default.post('/auth/register', { name, email, password, role, ...extraData })
            );
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
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}><Activity size={48} color="#fff" strokeWidth={2} /></div>
                    <h1 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '0.25rem' }}>Join AarogyaLok</h1>
                    <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.9rem' }}>Create your health account</p>
                </div>

                <div className="card" style={{ background: 'rgba(255,255,255,.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.1)' }}>
                    <h2 style={{ color: '#fff', marginBottom: '1.5rem' }}>Create Account</h2>

                    {error && (
                        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Role selector */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {ROLES.map(r => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, role: r.value }))}
                                style={{
                                    padding: '0.65rem 0.5rem', borderRadius: '8px', border: '1px solid',
                                    borderColor: form.role === r.value ? '#60a5fa' : 'rgba(255,255,255,.15)',
                                    background: form.role === r.value ? 'rgba(96,165,250,.2)' : 'rgba(255,255,255,.05)',
                                    color: form.role === r.value ? '#93c5fd' : 'rgba(255,255,255,.55)',
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
                                <label style={{ color: 'rgba(255,255,255,.7)' }}>{label}</label>
                                <input
                                    className="input"
                                    type={type}
                                    placeholder={ph}
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff' }}
                                />
                            </div>
                        ))}

                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'rgba(255,255,255,.45)', fontSize: '0.875rem' }}>
                        Already have an account? <Link to="/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
