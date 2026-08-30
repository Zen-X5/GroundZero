import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Layers, RefreshCw, Wifi, WifiOff, Activity } from 'lucide-react';

interface MultiSpectralHUDProps {
  activeDrone: string;
  onSelectDrone: (droneId: string) => void;
}

const STREAM_BASE = 'http://localhost:8000';
const VIDEO_FEED  = `${STREAM_BASE}/video_feed`;
const SWITCH_URL  = (d: string) => `${STREAM_BASE}/switch?drone=${d}`;
const HEALTH_URL  = `${STREAM_BASE}/`;
const RETRY_MS    = 3000;

type StreamState = 'connecting' | 'live' | 'offline';

const DRONES = [
  { id: 'drone_1', label: 'DRONE 1 (Sector A)', sector: 'Flooded Lake',     color: '#00f0ff' },
  { id: 'drone_2', label: 'DRONE 2 (Sector B)', sector: 'Highway Corridor', color: '#10b981' },
  { id: 'drone_3', label: 'DRONE 3 (Sector C)', sector: 'Urban Collapse',   color: '#a78bfa' },
];

export const MultiSpectralHUD: React.FC<MultiSpectralHUDProps> = ({
  activeDrone,
  onSelectDrone,
}) => {
  const [streamState, setStreamState] = useState<StreamState>('connecting');
  const [fps, setFps]                 = useState(0);
  const fpsCountRef = useRef(0);
  const fpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgRef      = useRef<HTMLImageElement>(null);

  // Health check: poll perception server
  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1500) });
      if (r.ok) {
        setStreamState(prev => prev === 'offline' ? 'connecting' : prev);
        // Force img reload
        if (imgRef.current) {
          imgRef.current.src = `${VIDEO_FEED}?t=${Date.now()}`;
        }
        if (retryRef.current) { clearInterval(retryRef.current); retryRef.current = null; }
      }
    } catch {
      setStreamState('offline');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Start FPS counter loop
    fpsTimerRef.current = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => {
      if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, [checkHealth]);

  // Auto-retry when offline
  useEffect(() => {
    if (streamState === 'offline' && !retryRef.current) {
      retryRef.current = setInterval(checkHealth, RETRY_MS);
    }
    if (streamState === 'live' && retryRef.current) {
      clearInterval(retryRef.current);
      retryRef.current = null;
    }
  }, [streamState, checkHealth]);

  const handleDroneSwitch = async (droneId: string) => {
    onSelectDrone(droneId);
    try { await fetch(SWITCH_URL(droneId)); } catch {}
    // Reload img src with new drone
    if (imgRef.current) imgRef.current.src = `${VIDEO_FEED}?t=${Date.now()}`;
  };

  const handleImgLoad  = () => { fpsCountRef.current++; setStreamState('live'); };
  const handleImgError = () => { setStreamState('offline'); };

  const di = DRONES.find(d => d.id === activeDrone) ?? DRONES[1];

  return (
    <div className="glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Camera size={18} color="#2563eb" />
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Multi-Spectral Aerial Feed
          </h2>
          <span className="badge-cyan" style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px' }}>DUAL RGB + LWIR</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '2px 8px', borderRadius: '4px',
            background: streamState === 'live' ? '#f0fdf4' : streamState === 'connecting' ? '#eff6ff' : '#fef2f2',
            border: `1px solid ${streamState === 'live' ? '#bbf7d0' : streamState === 'connecting' ? '#bfdbfe' : '#fecaca'}`,
          }}>
            {streamState === 'live'
              ? <><Wifi     size={10} color="#22c55e" /><span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: '#22c55e', fontWeight: 700, marginLeft: '4px' }}>LIVE{fps > 0 ? ` ${fps} FPS` : ''}</span></>
              : streamState === 'connecting'
              ? <><Activity size={10} color="#2563eb"    /><span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: '#2563eb',    fontWeight: 700, marginLeft: '4px' }}>CONNECTING</span></>
              : <><WifiOff  size={10} color="#ef4444"               /><span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: '#ef4444',              fontWeight: 700, marginLeft: '4px' }}>OFFLINE</span></>
            }
          </div>
        </div>

        {/* Drone selector tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {DRONES.map(d => (
            <button
              key={d.id}
              onClick={() => handleDroneSwitch(d.id)}
              style={{
                padding: '6px 12px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
                borderRadius: '6px',
                border: activeDrone === d.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: activeDrone === d.id ? '#2563eb' : '#f8fafc',
                color: activeDrone === d.id ? '#fff' : '#475569',
                cursor: 'pointer', transition: 'all 0.15s ease',
                boxShadow: activeDrone === d.id ? '0 2px 4px rgba(37, 99, 235, 0.15)' : 'none',
              }}
              onMouseEnter={e => {
                if (activeDrone !== d.id) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={e => {
                if (activeDrone !== d.id) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >{d.label}</button>
          ))}
        </div>
      </div>

      {/* Video area */}
      <div style={{
        position: 'relative', flex: 1, minHeight: '300px',
        background: '#03050b', borderRadius: '8px', overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* MJPEG stream — always mounted; opacity 0 while offline/connecting */}
        <img
          ref={imgRef}
          src={`${VIDEO_FEED}?t=${Date.now()}`}
          alt="Multi-Spectral Aerial Video Stream"
          onLoad={handleImgLoad}
          onError={handleImgError}
          style={{
            width: '100%', height: '100%', objectFit: 'contain', display: 'block',
            opacity: streamState === 'live' ? 1 : 0,
            transition: 'opacity 0.6s ease',
            position: 'absolute', inset: 0,
          }}
        />

        {/* OFFLINE overlay */}
        {streamState === 'offline' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#03050b', zIndex: 2, padding: '24px', textAlign: 'center' }}>
            <Layers size={38} style={{ opacity: 0.28, color: 'var(--text-muted)' }} />
            <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', margin: 0 }}>Multi-Spectral Stream offline</p>
            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 18px', lineHeight: 2.2, fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'left' }}>
              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}># Terminal 1 — Launch Gazebo</span></div>
              <div><code style={{ color: '#00f0ff' }}>ros2 launch simulation disaster_sim.launch.py</code></div>
              <div style={{ marginTop: '4px' }}><span style={{ color: 'rgba(255,255,255,0.35)' }}># Terminal 2 — Start camera stream</span></div>
              <div><code style={{ color: '#10b981' }}>python3 ai_service/live_perception.py</code></div>
              <div style={{ marginTop: '4px' }}><span style={{ color: 'rgba(255,255,255,0.35)' }}># Terminal 3 — Fly the drones</span></div>
              <div><code style={{ color: '#a78bfa' }}>ros2 run simulation drone_scan_controller</code></div>
            </div>
            <button
              className="btn-cyber"
              style={{ fontSize: '0.72rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => { setStreamState('connecting'); checkHealth(); }}
            >
              <RefreshCw size={12} /> RETRY STREAM
            </button>
            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              Auto-retrying every {RETRY_MS / 1000}s
            </p>
          </div>
        )}

        {/* CONNECTING overlay */}
        {streamState === 'connecting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', background: '#03050b', zIndex: 2 }}>
            <div style={{ position: 'relative', width: '200px', height: '3px', background: 'rgba(0,240,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '-40%', width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)', animation: 'gzScanSlide 1.3s linear infinite' }} />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              Connecting to {di.id.replace('_', ' ').toUpperCase()} sensors...
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              Waiting for MJPEG stream on localhost:8000
            </p>
          </div>
        )}

        {/* Live HUD overlays */}
        {streamState === 'live' && (
          <>
            <div style={{ position: 'absolute', top: '10px', left: '12px', zIndex: 3, display: 'flex', gap: '6px', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.78)', padding: '3px 8px', borderRadius: '3px', color: di.color, fontWeight: 700, letterSpacing: '0.05em', border: `1px solid ${di.color}44` }}>
                AERIAL FEED: [{di.id.replace('_','_').toUpperCase()}] - {di.sector.split(' ')[0].toUpperCase()}_ZONE
              </span>
            </div>
            <div style={{ position: 'absolute', top: '10px', right: '12px', zIndex: 3, pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.78)', padding: '3px 8px', borderRadius: '3px', color: '#f59e0b', fontWeight: 700, border: '1px solid rgba(245,158,11,0.3)' }}>
                FLIR INFERNO RADIOMETRIC LWIR (37C BODY HEAT)
              </span>
            </div>
            <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.8)', padding: '2px 7px', borderRadius: '2px', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}>
                RGB ‖ THERMAL
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: '10px', left: '12px', zIndex: 3, display: 'flex', gap: '6px', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.78)', padding: '2px 7px', borderRadius: '3px', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                ● REC {fps > 0 ? fps : 25} FPS
              </span>
              <span style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.78)', padding: '2px 7px', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
                TILT -30deg
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: '10px', right: '12px', zIndex: 3, pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.78)', padding: '2px 7px', borderRadius: '3px', color: '#f59e0b', fontWeight: 700, border: '1px solid rgba(245,158,11,0.25)' }}>
                FLIR 37.2C LOCKED
              </span>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes gzScanSlide {
          from { left: -40%; }
          to   { left: 140%; }
        }
      `}</style>
    </div>
  );
};
