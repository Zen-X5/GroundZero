import React from 'react';
import { Wifi, Radio, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { NetworkTopology } from '../../lib/types';

interface NetworkProps {
  topology: NetworkTopology | null;
}

export const NetworkStatus: React.FC<NetworkProps> = ({ topology }) => {
  const health = topology?.networkHealth || 94;
  const isGroundConnected = topology?.connectedToGround ?? true;
  const blackoutActive = topology?.blackoutZoneActive ?? true;

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wifi size={18} color="var(--accent-emerald)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            MANET Aerial Mesh Network
          </h2>
        </div>
        <span className="badge-stable" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>
          AD-HOC RESTORED
        </span>
      </div>

      {/* Network Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mesh Network Health</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
            {health}%
          </div>
        </div>

        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ground Link Status</span>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isGroundConnected ? 'var(--accent-emerald)' : 'var(--accent-crimson)', marginTop: '4px' }}>
            {isGroundConnected ? '🟢 Direct to Base' : '🔴 Mesh Disconnected'}
          </div>
        </div>
      </div>

      {/* Blackout Notice */}
      <div style={{ padding: '12px', background: 'rgba(255, 184, 0, 0.08)', borderRadius: '8px', border: '1px solid rgba(255, 184, 0, 0.2)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-amber)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
          <AlertTriangle size={14} />
          COMMUNICATION BLACKOUT ACTIVE
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Cellular towers & fiber backhauls are offline. Drones are operating as self-organizing MANET mesh Wi-Fi relays across Sectors A, B, and C.
        </p>
      </div>

      {/* Active Links Summary */}
      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '180px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
          Active Mesh Peer Links:
        </span>
        
        {/* Render Ground Gateway Link first if active */}
        {topology?.gatewayDrone && (() => {
          const gwName = typeof topology.gatewayDrone === 'string' ? topology.gatewayDrone : (topology.gatewayDrone?.callsign || 'UNKNOWN');
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '4px', borderLeft: '3px solid var(--accent-emerald)', marginBottom: '2px' }}>
              <span>{gwName} ⇄ Ground Station</span>
              <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                Base Connected
              </strong>
            </div>
          );
        })()}

        {/* Dynamic Mesh Peer Links */}
        {topology?.links && topology.links.length > 0 ? (
          topology.links.map((link, idx) => {
            const srcName = typeof link.sourceDrone === 'string' ? link.sourceDrone : (link.sourceDrone?.callsign || 'UNKNOWN');
            const trgName = typeof link.targetDrone === 'string' ? link.targetDrone : (link.targetDrone?.callsign || 'UNKNOWN');

            const isGreen = link.linkStatus === 'CONNECTED';
            const isYellow = link.linkStatus === 'DEGRADED';
            const statusText = isGreen ? 'Strong' : (isYellow ? 'Weak' : 'Offline');
            const statusColor = isGreen ? 'var(--accent-emerald)' : (isYellow ? 'var(--accent-amber)' : 'var(--accent-crimson)');
            
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: `3px solid ${statusColor}` }}>
                <span>{srcName} ⇄ {trgName}</span>
                <strong style={{ color: statusColor, fontFamily: 'var(--font-mono)' }}>
                  {link.signalStrengthDbm} dBm ({statusText})
                </strong>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
            No active mesh peer links detected.
          </div>
        )}
      </div>

    </div>
  );
};
