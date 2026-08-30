import React from 'react';
import { ShieldAlert, Eye, MapPin, Activity } from 'lucide-react';
import { Survivor } from '../../lib/types';

interface QueueProps {
  survivors: Survivor[];
  onSelectSurvivor: (survivor: Survivor) => void;
}

export const SurvivorQueue: React.FC<QueueProps> = ({ survivors, onSelectSurvivor }) => {

  const getRiskStyle = (score: number): React.CSSProperties => {
    if (score >= 80) return { background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' };
    if (score >= 60) return { background: '#fffbeb', color: '#f59e0b', border: '1px solid #fde68a' };
    return { background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0' };
  };

  const getEnvironmentIcon = (env: string) => {
    switch (env) {
      case 'WINDOW_VOID':    return '🪟 Window Void';
      case 'ROOF_FLOOD':     return '🏠 Flooded Roof';
      case 'TREE_PERCH':     return '🌲 Tree Canopy';
      case 'RUBBLE_SURFACE': return '🧱 Rubble Pile';
      case 'WATER_RAFT':     return '🛶 Rescue Raft';
      default:               return '📍 Ground';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="#ef4444" />
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Dynamic Rescue Priority Queue
          </h2>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {survivors.length} Targets
        </span>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
        {survivors.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Activity size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.85rem' }}>No survivor targets detected yet.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>Start the simulation to see the live rescue queue.</p>
          </div>
        ) : (
          survivors.map((s, index) => {
            const rank = s.rescuePriorityRank || (index + 1);
            const isTop = rank === 1;
            return (
              <div
                key={s.code || s._id}
                onClick={() => onSelectSurvivor(s)}
                style={{
                  padding: '12px 14px',
                  background: isTop ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${isTop ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = isTop ? '#fecaca' : '#e2e8f0'; }}
              >
                {/* Row 1: Rank + Code + Environment */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.82rem',
                      padding: '2px 8px', borderRadius: '4px',
                      background: isTop ? '#ef4444' : '#f1f5f9',
                      color: isTop ? '#fff' : 'var(--text-sub)',
                      border: `1px solid ${isTop ? '#ef4444' : '#e2e8f0'}`,
                    }}>
                      #{rank}
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{s.code}</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: '#fff', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                    {getEnvironmentIcon(s.environment)}
                  </span>
                </div>

                {/* Row 2: Confidence + Risk */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Eye size={12} color="#2563eb" />
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Confidence:</span>
                    <strong style={{ fontSize: '0.78rem', color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
                      {(s.confidenceScore * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Risk:</span>
                    <span style={{ ...getRiskStyle(s.riskScore), fontSize: '0.73rem', fontWeight: 700, padding: '1px 7px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                      {s.riskScore.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Row 3: Location */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={10} />
                    {s.sector} ({s.globalPosition.x.toFixed(0)}m, {s.globalPosition.y.toFixed(0)}m)
                  </span>
                  <span style={{ color: '#2563eb', fontWeight: 500 }}>View AI Reasoning →</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
