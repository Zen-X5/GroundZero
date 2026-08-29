import React from 'react';
import { Building2, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { BuildingInspection } from '../../lib/types';

interface BuildingProps {
  buildings: BuildingInspection[];
}

export const BuildingCards: React.FC<BuildingProps> = ({ buildings }) => {
  const getDamageBadge = (dmg: string) => {
    switch (dmg) {
      case 'SEVERE_COLLAPSE': return <span className="badge-critical" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>COLLAPSE</span>;
      case 'MODERATE': return <span className="badge-high" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>MODERATE</span>;
      default: return <span className="badge-stable" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>LOW</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} color="var(--accent-amber)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Building Opening Inspections
          </h2>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Non-X-Ray Window Voids
        </span>
      </div>

      {/* Buildings List */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {buildings.map((b) => (
          <div
            key={b.name || b._id}
            style={{
              padding: '14px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{b.name.replace(/_/g, ' ')}</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {b.floors ? `${b.floors} Floors` : 'Structural Unit'} • Height: {b.heightMeters || 8}m
                </div>
              </div>
              {getDamageBadge(b.structuralDamage)}
            </div>

            {/* Accessible Openings List */}
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Accessible Windows / Voids Checked:
              </span>

              {b.accessibleOpenings && b.accessibleOpenings.length > 0 ? (
                b.accessibleOpenings.map((op, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      padding: '6px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '4px',
                      borderLeft: op.isObstructed ? '2px solid var(--accent-crimson)' : '2px solid var(--accent-emerald)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{op.name || op.openingId || `Opening #${idx + 1}`}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>({op.dimensionsMeters ? `${op.dimensionsMeters[0]}x${op.dimensionsMeters[1]}m` : 'Standard'})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {op.detectedOccupants > 0 ? (
                        <span style={{ color: 'var(--accent-crimson)', fontWeight: 700 }}>
                          👥 {op.detectedOccupants} Inside
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0 Detected</span>
                      )}
                      <span style={{ fontSize: '0.68rem', color: op.isObstructed ? 'var(--accent-crimson)' : 'var(--accent-emerald)' }}>
                        {op.isObstructed ? 'OBSTRUCTED' : 'CLEAR'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>No active opening inspections logged.</span>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
