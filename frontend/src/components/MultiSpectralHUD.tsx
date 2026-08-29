import React, { useState } from 'react';
import { Camera, Flame, Layers, Eye, RefreshCw } from 'lucide-react';

interface MultiSpectralHUDProps {
  activeDrone: string;
  onSelectDrone: (droneId: string) => void;
}

export const MultiSpectralHUD: React.FC<MultiSpectralHUDProps> = ({
  activeDrone,
  onSelectDrone,
}) => {
  const [streamError, setStreamError] = useState(false);
  const streamUrl = 'http://localhost:8000/video_feed';

  const handleDroneSwitch = async (droneName: string) => {
    onSelectDrone(droneName);
    try {
      await fetch(`http://localhost:8000/switch?drone=${droneName}`);
    } catch (_) {}
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* HUD Header & Drone Switcher Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Multi-Spectral Aerial Feed
          </h2>
          <span className="badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
            DUAL RGB + LWIR
          </span>
        </div>

        {/* Drone Selector Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'drone_1', label: 'DRONE 1 (Sector A)', sector: 'Flooded Lake' },
            { id: 'drone_2', label: 'DRONE 2 (Sector B)', sector: 'Highway Corridor' },
            { id: 'drone_3', label: 'DRONE 3 (Sector C)', sector: 'Urban Collapse' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => handleDroneSwitch(d.id)}
              style={{
                padding: '5px 10px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                borderRadius: '6px',
                border: activeDrone === d.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: activeDrone === d.id ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0,0,0,0.3)',
                color: activeDrone === d.id ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Video Canvas Container */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: '280px',
          background: '#04070e',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!streamError ? (
          <img
            src={streamUrl}
            alt="Multi-Spectral Aerial Video Stream"
            onError={() => setStreamError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
            <Layers size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
              Multi-Spectral Stream offline.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Start perception node in WSL2: <code style={{ color: 'var(--accent-cyan)' }}>python3 ai_service/live_perception.py</code>
            </p>
            <button
              className="btn-cyber"
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              onClick={() => setStreamError(false)}
            >
              <RefreshCw size={12} /> Retry Stream
            </button>
          </div>
        )}

        {/* Live Camera Overlays */}
        {!streamError && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '12px',
              right: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '3px', color: 'var(--accent-emerald)' }}>
                ● REC 25 FPS
              </span>
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
                TILT -30°
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '3px', color: 'var(--accent-amber)' }}>
                🔥 FLIR 37.2°C LOCKED
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
