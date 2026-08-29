import React from 'react';
import { Battery, Navigation, Radio, Cpu, Wifi, Eye } from 'lucide-react';
import { Drone } from '../../lib/types';

interface DroneGridProps {
  drones: Drone[];
}

export const DroneGrid: React.FC<DroneGridProps> = ({ drones }) => {
  const getBatteryColor = (level: number) => {
    if (level <= 25) return 'var(--accent-crimson)';
    if (level <= 50) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCANNING': return <span className="badge-cyan" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>SCANNING</span>;
      case 'INSPECTING_OPENING': return <span className="badge-high" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>INSPECTING VOID</span>;
      case 'RELAYING': return <span className="badge-stable" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>MANET RELAY</span>;
      default: return <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>{status}</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Swarm Telemetry & Aerial Grid
          </h2>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {drones.length} Nodes Active
        </span>
      </div>

      {/* Drones List */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {drones.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', gridColumn: '1 / -1' }}>
            <Cpu size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.85rem' }}>No active swarm telemetry received.</p>
          </div>
        ) : (
          drones.map((drone) => (
            <div
              key={drone.callsign || drone._id}
              style={{
                padding: '14px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {/* Header: Callsign & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: drone.meshConnected ? 'var(--accent-emerald)' : 'var(--accent-crimson)' }} />
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: '#fff' }}>
                    {drone.callsign}
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px' }}>
                    {drone.role}
                  </span>
                </div>
                {getStatusBadge(drone.status)}
              </div>

              {/* Position & Telemetry */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Alt / Z: </span>
                  <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{drone.position.z.toFixed(1)}m</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Speed: </span>
                  <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{drone.speed.toFixed(1)} m/s</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Sector: </span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{drone.sector}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Yaw: </span>
                  <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{drone.heading.toFixed(0)}°</strong>
                </div>
              </div>

              {/* Battery & Sensors */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                {/* Battery */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Battery size={14} color={getBatteryColor(drone.batteryPercentage)} />
                  <span style={{ color: 'var(--text-muted)' }}>Battery:</span>
                  <strong style={{ color: getBatteryColor(drone.batteryPercentage), fontFamily: 'var(--font-mono)' }}>
                    {drone.batteryPercentage.toFixed(0)}%
                  </strong>
                </div>

                {/* Sensor Chips */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: drone.sensors?.rgbActive ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.04)', color: drone.sensors?.rgbActive ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>RGB</span>
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: drone.sensors?.thermalActive ? 'rgba(255,42,85,0.15)' : 'rgba(255,255,255,0.04)', color: drone.sensors?.thermalActive ? 'var(--accent-crimson)' : 'var(--text-dim)' }}>IR</span>
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: drone.sensors?.lidarActive ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: drone.sensors?.lidarActive ? 'var(--accent-emerald)' : 'var(--text-dim)' }}>LiDAR</span>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
