import React from 'react';
import { Battery, Radio, Cpu } from 'lucide-react';
import { Drone } from '../../lib/types';

interface DroneGridProps {
  drones: Drone[];
}

export const DroneGrid: React.FC<DroneGridProps> = ({ drones }) => {
  const now = Date.now();
  const HEARTBEAT_TTL_MS = 8000;

  const liveDrones = drones.filter(d => {
    if (!d?.lastHeartbeatAt) return false;
    return now - new Date(d.lastHeartbeatAt).getTime() < HEARTBEAT_TTL_MS;
  });

  const staleCount = drones.length - liveDrones.length;

  const getBatteryColor = (level: number) => {
    if (level <= 25) return '#ef4444';
    if (level <= 50) return '#f59e0b';
    return '#22c55e';
  };

  const getStatusBadge = (status: string) => {
    const base: React.CSSProperties = { fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 };
    switch (status) {
      case 'SCANNING':           return <span style={{ ...base, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>SCANNING</span>;
      case 'INSPECTING_OPENING': return <span style={{ ...base, background: '#fffbeb', color: '#f59e0b', border: '1px solid #fde68a' }}>INSPECTING</span>;
      case 'RELAYING':           return <span style={{ ...base, background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0' }}>MANET RELAY</span>;
      default:                   return <span style={{ ...base, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>{status}</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={18} color="#2563eb" />
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Swarm Telemetry & Aerial Grid
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {liveDrones.length} Active
          </span>
          {staleCount > 0 && (
            <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: '4px', background: '#fffbeb', color: '#f59e0b', border: '1px solid #fde68a' }}>
              {staleCount} stale
            </span>
          )}
        </div>
      </div>

      {/* Drone cards */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {liveDrones.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            <Cpu size={28} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
            <p style={{ fontSize: '0.85rem' }}>No active swarm telemetry received.</p>
            {staleCount > 0 && (
              <p style={{ fontSize: '0.75rem', marginTop: '6px', color: '#f59e0b' }}>
                {staleCount} stale record{staleCount > 1 ? 's' : ''} in DB — start Gazebo to see live drones.
              </p>
            )}
          </div>
        ) : (
          liveDrones.map((drone) => (
            <div
              key={drone.callsign || drone._id}
              style={{
                padding: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                transition: 'box-shadow 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              {/* Callsign & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: drone.meshConnected ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {drone.callsign}
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '3px' }}>
                    {drone.role}
                  </span>
                </div>
                {getStatusBadge(drone.status)}
              </div>

              {/* Telemetry grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem', background: '#fff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Alt / Z: </span><strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{(drone.position?.z ?? 8.0).toFixed(1)}m</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Speed: </span><strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{(drone.speed ?? 1.8).toFixed(1)} m/s</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Sector: </span><strong style={{ color: '#2563eb' }}>{drone.assignedSector || drone.sector || 'SECTOR_A'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Yaw: </span><strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{(drone.heading ?? 0).toFixed(0)}°</strong></div>
              </div>

              {/* Battery & Sensors */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Battery size={14} color={getBatteryColor(drone.batteryPercentage ?? 90)} />
                  <span style={{ color: 'var(--text-muted)' }}>Battery:</span>
                  <strong style={{ color: getBatteryColor(drone.batteryPercentage ?? 90), fontFamily: 'var(--font-mono)' }}>
                    {(drone.batteryPercentage ?? 90).toFixed(0)}%
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>RGB</span>
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>IR</span>
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0' }}>LiDAR</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
