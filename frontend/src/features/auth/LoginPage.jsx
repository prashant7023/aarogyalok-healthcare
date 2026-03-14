import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from './authStore';
import { Activity } from 'lucide-react';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page fade-in">
            <div className="auth-shell">
                <div className="auth-brand">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.45rem' }}>
                        <Activity size={28} color="#005bd3" strokeWidth={2.3} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>AarogyaLok</h1>
                    <p style={{ fontSize: '0.88rem', color: '#616161' }}>Healthcare Operations Platform</p>
                </div>

                <div className="auth-card">
                    <h2 style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '1.2rem' }}>Sign in</h2>

                    {error && (
                        <div style={{ background: '#fff1f4', color: '#a32043', padding: '0.7rem 0.85rem', borderRadius: '8px', marginBottom: '0.9rem', fontSize: '0.84rem', border: '1px solid #ffd3df' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                className="input"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                className="input"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            />
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1rem', color: '#616161', fontSize: '0.85rem' }}>
                        New here? <Link to="/register" style={{ color: '#005bd3', fontWeight: 700, textDecoration: 'none' }}>Create account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
