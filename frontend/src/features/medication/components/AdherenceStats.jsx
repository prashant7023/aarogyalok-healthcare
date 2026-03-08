/**
 * components/AdherenceStats.jsx
 * 
 * Displays a 7-day adherence score card.
 * Data from GET /api/medication/adherence?days=7
 */
import { TrendingUp, Check, X, AlertCircle, Clock } from 'lucide-react';

export default function AdherenceStats({ adherence }) {
    if (!adherence) return null;

    const { adherenceRate, taken, missed, skipped, pending, total, days } = adherence;

    const ringColor = adherenceRate >= 80 ? '#10b981' : adherenceRate >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', border: 'none', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Circular progress */}
                <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                    <svg width="90" height="90" viewBox="0 0 90 90">
                        <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
                        <circle cx="45" cy="45" r="38" fill="none" stroke={ringColor} strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 38}`}
                            strokeDashoffset={`${2 * Math.PI * 38 * (1 - adherenceRate / 100)}`}
                            strokeLinecap="round"
                            transform="rotate(-90 45 45)"
                        />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: ringColor }}>{adherenceRate}%</span>
                    </div>
                </div>

                {/* Summary */}
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                        <TrendingUp size={18} color="#60a5fa" />
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Adherence — Last {days} Days</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> {taken} taken</span>
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={13} /> {missed} missed</span>
                        <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={13} /> {skipped} skipped</span>
                        <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {pending} pending</span>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px' }}>Total reminders</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{total}</div>
                </div>
            </div>
        </div>
    );
}
