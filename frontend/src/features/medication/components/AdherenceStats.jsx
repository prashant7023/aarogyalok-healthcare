/**
 * components/AdherenceStats.jsx — Compact Shopify-style inline banner
 */
import { TrendingUp, Check, X, AlertCircle, Clock } from 'lucide-react';

export default function AdherenceStats({ adherence }) {
    if (!adherence) return null;
    const { adherenceRate, taken, missed, skipped, pending, total, days } = adherence;
    const ringColor = adherenceRate >= 80 ? '#10b981' : adherenceRate >= 50 ? '#f59e0b' : '#ef4444';
    const r = 28;
    const circ = 2 * Math.PI * r;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            background: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
            borderRadius: '12px', padding: '0.85rem 1.25rem',
            marginBottom: '1rem', flexWrap: 'wrap',
        }}>
            {/* Mini ring */}
            <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
                    <circle cx="28" cy="28" r={r} fill="none" stroke={ringColor} strokeWidth="5"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - adherenceRate / 100)}
                        strokeLinecap="round" transform="rotate(-90 28 28)"
                    />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: ringColor }}>{adherenceRate}%</span>
                </div>
            </div>

            {/* Label + breakdown */}
            <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <TrendingUp size={14} color="#60a5fa" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Adherence — Last {days} Days</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}><Check size={11} /> {taken} taken</span>
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}><AlertCircle size={11} /> {missed} missed</span>
                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}><X size={11} /> {skipped} skipped</span>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={11} /> {pending} pending</span>
                </div>
            </div>

            {/* Total */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{total}</div>
            </div>
        </div>
    );
}
