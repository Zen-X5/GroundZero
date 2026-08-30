import React from 'react';
import { Wifi, Radio, AlertTriangle } from 'lucide-react';
import { NetworkTopology } from '../../lib/types';

interface NetworkProps {
  topology: NetworkTopology | null;
}

export const NetworkStatus: React.FC<NetworkProps> = ({ topology }) => {
  const health = topology?.networkHealth || 94;
  const isGroundConnected = topology?.connectedToGround ?? true;

  const getLinkStyle = (status: string) => {
    if (status === 'CONNECTED') return { color: '#22c55e', border: '#bbf7d0', bg: '#f0fdf4' };
    if (status === 'DEGRADED')  return { color: '#f59e0b', border: '#fde68a', bg: '#fffbeb' };
    return { color: '#ef4444', border: '#fecaca', bg: '#fef2f2' };
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wifi size={18} color="#22c55e" />
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            MANET Aerial Mesh Network
          </h2>
        </div>
        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0' }}>
          AD-HOC RESTORED
        </span>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mesh Health</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>{health}%</div>
        </div>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ground Link</span>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isGroundConnected ? '#22c55e' : '#ef4444', marginTop: '4px' }}>
            {isGroundConnected ? '🟢 Base Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>

      {/* Blackout notice */}
      <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
          <AlertTriangle size={14} />
          COMMUNICATION BLACKOUT ACTIVE
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
          Cellular towers & fiber backhauls are offline. Drones are operating as self-organizing MANET mesh Wi-Fi relays across Sectors A, B, and C.
        </p>
      </div>

      {/* Peer links */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.06em' }}>
          Active Mesh Peer Links
        </span>

        {topology?.gatewayDrone && (() => {
          const gwName = typeof topology.gatewayDrone === 'string' ? topology.gatewayDrone : (topology.gatewayDrone?.callsign || 'UNKNOWN');
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #22c55e', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{gwName} ⇄ Ground Station</span>
              <strong style={{ color: '#22c55e', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>Base Connected</strong>
            </div>
          );
        })()}

        {topology?.links && topology.links.length > 0 ? (
          topology.links.map((link, idx) => {
            const srcName = typeof link.sourceDrone === 'string' ? link.sourceDrone : (link.sourceDrone?.callsign || 'UNKNOWN');
            const trgName = typeof link.targetDrone === 'string' ? link.targetDrone : (link.targetDrone?.callsign || 'UNKNOWN');
            const statusText = link.linkStatus === 'CONNECTED' ? 'Strong' : link.linkStatus === 'DEGRADED' ? 'Weak' : 'Offline';
            const s = getLinkStyle(link.linkStatus);
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: s.bg, borderRadius: '6px', borderLeft: `3px solid ${s.color}`, border: `1px solid ${s.border}` }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{srcName} ⇄ {trgName}</span>
                <strong style={{ color: s.color, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  {link.signalStrengthDbm} dBm ({statusText})
                </strong>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            No active mesh peer links detected.
          </div>
        )}
      </div>
    </div>
  );
};
