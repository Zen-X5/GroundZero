import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Compass, ZoomIn, ZoomOut, RotateCcw, Activity, Radio } from 'lucide-react';
import { Drone, Survivor, NetworkTopology } from '../../lib/types';

interface TacticalDisasterMapProps {
  drones: Drone[];
  survivors: Survivor[];
  topology: NetworkTopology | null;
  onSelectSurvivor: (survivor: Survivor) => void;
}

// SVG coordinate space: 1000 x 500
const SVG_W = 1000;
const SVG_H = 500;
const SCAN_RADIUS = 118;

// Hardcoded patrol waypoints in SVG space
const PATROL_CONFIGS = [
  {
    id: 'sim-falcon',
    callsign: 'FALCON-1',
    sector: 'A',
    color: '#00f0ff',
    speed: 1.35,
    waypoints: [
      { x: 60,  y: 255 },
      { x: 115, y: 78  },
      { x: 218, y: 132 },
      { x: 308, y: 82  },
      { x: 326, y: 312 },
      { x: 202, y: 402 },
      { x: 88,  y: 432 },
    ],
  },
  {
    id: 'sim-hawk',
    callsign: 'HAWK-2',
    sector: 'B',
    color: '#10b981',
    speed: 1.15,
    waypoints: [
      { x: 495, y: 52  },
      { x: 404, y: 198 },
      { x: 507, y: 262 },
      { x: 628, y: 182 },
      { x: 608, y: 412 },
      { x: 462, y: 458 },
      { x: 376, y: 346 },
    ],
  },
  {
    id: 'sim-eagle',
    callsign: 'EAGLE-3',
    sector: 'C',
    color: '#a78bfa',
    speed: 1.25,
    waypoints: [
      { x: 718, y: 112 },
      { x: 828, y: 66  },
      { x: 952, y: 132 },
      { x: 975, y: 285 },
      { x: 898, y: 396 },
      { x: 768, y: 452 },
      { x: 685, y: 316 },
    ],
  },
] as const;

type DronePosState  = { x: number; y: number; heading: number };
type DroneAnimState = { x: number; y: number; wpIdx: number; progress: number; heading: number };

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

const toSvgX = (wx: number) => Math.max(10, Math.min(990, wx * 5));
const toSvgY = (wy: number) => Math.max(10, Math.min(490, (100 - wy) * 5));

export const TacticalDisasterMap: React.FC<TacticalDisasterMapProps> = ({
  drones,
  survivors,
  topology,
  onSelectSurvivor,
}) => {
  const [zoom,       setZoom      ] = useState(1);
  const [pan,        setPan       ] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart ] = useState({ x: 0, y: 0 });
  const [scanProgress, setScanProgress] = useState(0);
  const [dronePos, setDronePos] = useState<DronePosState[]>(
    PATROL_CONFIGS.map(c => ({ x: c.waypoints[0].x, y: c.waypoints[0].y, heading: 0 }))
  );

  const fogCanvasRef  = useRef<HTMLCanvasElement>(null);
  const offscreenRef  = useRef<HTMLCanvasElement | null>(null);
  const rafRef        = useRef(0);
  const frameRef      = useRef(0);
  const droneStateRef = useRef<DroneAnimState[]>(
    PATROL_CONFIGS.map(c => ({ x: c.waypoints[0].x, y: c.waypoints[0].y, wpIdx: 0, progress: 0, heading: 0 }))
  );

  // Init canvases
  useEffect(() => {
    const fog = fogCanvasRef.current;
    if (!fog) return;
    fog.width  = SVG_W;
    fog.height = SVG_H;
    const os = document.createElement('canvas');
    os.width  = SVG_W;
    os.height = SVG_H;
    const octx = os.getContext('2d')!;
    octx.fillStyle = 'rgba(3,5,10,1)';
    octx.fillRect(0, 0, SVG_W, SVG_H);
    offscreenRef.current = os;
    fog.getContext('2d')!.drawImage(os, 0, 0);
  }, []);

  const revealAt = useCallback((cx: number, cy: number) => {
    const os = offscreenRef.current;
    if (!os) return;
    const ctx = os.getContext('2d')!;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, SCAN_RADIUS);
    g.addColorStop(0,    'rgba(0,0,0,1)');
    g.addColorStop(0.50, 'rgba(0,0,0,0.97)');
    g.addColorStop(0.75, 'rgba(0,0,0,0.60)');
    g.addColorStop(0.90, 'rgba(0,0,0,0.15)');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, SCAN_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const drawFog = useCallback(() => {
    const fc = fogCanvasRef.current;
    const os = offscreenRef.current;
    if (!fc || !os) return;
    const ctx = fc.getContext('2d')!;
    ctx.clearRect(0, 0, SVG_W, SVG_H);
    ctx.drawImage(os, 0, 0);
  }, []);

  // Auto-start animation on mount - no button needed
  useEffect(() => {
    const tick = () => {
      frameRef.current++;
      const frame = frameRef.current;
      const newPos: DronePosState[] = [];
      PATROL_CONFIGS.forEach((cfg, i) => {
        const s    = droneStateRef.current[i];
        const wps  = cfg.waypoints as readonly { x: number; y: number }[];
        const ni   = (s.wpIdx + 1) % wps.length;
        const curr = wps[s.wpIdx];
        const next = wps[ni];
        const ddx  = next.x - curr.x;
        const ddy  = next.y - curr.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        let prog   = s.progress + cfg.speed / dist;
        let wpIdx  = s.wpIdx;
        if (prog >= 1) { prog -= 1; wpIdx = ni; }
        const ac      = wps[wpIdx];
        const an      = wps[(wpIdx + 1) % wps.length];
        const nx      = lerp(ac.x, an.x, prog);
        const ny      = lerp(ac.y, an.y, prog);
        const heading = Math.atan2(an.y - ac.y, an.x - ac.x) * (180 / Math.PI) + 90;
        droneStateRef.current[i] = { x: nx, y: ny, wpIdx, progress: prog, heading };
        newPos.push({ x: nx, y: ny, heading });
        if (frame % 5 === 0) revealAt(nx, ny);
      });
      drawFog();
      if (frame % 2 === 0) {
        setDronePos([...newPos]);
        setScanProgress(p => Math.min(100, p + 0.022));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [revealAt, drawFog]);

  // When real drones connect (Python script running), reveal fog at their real positions
  useEffect(() => {
    if (drones.length === 0) return;
    drones.forEach(d => {
      if (d.position) {
        revealAt(toSvgX(d.position.x ?? 0), toSvgY(d.position.y ?? 0));
      }
    });
    drawFog();
    // Update scan progress based on drone count and activity
    setScanProgress(p => Math.min(100, p + 0.5));
  }, [drones, revealAt, drawFog]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel   = (e: React.WheelEvent) =>
    setZoom(z => Math.min(4, Math.max(0.5, z * (e.deltaY < 0 ? 1.12 : 0.88))));

  const hasLiveDrones = drones.length > 0;
  const activeRoutes  = topology?.links?.filter(l => l.isActiveRoutingPath).length ?? 0;
  const svgT          = `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`;

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Compass size={22} color="var(--accent-cyan)" />
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tactical Disaster Map
            </h2>
            <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge-cyan" style={{ fontSize: '0.63rem', padding: '2px 7px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                200m x 100m SWARM GRID
              </span>
              <span className="badge-stable" style={{ fontSize: '0.63rem', padding: '2px 7px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                {hasLiveDrones ? `LIVE - ${drones.length} DRONES` : 'SIM MODE - 3 DRONES'}
              </span>
              {activeRoutes > 0 && (
                <span style={{ fontSize: '0.63rem', padding: '2px 7px', borderRadius: '4px', fontFamily: 'var(--font-mono)', background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)', border: '1px solid rgba(16,185,129,0.28)' }}>
                  MANET - {activeRoutes} HOPS
                </span>
              )}
              <span style={{ fontSize: '0.63rem', padding: '2px 7px', borderRadius: '4px', fontFamily: 'var(--font-mono)', background: 'rgba(0,240,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,240,255,0.28)' }}>
                &#9679; SCANNING {scanProgress.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {PATROL_CONFIGS.map(d => (
              <span key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, boxShadow: `0 0 8px ${d.color}`, display: 'inline-block', flexShrink: 0 }} />
                {d.callsign}
              </span>
            ))}
          </div>
          {/* Live / Sim status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderRadius: '6px', border: '1px solid', borderColor: hasLiveDrones ? 'var(--accent-emerald)' : 'rgba(0,240,255,0.28)', background: hasLiveDrones ? 'rgba(16,185,129,0.08)' : 'rgba(0,240,255,0.05)' }}>
            {hasLiveDrones
              ? <><Radio size={13} color="var(--accent-emerald)" /><span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--accent-emerald)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', marginLeft: '6px' }}>LIVE SCANNING</span></>
              : <><Activity size={13} color="var(--accent-cyan)" /><span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', marginLeft: '6px' }}>SIMULATING</span></>
            }
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          position: 'relative', flex: 1, minHeight: '520px',
          background: '#020407', borderRadius: '12px', overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* Zoom controls */}
        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 20, display: 'flex', gap: '5px', background: 'rgba(4,6,12,0.92)', padding: '5px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
          <button className="btn-cyber" style={{ padding: '5px' }} title="Zoom In"
            onClick={e => { e.stopPropagation(); setZoom(z => Math.min(4, z * 1.25)); }}>
            <ZoomIn size={13} />
          </button>
          <button className="btn-cyber" style={{ padding: '5px' }} title="Zoom Out"
            onClick={e => { e.stopPropagation(); setZoom(z => Math.max(0.5, z / 1.25)); }}>
            <ZoomOut size={13} />
          </button>
          <button className="btn-cyber" style={{ padding: '5px' }} title="Reset"
            onClick={e => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <RotateCcw size={13} />
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 7px', fontSize: '0.68rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
            {(zoom * 100).toFixed(0)}%
          </span>
        </div>



        {/* SVG terrain */}
        <svg viewBox="0 0 1000 500" style={{ width: '100%', height: '100%', display: 'block', transform: svgT, transformOrigin: 'center' }}>
          <defs>
            <pattern id="tdm-grid-maj" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(0,240,255,0.055)" strokeWidth="1" />
            </pattern>
            <pattern id="tdm-grid-min" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(0,240,255,0.018)" strokeWidth="0.5" />
            </pattern>
            <pattern id="tdm-water" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 0 20 Q 15 10 30 20 T 60 20" fill="none" stroke="rgba(0,180,216,0.09)" strokeWidth="1.5" />
              <path d="M 0 40 Q 15 30 30 40 T 60 40" fill="none" stroke="rgba(0,180,216,0.05)" strokeWidth="1" />
            </pattern>
            <linearGradient id="tdm-grad-a" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(0,120,212,0.18)" />
              <stop offset="100%" stopColor="rgba(0,120,212,0.04)" />
            </linearGradient>
            <linearGradient id="tdm-grad-c" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(139,92,246,0.03)" />
              <stop offset="100%" stopColor="rgba(139,92,246,0.12)" />
            </linearGradient>
            <filter id="tdm-glow-c">
              <feGaussianBlur stdDeviation="5" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
            </filter>
            <filter id="tdm-glow-e">
              <feGaussianBlur stdDeviation="8" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
            </filter>
            <filter id="tdm-glow-r">
              <feGaussianBlur stdDeviation="6" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
            </filter>
            <radialGradient id="tdm-heat-red" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,42,85,0.45)" />
              <stop offset="55%" stopColor="rgba(255,42,85,0.15)" />
              <stop offset="100%" stopColor="rgba(255,42,85,0)" />
            </radialGradient>
            <radialGradient id="tdm-heat-amber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,184,0,0.38)" />
              <stop offset="55%" stopColor="rgba(255,184,0,0.12)" />
              <stop offset="100%" stopColor="rgba(255,184,0,0)" />
            </radialGradient>
          </defs>

          {/* Base grid */}
          <rect width="1000" height="500" fill="url(#tdm-grid-min)" />
          <rect width="1000" height="500" fill="url(#tdm-grid-maj)" />

          {/* Coord labels */}
          <g fontSize="8.5" fontFamily="monospace" fill="rgba(0,240,255,0.28)" fontWeight="bold">
            <text x="12" y="492">0m</text><text x="247" y="492">50m</text>
            <text x="497" y="492">100m</text><text x="747" y="492">150m</text>
            <text x="963" y="492">200m</text>
            <text x="4" y="483">0</text><text x="4" y="373">25m</text>
            <text x="4" y="248">50m</text><text x="4" y="123">75m</text>
            <text x="4" y="16">100m</text>
          </g>

          {/* Sector A */}
          <rect x="0" y="0" width="350" height="500" fill="url(#tdm-grad-a)" />
          <rect x="0" y="0" width="350" height="500" fill="url(#tdm-water)" />
          <line x1="350" y1="0" x2="350" y2="500" stroke="var(--accent-cyan)" strokeWidth="1.5" opacity="0.2" strokeDasharray="6 6" />
          <text x="24" y="32" fill="rgba(0,240,255,0.58)" fontSize="10.5" fontFamily="monospace" fontWeight="800" letterSpacing="0.05em">SECTOR A - FLOOD LAKE (1.0m)</text>
          <circle cx="80"  cy="118" r="14" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
          <text x="80"  y="121" fill="rgba(16,185,129,0.6)" fontSize="6.5" fontFamily="monospace" textAnchor="middle">TREE</text>
          <circle cx="148" cy="392" r="17" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
          <text x="148" y="395" fill="rgba(16,185,129,0.6)" fontSize="6.5" fontFamily="monospace" textAnchor="middle">TREE</text>
          <rect x="218" y="221" width="32" height="18" fill="rgba(180,130,80,0.22)" stroke="rgba(180,130,80,0.45)" rx="2" />
          <text x="234" y="233" fill="#d97706" fontSize="6" fontFamily="monospace" textAnchor="middle">RAFT</text>

          {/* Sector B */}
          <rect x="350" y="0" width="300" height="500" fill="rgba(255,255,255,0.003)" />
          <line x1="650" y1="0" x2="650" y2="500" stroke="var(--accent-cyan)" strokeWidth="1.5" opacity="0.2" strokeDasharray="6 6" />
          <rect x="350" y="220" width="300" height="60" fill="rgba(10,14,24,0.95)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="350" y1="250" x2="650" y2="250" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="14 10" opacity="0.7" />
          <text x="374" y="32" fill="rgba(200,200,220,0.42)" fontSize="10.5" fontFamily="monospace" fontWeight="800" letterSpacing="0.05em">SECTOR B - ELEVATED HIGHWAY</text>
          <rect x="418" y="232" width="24" height="12" fill="rgba(239,68,68,0.3)" stroke="#ef4444" strokeWidth="0.8" rx="2" />
          <text x="430" y="241" fill="#fff" fontSize="5.5" fontFamily="monospace" textAnchor="middle">VAN</text>
          <rect x="524" y="255" width="28" height="13" fill="rgba(245,158,11,0.3)" stroke="#f59e0b" strokeWidth="0.8" rx="2" />
          <text x="538" y="264" fill="#fff" fontSize="5.5" fontFamily="monospace" textAnchor="middle">TRUCK</text>

          {/* Sector C */}
          <rect x="650" y="0" width="350" height="500" fill="url(#tdm-grad-c)" fillOpacity="0.8" />
          <text x="672" y="32" fill="rgba(139,92,246,0.62)" fontSize="10.5" fontFamily="monospace" fontWeight="800" letterSpacing="0.05em">SECTOR C - URBAN COLLAPSE</text>
          <g>
            <rect x="740" y="280" width="95" height="73" fill="rgba(6,10,18,0.92)" stroke="rgba(0,240,255,0.3)" strokeWidth="1" rx="5" />
            <rect x="740" y="280" width="95" height="17" fill="rgba(0,240,255,0.09)" rx="5" />
            <text x="787" y="292" fill="var(--accent-cyan)" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">APARTMENTS</text>
            <text x="787" y="312" fill="rgba(165,180,200,0.5)" fontSize="6.5" fontFamily="monospace" textAnchor="middle">3F - 10m</text>
            <text x="787" y="328" fill="var(--accent-emerald)" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">WINDOW VOID</text>
          </g>
          <g>
            <rect x="710" y="80" width="95" height="73" fill="rgba(6,10,18,0.92)" stroke="rgba(0,240,255,0.3)" strokeWidth="1" rx="5" />
            <rect x="710" y="80" width="95" height="17" fill="rgba(0,240,255,0.09)" rx="5" />
            <text x="757" y="92" fill="var(--accent-cyan)" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">COMMERCIAL</text>
            <text x="757" y="112" fill="rgba(165,180,200,0.5)" fontSize="6.5" fontFamily="monospace" textAnchor="middle">5F - 16m</text>
            <text x="757" y="128" fill="var(--accent-amber)" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">ROOF DECK</text>
          </g>
          <polygon points="870,200 930,190 940,240 880,250" fill="rgba(24,30,40,0.9)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <text x="905" y="222" fill="rgba(200,205,215,0.38)" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">RUBBLE SLAB</text>
          <g>
            <rect x="860" y="60" width="80" height="58" fill="rgba(6,10,18,0.88)" stroke="rgba(239,68,68,0.3)" strokeWidth="1" rx="4" />
            <text x="900" y="92" fill="#ef4444" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">CLINIC</text>
          </g>
          <g>
            <rect x="670" y="360" width="82" height="63" fill="rgba(6,10,18,0.88)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" rx="4" />
            <text x="711" y="395" fill="var(--accent-amber)" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">BANK BALCONY</text>
          </g>

          {/* Ground base */}
          <g>
            <circle cx="12" cy="250" r="28" fill="none" stroke="var(--accent-emerald)" strokeWidth="1" opacity="0.35">
              <animate attributeName="r" from="14" to="36" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="12" cy="250" r="13" fill="rgba(16,185,129,0.1)" stroke="var(--accent-emerald)" strokeWidth="1.5" filter="url(#tdm-glow-e)" />
            <circle cx="12" cy="250" r="5"  fill="var(--accent-emerald)" />
            <circle cx="12" cy="250" r="2"  fill="#fff" />
            <rect x="29" y="241" width="122" height="18" fill="rgba(6,10,18,0.95)" rx="4" stroke="var(--accent-emerald)" strokeWidth="0.8" />
            <text x="90" y="253" fill="var(--accent-emerald)" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="0.04em">GROUND_BASE_GATEWAY</text>
          </g>

          {/* MANET mesh links between sim drones */}
          {dronePos.length === 3 && (() => {
            const [d0, d1, d2] = dronePos;
            return (
              <g>
                {/* D0-D1 primary */}
                <line x1={d0.x} y1={d0.y} x2={d1.x} y2={d1.y} stroke="rgba(0,240,255,0.18)" strokeWidth="5" filter="url(#tdm-glow-c)" />
                <line x1={d0.x} y1={d0.y} x2={d1.x} y2={d1.y} stroke="var(--accent-cyan)" strokeWidth="1.8" strokeDasharray="10 7" opacity="0.78" className="manet-link-flow" />
                <g transform={`translate(${(d0.x+d1.x)/2},${(d0.y+d1.y)/2})`}>
                  <rect x="-23" y="-9" width="46" height="14" fill="rgba(3,5,10,0.92)" rx="3" stroke="rgba(0,240,255,0.32)" strokeWidth="0.7" />
                  <text x="0" y="1.5" fill="var(--accent-cyan)" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">-64 dBm</text>
                </g>
                {/* D1-D2 primary */}
                <line x1={d1.x} y1={d1.y} x2={d2.x} y2={d2.y} stroke="rgba(0,240,255,0.18)" strokeWidth="5" filter="url(#tdm-glow-c)" />
                <line x1={d1.x} y1={d1.y} x2={d2.x} y2={d2.y} stroke="var(--accent-cyan)" strokeWidth="1.8" strokeDasharray="10 7" opacity="0.78" className="manet-link-flow" />
                <g transform={`translate(${(d1.x+d2.x)/2},${(d1.y+d2.y)/2})`}>
                  <rect x="-23" y="-9" width="46" height="14" fill="rgba(3,5,10,0.92)" rx="3" stroke="rgba(0,240,255,0.32)" strokeWidth="0.7" />
                  <text x="0" y="1.5" fill="var(--accent-cyan)" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">-68 dBm</text>
                </g>
                {/* D0-D2 secondary */}
                <line x1={d0.x} y1={d0.y} x2={d2.x} y2={d2.y} stroke="rgba(0,240,255,0.08)" strokeWidth="3" filter="url(#tdm-glow-c)" />
                <line x1={d0.x} y1={d0.y} x2={d2.x} y2={d2.y} stroke="rgba(0,240,255,0.38)" strokeWidth="1.2" strokeDasharray="5 9" opacity="0.42" className="manet-link-flow" />
                {/* Gateway D0 to base */}
                <line x1={d0.x} y1={d0.y} x2={12} y2={250} stroke="rgba(16,185,129,0.2)" strokeWidth="4" filter="url(#tdm-glow-e)" />
                <line x1={d0.x} y1={d0.y} x2={12} y2={250} stroke="var(--accent-emerald)" strokeWidth="1.8" strokeDasharray="11 6" opacity="0.82" className="manet-link-flow" />
              </g>
            );
          })()}

          {/* Live topology links */}
          {topology?.links?.map((link, idx) => {
            const sc = typeof link.sourceDrone === 'string' ? link.sourceDrone : link.sourceDrone?.callsign;
            const tc = typeof link.targetDrone === 'string' ? link.targetDrone : link.targetDrone?.callsign;
            const sd = drones.find(d => d.callsign.toLowerCase() === sc?.toLowerCase());
            const td = drones.find(d => d.callsign.toLowerCase() === tc?.toLowerCase());
            if (!sd || !td) return null;
            const x1 = toSvgX(sd.position?.x ?? 0), y1 = toSvgY(sd.position?.y ?? 0);
            const x2 = toSvgX(td.position?.x ?? 0), y2 = toSvgY(td.position?.y ?? 0);
            const col = link.linkStatus === 'CONNECTED' ? 'var(--accent-emerald)'
              : link.linkStatus === 'DEGRADED' ? 'var(--accent-amber)' : 'rgba(255,255,255,0.12)';
            return (
              <g key={`ll-${idx}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="4" opacity="0.2" filter="url(#tdm-glow-e)" />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="1.8" opacity="0.85" className="manet-link-flow" />
              </g>
            );
          })}

          {/* Survivor beacons */}
          {survivors.map(s => {
            const sx   = toSvgX(s.globalPosition?.x ?? 50);
            const sy   = toSvgY(s.globalPosition?.y ?? 50);
            const crit = s.riskScore >= 80;
            const col  = crit ? 'var(--accent-crimson)' : 'var(--accent-amber)';
            const env  = (s.environment || 'SURVIVOR').replace('_', ' ');
            return (
              <g key={s.code} onClick={() => onSelectSurvivor(s)} style={{ cursor: 'pointer' }}>
                <circle cx={sx} cy={sy} r="62" fill={`url(#tdm-heat-${crit ? 'red' : 'amber'})`} />
                <circle cx={sx} cy={sy} r="16" fill="none" stroke={col} strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" from="6" to="25" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={sx} cy={sy} r="8.5" fill={col} filter={crit ? 'url(#tdm-glow-r)' : undefined} />
                <circle cx={sx} cy={sy} r="3.5" fill="#fff" />
                <rect x={sx-47} y={sy-29} width="94" height="16" fill="rgba(3,5,10,0.95)" rx="4" stroke={col} strokeWidth="0.8" />
                <text x={sx} y={sy-18} fill="#fff" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {(s.code || 'SURV').split('_').slice(-2).join('_')} ({env})
                </text>
              </g>
            );
          })}

          {/* Animated sim drones */}
          {dronePos.map((pos, i) => {
            const cfg     = PATROL_CONFIGS[i];
            const headRad = (pos.heading - 90) * Math.PI / 180;
            return (
              <g key={cfg.id}>
                <circle cx={pos.x} cy={pos.y} r={SCAN_RADIUS}
                  fill={cfg.color + '07'} stroke={cfg.color + '20'} strokeWidth="1" strokeDasharray="4 5" />
                <g transform={`translate(${pos.x},${pos.y}) rotate(${pos.heading})`}>
                  <path d="M 0 0 L 90 -34 A 97 97 0 0 1 90 34 Z"
                    fill={cfg.color + '10'} stroke={cfg.color + '30'} strokeWidth="0.8"
                    className="radar-sweep" />
                </g>
                <circle cx={pos.x} cy={pos.y} r="12" fill="#040810" stroke={cfg.color} strokeWidth="2.5" filter="url(#tdm-glow-c)" />
                <circle cx={pos.x} cy={pos.y} r="5"  fill={cfg.color} />
                <line x1={pos.x} y1={pos.y}
                  x2={pos.x + 21 * Math.cos(headRad)}
                  y2={pos.y + 21 * Math.sin(headRad)}
                  stroke="#fff" strokeWidth="2.5" />
                <rect x={pos.x-41} y={pos.y+15} width="82" height="27" fill="rgba(6,10,20,0.96)" rx="4" stroke={cfg.color} strokeWidth="0.8" />
                <text x={pos.x} y={pos.y+26} fill={cfg.color} fontSize="8.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{cfg.callsign}</text>
                <text x={pos.x} y={pos.y+37} fill="rgba(185,210,230,0.62)" fontSize="6.5" fontFamily="monospace" textAnchor="middle">SEC-{cfg.sector} - SCANNING</text>
              </g>
            );
          })}

          {/* Live drone fleet */}
          {hasLiveDrones && drones.map(d => {
            const dx      = toSvgX(d.position?.x ?? 50);
            const dy      = toSvgY(d.position?.y ?? 50);
            const headRad = ((d.heading ?? 0) - 90) * Math.PI / 180;
            return (
              <g key={d.callsign || d._id}>
                <circle cx={dx} cy={dy} r="12" fill="#040810" stroke="var(--accent-cyan)" strokeWidth="2.5" filter="url(#tdm-glow-c)" />
                <circle cx={dx} cy={dy} r="5"  fill="var(--accent-cyan)" />
                <line x1={dx} y1={dy} x2={dx + 21*Math.cos(headRad)} y2={dy + 21*Math.sin(headRad)} stroke="#fff" strokeWidth="2.5" />
                <rect x={dx-41} y={dy+15} width="82" height="27" fill="rgba(6,10,20,0.96)" rx="4" stroke="rgba(0,240,255,0.35)" strokeWidth="0.8" />
                <text x={dx} y={dy+26} fill="var(--accent-cyan)" fontSize="8.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{d.callsign}</text>
                <text x={dx} y={dy+37} fill="rgba(185,210,230,0.62)" fontSize="6.5" fontFamily="monospace" textAnchor="middle">Z:{(d.position?.z ?? 8).toFixed(0)}m - {(d.speed ?? 1.8).toFixed(1)}m/s</text>
              </g>
            );
          })}
        </svg>

        {/* Fog of war canvas overlay - same CSS transform as SVG */}
        <canvas
          ref={fogCanvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
            transform: svgT,
            transformOrigin: 'center',
          }}
        />
      </div>
    </div>
  );
};
