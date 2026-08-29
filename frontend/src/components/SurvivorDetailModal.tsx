import React from 'react';
import { X, AlertTriangle, ShieldCheck, MapPin, Eye, Zap, Info } from 'lucide-react';
import { Survivor } from '../../lib/types';

interface ModalProps {
  survivor: Survivor | null;
  onClose: () => void;
}

export const SurvivorDetailModal: React.FC<ModalProps> = ({ survivor, onClose }) => {
  if (!survivor) return null;

  const risk = survivor.riskDetails || {
    environmentalThreat: 50,
    mobilityStatus: 50,
    accessibilityScore: 50,
    urgencyMultiplier: 1.0,
    reasoning: [],
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'var(--accent-crimson)';
    if (score >= 60) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(0, 240, 255, 0.4)',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)',
        padding: '24px',
        position: 'relative'
      }}>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        {/* Title & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 42, 85, 0.15)',
            border: '1px solid rgba(255, 42, 85, 0.4)',
            color: 'var(--accent-crimson)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '1.1rem'
          }}>
            PRIORITY #{survivor.rescuePriorityRank || 1}
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 700 }}>
              {survivor.code}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Target Coordinates: ({survivor.globalPosition.x.toFixed(1)}m, {survivor.globalPosition.y.toFixed(1)}m, {survivor.globalPosition.z.toFixed(1)}m) • {survivor.sector}
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Calculated Risk Score</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: getRiskColor(survivor.riskScore), fontFamily: 'var(--font-mono)' }}>
              {survivor.riskScore.toFixed(1)} / 100
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fused Sensor Confidence</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {(survivor.confidenceScore * 100).toFixed(0)}%
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Environment Zone</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '4px', textTransform: 'uppercase' }}>
              {survivor.environment.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Explainable AI Reasoning Factor Sliders */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Zap size={16} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Explainable Risk Breakdown (AI Decision Model)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Factor 1 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Environmental Threat (Flood, Fire, Rubble Proximity)</span>
                <strong style={{ color: 'var(--accent-crimson)', fontFamily: 'var(--font-mono)' }}>{risk.environmentalThreat}%</strong>
              </div>
              <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${risk.environmentalThreat}%`, background: 'var(--accent-crimson)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Factor 2 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mobility Deficit (Injured / Trapped vs Mobile Signaling)</span>
                <strong style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>{risk.mobilityStatus}%</strong>
              </div>
              <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${risk.mobilityStatus}%`, background: 'var(--accent-amber)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Factor 3 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Inaccessibility Difficulty (Window Void, Narrow Opening, Canopy)</span>
                <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{risk.accessibilityScore}%</strong>
              </div>
              <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${risk.accessibilityScore}%`, background: 'var(--accent-cyan)', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Explainable Text Reasoning Bullets */}
        <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
            <Info size={14} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>AI Reasoning Log</span>
          </div>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {risk.reasoning && risk.reasoning.length > 0 ? (
              risk.reasoning.map((r, i) => (
                <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{r}</li>
              ))
            ) : (
              <li style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No explicit risk impediments detected. Standard extraction queue.</li>
            )}
          </ul>
        </div>

        {/* Confirming Drones & Observations */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div>
            Confirming Drones: <strong style={{ color: '#fff' }}>{survivor.confirmingDrones?.length || 1} independent drones</strong>
          </div>
          <div>
            Total Observations: <strong style={{ color: '#fff' }}>{survivor.observationCount || 1} frames</strong>
          </div>
        </div>

      </div>
    </div>
  );
};
