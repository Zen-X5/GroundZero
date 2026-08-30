import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { BuildingInspection } from '../../lib/types';
import { BuildingInspection3DCard } from './BuildingInspection3DCard';

interface BuildingProps {
  buildings: BuildingInspection[];
}

export const BuildingCards: React.FC<BuildingProps> = ({ buildings }) => {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInspection | null>(null);

  // Auto-select the first building when buildings load
  useEffect(() => {
    if (buildings.length > 0 && !selectedBuilding) {
      setSelectedBuilding(buildings[0]);
    }
  }, [buildings, selectedBuilding]);

  const getDamageBadge = (dmg: string) => {
    switch (dmg) {
      case 'SEVERE_COLLAPSE': 
        return <span className="badge-critical" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>COLLAPSE</span>;
      case 'MODERATE': 
        return <span className="badge-high" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>MODERATE</span>;
      default: 
        return <span className="badge-stable" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>LOW</span>;
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', minHeight: '620px', alignItems: 'stretch', width: '100%' }}>
      
      {/* Left Column: Buildings List */}
      <div 
        className="glass-panel" 
        style={{ 
          width: '42%', 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          height: '620px' 
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="var(--accent-amber)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Building Openings
            </h2>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Non-X-Ray Voids
          </span>
        </div>

        {/* Buildings List */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          {buildings.map((b) => {
            const isSelected = selectedBuilding?.name === b.name;
            return (
              <div
                key={b.name || b._id}
                onClick={() => setSelectedBuilding(b)}
                style={{
                  padding: '14px',
                  background: isSelected ? 'rgba(0, 240, 255, 0.07)' : 'rgba(0,0,0,0.3)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 0 10px rgba(0, 240, 255, 0.15)' : 'none',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: isSelected ? 'var(--accent-cyan)' : '#fff' }}>
                      {b.name.replace(/_/g, ' ')}
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {b.floors ? `${b.floors} Floors` : 'Structural Unit'} • Height: {b.heightMeters || 8}m
                    </div>
                  </div>
                  {getDamageBadge(b.structuralDamage)}
                </div>

                {/* Accessible Openings summary */}
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Voids Checked:
                  </span>

                  {b.accessibleOpenings && b.accessibleOpenings.length > 0 ? (
                    b.accessibleOpenings.map((op, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.73rem',
                          padding: '4px 8px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '4px',
                          borderLeft: op.isObstructed ? '2px solid var(--accent-crimson)' : '2px solid var(--accent-emerald)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{op.name || op.openingId || `Opening #${idx + 1}`}</span>
                          <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>({op.dimensionsMeters ? `${op.dimensionsMeters[0]}x${op.dimensionsMeters[1]}m` : 'Standard'})</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {op.detectedOccupants > 0 ? (
                            <span style={{ color: 'var(--accent-crimson)', fontWeight: 700 }}>
                              👥 {op.detectedOccupants}
                            </span>
                          ) : null}
                          <span style={{ fontSize: '0.64rem', color: op.isObstructed ? 'var(--accent-crimson)' : 'var(--accent-emerald)' }}>
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
            );
          })}
        </div>

      </div>

      {/* Right Column: 3D Building Inspection Card */}
      <div style={{ width: '58%', height: '620px' }}>
        <BuildingInspection3DCard building={selectedBuilding} />
      </div>

    </div>
  );
};
