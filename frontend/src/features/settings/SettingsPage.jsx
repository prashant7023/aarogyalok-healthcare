import { useMemo, useState } from 'react';
import useAuthStore from '../auth/authStore';
import { Bell, ShieldCheck, Globe, Save } from 'lucide-react';

const prefKey = (role) => `aarogyalok-settings-${role}`;

export default function SettingsPage() {
    const { user } = useAuthStore();
    const role = String(user?.role || 'patient').toLowerCase();
    const isDoctor = role === 'doctor';

    const initial = useMemo(() => {
        try {
            const raw = localStorage.getItem(prefKey(role));
            if (raw) return JSON.parse(raw);
        } catch (_) {
            // ignore malformed local storage
        }

        return {
            emailNotifications: true,
            pushNotifications: true,
            language: 'en',
            privacyMode: false,
            clinicAlerts: true,
            medicationAlerts: true,
        };
    }, [role]);

    const [settings, setSettings] = useState(initial);
    const [saved, setSaved] = useState(false);

    const update = (key, value) => {
        setSaved(false);
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const save = () => {
        localStorage.setItem(prefKey(role), JSON.stringify(settings));
        setSaved(true);
    };

    return (
        <div className="fade-in" style={{ display: 'grid', gap: '0.9rem' }}>
            <div className="card" style={{ padding: '1rem 1.1rem' }}>
                <h2 style={{ marginBottom: '0.35rem' }}>Settings</h2>
                <p style={{ color: 'var(--text-light)', margin: 0 }}>
                    Manage your {isDoctor ? 'doctor' : 'patient'} preferences.
                </p>
            </div>

            <div className="card" style={{ padding: '1rem 1.1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Bell size={16} /> Notifications
                </div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Email notifications</span>
                        <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => update('emailNotifications', e.target.checked)} />
                    </label>
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Push notifications</span>
                        <input type="checkbox" checked={settings.pushNotifications} onChange={(e) => update('pushNotifications', e.target.checked)} />
                    </label>
                    {isDoctor ? (
                        <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Clinic queue alerts</span>
                            <input type="checkbox" checked={settings.clinicAlerts} onChange={(e) => update('clinicAlerts', e.target.checked)} />
                        </label>
                    ) : (
                        <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Medication reminder alerts</span>
                            <input type="checkbox" checked={settings.medicationAlerts} onChange={(e) => update('medicationAlerts', e.target.checked)} />
                        </label>
                    )}
                </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Globe size={16} /> Preferences
                </div>
                <div style={{ display: 'grid', gap: '0.65rem' }}>
                    <label style={{ display: 'grid', gap: '0.25rem' }}>
                        <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Language</span>
                        <select className="input" value={settings.language} onChange={(e) => update('language', e.target.value)}>
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                        </select>
                    </label>
                </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ShieldCheck size={16} /> Privacy
                </div>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hide sensitive data previews</span>
                    <input type="checkbox" checked={settings.privacyMode} onChange={(e) => update('privacyMode', e.target.checked)} />
                </label>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={save}>
                    <Save size={15} /> Save Settings
                </button>
                {saved && <span style={{ color: '#16a34a', fontSize: '0.86rem' }}>Saved successfully.</span>}
            </div>
        </div>
    );
}
