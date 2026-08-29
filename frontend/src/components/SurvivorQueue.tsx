import React from 'react';
import { ShieldAlert, Eye, MapPin, Activity, Flame, Wind, Trees } from 'lucide-react';
import { Survivor } from '../../lib/types';

interface QueueProps {
  survivors: Survivor[];
  onSelectSurvivor: (survivor: Survivor) => void;
}

export const SurvivorQueue: React.FC<QueueProps> = ({ survivors, onSelectSurvivor }) => {
  const getRiskBadgeClass = (score: number) => {
    if (score >= 80) return 'badge-critical';
    if (score >= 60) return 'badge-high';
    return 'badge-stable';
  };

  const getEnvironmentIcon = (env: string) => {
    switch (env) {
      case 'WINDOW_VOID': return '🪟 Window Void';
      case 'ROOF_FLOOD': return '🏠 Flooded Roof';
      case 'TREE_PERCH': return '🌲 Tree Canopy';
      case 'RUBBLE_SURFACE': return '🧱 Rubble Pile';
      case 'WATER_RAFT': return '🛶 Rescue Raft';
      default: return '📍 Ground';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="var(--accent-crimson)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Dynamic Rescue Priority Queue
          </h2>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {survivors.length} Targets Verified
        </span>
      </div>

      {/* Queue List */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
        {survivors.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <Activity size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.85rem' }}>No survivor targets detected yet.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Click "Simulate AI Stream" above to test live pipeline.</p>
          </div>
        ) : (
          survivors.map((s, index) => {
            const rank = s.rescuePriorityRank || (index + 1);
            return (
              <div
                key={s.code || s._id}
                onClick={() => onSelectSurvivor(s)}
                style={{
                  padding: '14px',
                  background: 'rgba(0,0,0,0.25)',
                  border: rank === 1 ? '1px solid rgba(255, 42, 85, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-cyan)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = rank === 1 ? 'rgba(255, 42, 85, 0.4)' : 'var(--border-subtle)')}
              >
                {/* Top Row: Rank, Code, Environment */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: rank === 1 ? 'rgba(255,42,85,0.2)' : 'rgba(255,255,255,0.06)',
                      color: rank === 1 ? 'var(--accent-crimson)' : 'var(--text-main)',
                      border: rank === 1 ? '1px solid var(--accent-crimson)' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      #{rank}
                    </span>
                    <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-heading)' }}>{s.code}</strong>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                    {getEnvironmentIcon(s.environment)}
                  </span>
                </div>

                {/* Middle Row: Metrics */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                  {/* Fused Confidence Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={13} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence:</span>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {(s.confidenceScore * 100).toFixed(0)}%
                    </strong>
                  </div>

                  {/* Risk Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk:</span>
                    <span className={getRiskBadgeClass(s.riskScore)} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                      {s.riskScore.toFixed(1)}
                    </span>
                  </div>

                </div>

                {/* Location Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={11} />
                    {s.sector} ({s.globalPosition.x.toFixed(0)}m, {s.globalPosition.y.toFixed(0)}m)
                  </span>
                  <span style={{ color: 'var(--accent-cyan)' }}>
                    Click for AI Reasoning →
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
