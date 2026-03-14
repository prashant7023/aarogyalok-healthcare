/**
 * components/AdherenceStats.jsx — Compact Shopify-style inline banner
 */
import { TrendingUp, Check, X, AlertCircle, Clock } from 'lucide-react';

export default function AdherenceStats({ adherence }) {
    if (!adherence) return null;
    const { adherenceRate, taken, missed, skipped, pending, total, days } = adherence;
    const ringColor = adherenceRate >= 80 ? '#008060' : adherenceRate >= 50 ? '#b98900' : '#c43256';
    const r = 28;
    const circ = 2 * Math.PI * r;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: '12px', padding: '0.85rem 1.25rem',
            marginBottom: '1rem', flexWrap: 'wrap',
        }}>
            {/* Mini ring */}
            <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r={r} fill="none" stroke="#e9ecef" strokeWidth="5" />
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
                    <TrendingUp size={14} color="var(--primary)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)' }}>Adherence - Last {days} Days</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}><Check size={11} /> {taken} taken</span>
                    <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '3px' }}><AlertCircle size={11} /> {missed} missed</span>
                    <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '3px' }}><X size={11} /> {skipped} skipped</span>
                    <span style={{ color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={11} /> {pending} pending</span>
                </div>
            </div>

            {/* Total */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1 }}>{total}</div>
            </div>
        </div>
    );
}
