import { useMemo, useState } from 'react';
import useAuthStore from '../auth/authStore';
import { BadgeCheck, CreditCard, Stethoscope, UserRound, CheckCircle2, Sparkles } from 'lucide-react';

const subKey = (role) => `aarogyalok-subscription-${role}`;

export default function SubscriptionPage() {
    const { user } = useAuthStore();
    const role = String(user?.role || 'patient').toLowerCase();
    const isDoctor = role === 'doctor';
    const [billingCycle, setBillingCycle] = useState('monthly');

    const plans = useMemo(() => {
        if (isDoctor) {
            return [
                {
                    id: 'doctor-basic',
                    name: 'Doctor Basic',
                    monthlyPrice: 0,
                    yearlyPrice: 0,
                    description: 'Start and manage consultations with core tools.',
                    features: ['Queue management', 'Patient reports', 'Symptom workflow'],
                },
                {
                    id: 'doctor-pro',
                    name: 'Doctor Pro',
                    monthlyPrice: 599,
                    yearlyPrice: 1499,
                    description: 'Designed for active practice optimization.',
                    highlighted: true,
                    features: ['Advanced analytics', 'Priority support', 'Practice growth insights', 'Priority listing in search'],
                },
            ];
        }

        return [
            {
                id: 'patient-basic',
                name: 'Patient Basic',
                monthlyPrice: 0,
                yearlyPrice: 0,
                description: 'Essential tools for daily health tracking.',
                features: ['Symptom checker', 'Medication reminders', 'Queue booking'],
            },
            {
                id: 'patient-plus',
                name: 'Patient Plus',
                monthlyPrice: 199,
                yearlyPrice: 1990,
                description: 'For proactive and continuous health monitoring.',
                highlighted: true,
                features: ['Extended report history', 'Priority appointment assistance', 'Health trend insights', 'Premium summary reports'],
            },
        ];
    }, [isDoctor]);

    const defaultPlan = plans[0]?.id;
    const [activePlan, setActivePlan] = useState(localStorage.getItem(subKey(role)) || defaultPlan);

    const choosePlan = (id) => {
        setActivePlan(id);
        localStorage.setItem(subKey(role), id);
    };

    return (
        <div className="fade-in" style={{ display: 'grid', gap: '0.9rem' }}>
            <div className="card" style={{ padding: '1rem 1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Sparkles size={18} color="#2563eb" /> Subscription
                        </h2>
                        <p style={{ color: 'var(--text-light)', margin: 0 }}>
                            Choose the right {isDoctor ? 'doctor' : 'patient'} plan for AarogyaLok workflows.
                        </p>
                    </div>

                    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: '999px', padding: '2px', background: '#fff' }}>
                        <button
                            className={billingCycle === 'monthly' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                            onClick={() => setBillingCycle('monthly')}
                            type="button"
                        >
                            Monthly
                        </button>
                        <button
                            className={billingCycle === 'yearly' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                            onClick={() => setBillingCycle('yearly')}
                            type="button"
                        >
                            Yearly
                        </button>
                    </div>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '0.2rem' }}>
                {plans.map((plan) => {
                    const active = activePlan === plan.id;
                    const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                    const priceLabel = amount === 0 ? 'Free' : `₹${amount.toLocaleString('en-IN')}`;
                    const cycleLabel = amount === 0 ? '' : billingCycle === 'yearly' ? '/ year' : '/ month';
                    return (
                        <div
                            key={plan.id}
                            className="stat-card"
                            style={{
                                border: active || plan.highlighted ? '1px solid #2563eb' : '1px solid var(--border)',
                                background: active || plan.highlighted
                                    ? 'linear-gradient(180deg, #f7fbff 0%, #ffffff 70%)'
                                    : '#fff',
                                boxShadow: active || plan.highlighted ? '0 10px 22px rgba(37,99,235,0.10)' : undefined,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <div style={{ fontWeight: 700 }}>{plan.name}</div>
                                {isDoctor ? <Stethoscope size={15} color="var(--text-light)" /> : <UserRound size={15} color="var(--text-light)" />}
                            </div>
                            {plan.highlighted && (
                                <span className="badge badge-blue" style={{ marginBottom: '0.45rem' }}>Most Popular</span>
                            )}

                            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{priceLabel} <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{cycleLabel}</span></div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>{plan.description}</div>

                            <ul style={{ margin: '0.55rem 0 0.75rem', paddingLeft: '1.1rem', color: 'var(--text-mid)', fontSize: '0.84rem' }}>
                                {plan.features.map((f) => (
                                    <li key={f} style={{ listStyle: 'none', marginBottom: '0.28rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <CheckCircle2 size={14} color="#16a34a" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <button className={active ? 'btn btn-secondary' : 'btn btn-primary'} onClick={() => choosePlan(plan.id)}>
                                {active ? <><BadgeCheck size={15} /> Active</> : <><CreditCard size={15} /> Choose Plan</>}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="card" style={{ padding: '1rem 1.1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-mid)' }}>
                    Current plan: <strong>{plans.find((p) => p.id === activePlan)?.name || 'N/A'}</strong> ({billingCycle})
                </div>
            </div>
        </div>
    );
}
