import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Compass, ZoomIn, ZoomOut, RotateCcw, Activity, Radio } from 'lucide-react';
import { Drone, Survivor, NetworkTopology } from '../../lib/types';
import { DisasterMap3D } from './DisasterMap3D';

interface TacticalDisasterMapProps {
  drones: Drone[];
  survivors: Survivor[];
  topology: NetworkTopology | null;
  buildings?: any[];
  onSelectSurvivor: (survivor: Survivor) => void;
}

// ── Coordinate System ──────────────────────────────────────────────────────────
// Gazebo world: 240m x 140m centred at (100, 50)
// World X range: -20 to 220  => mapped to SVG X: 0 to 1200
// World Y range: -20 to 120  => mapped to SVG Y: 600 to 0 (inverted Y)
const WORLD_W = 240, WORLD_H = 140, WORLD_ORIGIN_X = -20, WORLD_ORIGIN_Y = -20;
const SVG_W = 1200, SVG_H = 600;
const toSvgX = (wx: number) => ((wx - WORLD_ORIGIN_X) / WORLD_W) * SVG_W;
const toSvgY = (wy: number) => SVG_H - ((wy - WORLD_ORIGIN_Y) / WORLD_H) * SVG_H;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ── SDF Ground Truth: ALL static objects parsed from disaster_night_world.sdf ──
const SDF_WATER_ZONES = [
  { name: 'flood_water_sector_a',       cx: 35,  cy: 50,  w: 70,  h: 120, label: 'SECTOR A FLOOD LAKE' },
  { name: 'flood_water_sector_c_urban', cx: 170, cy: 50,  w: 60,  h: 100, label: 'SECTOR C FLOOD' },
  { name: 'flood_water_sector_b_north', cx: 100, cy: 86,  w: 60,  h: 28,  label: '' },
  { name: 'flood_water_sector_b_south', cx: 100, cy: 14,  w: 60,  h: 28,  label: '' },
];

const SDF_HIGHWAY = { cx: 100, cy: 50, w: 60, h: 12 }; // elevated_dry_highway_corridor

const SDF_VEHICLES = [
  { id: 'suv_1',       x: 86,  y: 44,  label: 'SUV' },
  { id: 'sedan_2',     x: 93,  y: 54,  label: 'Sedan' },
  { id: 'van_3',       x: 112, y: 40,  label: 'Van' },
  { id: 'container',   x: 122, y: 56,  label: 'Cargo' },
  { id: 'pickup',      x: 105, y: 50,  label: 'Pickup' },
  { id: 'barriers',    x: 105, y: 42,  label: 'Barriers' },
  { id: 'sign',        x: 116, y: 50,  label: 'Sign' },
];

const SDF_TREES = [
  // Flood trees Sector A
  { id: 'ft1',  x: 18,  y: 32  },
  { id: 'ft2',  x: 50,  y: 75  },
  { id: 'ft3',  x: 12,  y: 65  },
  { id: 'ft4',  x: 28,  y: 82  },
  { id: 'ft5',  x: 38,  y: 52  },
  { id: 'ft6',  x: 55,  y: 25  },
  { id: 'ft7',  x: 10,  y: 15  },
  { id: 'ft8',  x: 62,  y: 60  },
  { id: 'ft9',  x: 24,  y: 18  },
  { id: 'ft10', x: 46,  y: 40  },
  // Flank trees near highway
  { id: 'fn1',  x: 78,  y: 76  },
  { id: 'fn2',  x: 98,  y: 98  },
  { id: 'fn3',  x: 122, y: 76  },
  { id: 'fs1',  x: 78,  y: 24  },
  { id: 'fs2',  x: 98,  y: 8   },
  { id: 'fs3',  x: 122, y: 24  },
  // Urban tree
  { id: 'ut1',  x: 140, y: 30  },
];

const SDF_HOUSES_FLOODED = [
  { id: 'sh1', x: 38,  y: 22,  label: 'House 1' },
  { id: 'sh2', x: 22,  y: 80,  label: 'House 2' },
  { id: 'shn1', x: 86, y: 86,  label: 'House N1' },
  { id: 'shn2', x: 116, y: 88, label: 'House N2' },
  { id: 'shs1', x: 86, y: 18,  label: 'House S1' },
  { id: 'shs2', x: 116, y: 16, label: 'House S2' },
];

const SDF_URBAN_BUILDINGS = [
  { id: 'apartments', x: 155, y: 32,  w: 16, h: 14, label: 'APARTMENTS', floors: 3, damage: 'MODERATE', color: 'rgba(0,240,255,0.35)' },
  { id: 'commercial',  x: 148, y: 75,  w: 14, h: 14, label: 'COMMERCIAL', floors: 4, damage: 'LOW',      color: 'rgba(16,185,129,0.35)' },
  { id: 'warehouse',  x: 182, y: 72,  w: 18, h: 14, label: 'WAREHOUSE',  floors: 1, damage: 'HIGH',     color: 'rgba(255,42,85,0.35)' },
  { id: 'clinic',     x: 138, y: 48,  w: 12, h: 10, label: 'CLINIC',     floors: 2, damage: 'LOW',      color: 'rgba(16,185,129,0.25)' },
  { id: 'bank',       x: 168, y: 54,  w: 14, h: 12, label: 'BANK',       floors: 3, damage: 'MODERATE', color: 'rgba(0,240,255,0.25)' },
  { id: 'rubble',     x: 180, y: 30,  w: 18, h: 16, label: 'RUBBLE',     floors: 0, damage: 'DESTROYED', color: 'rgba(255,184,0,0.25)' },
];

const SDF_RESCUE_ASSETS = [
  { id: 'boat',    x: 35,  y: 60,  label: 'Rescue Boat',   color: '#3b82f6' },
  { id: 'pallet',  x: 25,  y: 48,  label: 'Float Pallet',  color: '#60a5fa' },
  { id: 'barrel',  x: 42,  y: 62,  label: 'Float Barrel',  color: '#93c5fd' },
];

// ── SDF Ground Truth Survivors ─────────────────────────────────────────────────
const GAZEBO_SURVIVORS = [
  { code: 'SURV_01_TREE',     x: 18,  y: 32,  type: 'TREE_PERCH',     label: 'S01' },
  { code: 'SURV_02_TREE',     x: 50,  y: 75,  type: 'TREE_PERCH',     label: 'S02' },
  { code: 'SURV_03_TREE',     x: 28,  y: 82,  type: 'TREE_PERCH',     label: 'S03' },
  { code: 'SURV_04_TREE',     x: 38,  y: 52,  type: 'TREE_PERCH',     label: 'S04' },
  { code: 'SURV_05_TREE',     x: 62,  y: 60,  type: 'TREE_PERCH',     label: 'S05' },
  { code: 'SURV_06A_ROOF',    x: 38,  y: 22,  type: 'ROOF_FLOOD',     label: 'S06a' },
  { code: 'SURV_06B_LEDGE',   x: 37,  y: 21,  type: 'WINDOW_VOID',    label: 'S06b' },
  { code: 'SURV_07A_ROOF',    x: 22,  y: 80,  type: 'ROOF_FLOOD',     label: 'S07a' },
  { code: 'SURV_07B_WINDOW',  x: 23,  y: 79,  type: 'WINDOW_VOID',    label: 'S07b' },
  { code: 'SURV_08_BOAT',     x: 35,  y: 60,  type: 'WATER_RAFT',     label: 'S08' },
  { code: 'SURV_09_PALLET',   x: 25,  y: 48,  type: 'WATER_RAFT',     label: 'S09' },
  { code: 'SURV_10_POLE',     x: 30,  y: 45,  type: 'ROAD_DEBRIS',    label: 'S10' },
  { code: 'SURV_11_PICKUP',   x: 105, y: 50,  type: 'ROAD_DEBRIS',    label: 'S11' },
  { code: 'SURV_12_SUV',      x: 86,  y: 44,  type: 'ROAD_DEBRIS',    label: 'S12' },
  { code: 'SURV_13_CONTAINER',x: 122, y: 56,  type: 'RUBBLE_SURFACE', label: 'S13' },
  { code: 'SURV_14_BARRIER',  x: 105, y: 42,  type: 'ROAD_DEBRIS',    label: 'S14' },
  { code: 'SURV_15_SIGN',     x: 116, y: 50,  type: 'ROAD_DEBRIS',    label: 'S15' },
  { code: 'SURV_BN_TREE',     x: 78,  y: 76,  type: 'TREE_PERCH',     label: 'SBN' },
  { code: 'SURV_BS_TREE',     x: 78,  y: 24,  type: 'TREE_PERCH',     label: 'SBS' },
  { code: 'SURV_21A_APT',     x: 155, y: 32,  type: 'WINDOW_VOID',    label: 'S21' },
  { code: 'SURV_23A_COMM',    x: 148, y: 75,  type: 'ROOF_FLOOD',     label: 'S23' },
  { code: 'SURV_25B_WARE',    x: 182, y: 72,  type: 'WINDOW_VOID',    label: 'S25' },
  { code: 'SURV_27A_CLINIC',  x: 138, y: 48,  type: 'ROAD_DEBRIS',    label: 'S27' },
  { code: 'SURV_28A_BANK',    x: 168, y: 54,  type: 'WINDOW_VOID',    label: 'S28' },
];

// ── Sim Patrol Waypoints matching drone_scan_controller.py ────────────────────
const mkLawnmower = () => {
  const wps: { x: number; y: number }[] = [];
  let goUp = true;
  for (let wx = 10; wx <= 60; wx += 15) {
    if (goUp) { wps.push({ x: toSvgX(wx), y: toSvgY(20) }); wps.push({ x: toSvgX(wx), y: toSvgY(80) }); }
    else       { wps.push({ x: toSvgX(wx), y: toSvgY(80) }); wps.push({ x: toSvgX(wx), y: toSvgY(20) }); }
    goUp = !goUp;
  }
  return wps;
};

const mkRelay = () => [
  { x: toSvgX(80), y: toSvgY(50) }, { x: toSvgX(95), y: toSvgY(45) },
  { x: toSvgX(100), y: toSvgY(55) }, { x: toSvgX(80), y: toSvgY(55) },
];

const mkOrbit = (centers: { cx: number; cy: number; r: number }[]) => {
  const wps: { x: number; y: number }[] = [];
  const steps = 12;
  for (const o of centers)
    for (let i = 0; i < steps; i++) {
      const a = (2 * Math.PI / steps) * i;
      wps.push({ x: toSvgX(o.cx + o.r * Math.cos(a)), y: toSvgY(o.cy + o.r * Math.sin(a)) });
    }
  return wps;
};

const PATROL_CONFIGS = [
  { id: 'drone_1', callsign: 'DRONE_1', color: '#00f0ff', speed: 0.9, waypoints: mkLawnmower() },
  { id: 'drone_2', callsign: 'DRONE_2', color: '#10b981', speed: 0.7, waypoints: mkRelay() },
  { id: 'drone_3', callsign: 'DRONE_3', color: '#a78bfa', speed: 1.1,
    waypoints: mkOrbit([{ cx: 155, cy: 32, r: 12 }, { cx: 148, cy: 75, r: 12 }]) },
] as const;

type DronePosState  = { x: number; y: number; heading: number };
type DroneAnimState = { x: number; y: number; wpIdx: number; progress: number; heading: number };

const SCAN_RADIUS = 60; // ~12m in SVG pixels

export const TacticalDisasterMap: React.FC<TacticalDisasterMapProps> = ({
  drones, survivors, topology, onSelectSurvivor,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan ] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart ] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
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

  // Fog Canvas disabled
  const revealAt = useCallback((cx: number, cy: number) => {}, []);
  const drawFog = useCallback(() => {}, []);

  const hasLiveDrones = drones.filter(d => {
    if (!d?.lastHeartbeatAt) return false;
    const age = Date.now() - new Date(d.lastHeartbeatAt).getTime();
    return age < 8000; // Only count drones that heartbeat'd in last 8 seconds
  }).length > 0;

  const liveDrones = hasLiveDrones
    ? drones.filter(d => {
        if (!d?.lastHeartbeatAt) return false;
        return Date.now() - new Date(d.lastHeartbeatAt).getTime() < 8000;
      })
    : [];

  // Simulated animation loop (when no real Gazebo drones connected)
  useEffect(() => {
    if (hasLiveDrones) { cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      frameRef.current++;
      const frame = frameRef.current;
      const newPos: DronePosState[] = [];
      PATROL_CONFIGS.forEach((cfg, i) => {
        const s = droneStateRef.current[i];
        const wps = cfg.waypoints as readonly { x: number; y: number }[];
        const ni = (s.wpIdx + 1) % wps.length;
        const dist = Math.hypot(wps[ni].x - wps[s.wpIdx].x, wps[ni].y - wps[s.wpIdx].y) || 1;
        let prog = s.progress + cfg.speed / dist;
        let wpIdx = s.wpIdx;
        if (prog >= 1) { prog -= 1; wpIdx = ni; }
        const ac = wps[wpIdx], an = wps[(wpIdx + 1) % wps.length];
        const nx = lerp(ac.x, an.x, prog);
        const ny = lerp(ac.y, an.y, prog);
        const heading = Math.atan2(an.y - ac.y, an.x - ac.x) * (180 / Math.PI) + 90;
        droneStateRef.current[i] = { x: nx, y: ny, wpIdx, progress: prog, heading };
        newPos.push({ x: nx, y: ny, heading });
        if (frame % 4 === 0) revealAt(nx, ny);
      });
      drawFog();
      if (frame % 2 === 0) {
        setDronePos([...newPos]);
        setScanProgress(p => Math.min(100, p + 0.015));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hasLiveDrones, revealAt, drawFog]);

  // Live telemetry fog reveal
  useEffect(() => {
    if (!hasLiveDrones) return;
    liveDrones.forEach(d => {
      if (d?.position) revealAt(toSvgX(d.position.x ?? 50), toSvgY(d.position.y ?? 50));
    });
    drawFog();
    setScanProgress(p => Math.min(100, p + 0.6));
  }, [drones, hasLiveDrones, liveDrones, revealAt, drawFog]);

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); };
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp   = () => setIsDragging(false);
  const handleWheel     = (e: React.WheelEvent) => setZoom(z => Math.min(5, Math.max(0.4, z * (e.deltaY < 0 ? 1.12 : 0.88))));

  const svgT = `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`;
  const damageColor = (d: string) =>
    d === 'DESTROYED' ? '#ef4444' : d === 'HIGH' ? '#f59e0b' : d === 'MODERATE' ? '#fbbf24' : '#10b981';

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
                240m x 140m SWARM GRID
              </span>
              <span className="badge-stable" style={{ fontSize: '0.63rem', padding: '2px 7px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                {hasLiveDrones ? `LIVE — ${drones.length} DRONES` : 'SIM MODE — 3 DRONES'}
              </span>
              <span style={{ fontSize: '0.63rem', padding: '2px 7px', borderRadius: '4px', fontFamily: 'var(--font-mono)', background: 'rgba(0,240,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,240,255,0.28)' }}>
                ● SCANNING {scanProgress.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {PATROL_CONFIGS.map(d => (
              <span key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, boxShadow: `0 0 8px ${d.color}`, display: 'inline-block' }} />
                {d.callsign}
              </span>
            ))}
          </div>
          {/* 2D / 3D View Toggle */}
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9' }}>
            {(['2D', '3D'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? '#2563eb' : 'transparent',
                  color: viewMode === mode ? '#fff' : '#64748b',
                  border: 'none', padding: '6px 14px',
                  fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer',
                  transition: 'all 0.2s', fontFamily: 'var(--font-mono)',
                }}
              >{mode}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderRadius: '6px', border: '1px solid', borderColor: hasLiveDrones ? '#bbf7d0' : '#bfdbfe', background: hasLiveDrones ? '#f0fdf4' : '#eff6ff' }}>
            {hasLiveDrones
              ? <><Radio size={13} color="#22c55e" /><span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', marginLeft: '6px' }}>LIVE SCANNING</span></>
              : <><Activity size={13} color="#2563eb" /><span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', marginLeft: '6px' }}>SIMULATING</span></>
            }
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        onMouseDown={viewMode === '2D' ? handleMouseDown : undefined}
        onMouseMove={viewMode === '2D' ? handleMouseMove : undefined}
        onMouseUp={viewMode === '2D' ? handleMouseUp : undefined}
        onMouseLeave={viewMode === '2D' ? handleMouseUp : undefined}
        onWheel={viewMode === '2D' ? handleWheel : undefined}
        style={{ position: 'relative', flex: 1, minHeight: '480px', background: '#020407', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)', cursor: viewMode === '2D' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {/* Zoom controls (2D only) */}
        {viewMode === '2D' && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, display: 'flex', gap: '5px', background: 'rgba(4,6,12,0.92)', padding: '5px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <button className="btn-cyber" style={{ padding: '5px' }} onClick={e => { e.stopPropagation(); setZoom(z => Math.min(5, z * 1.25)); }}><ZoomIn size={13} /></button>
            <button className="btn-cyber" style={{ padding: '5px' }} onClick={e => { e.stopPropagation(); setZoom(z => Math.max(0.4, z / 1.25)); }}><ZoomOut size={13} /></button>
            <button className="btn-cyber" style={{ padding: '5px' }} onClick={e => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={13} /></button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 7px', fontSize: '0.68rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{(zoom * 100).toFixed(0)}%</span>
          </div>
        )}

        {/* 3D label badge */}
        {viewMode === '3D' && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20, padding: '5px 14px', borderRadius: '6px', background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)', color: 'var(--accent-cyan)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
            ◆ ISOMETRIC 3D VIEW — READ-ONLY
          </div>
        )}

        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{
            width: '100%', height: '100%', display: 'block',
            transform: viewMode === '3D'
              ? 'perspective(900px) rotateX(42deg) rotateZ(-20deg) scale(1.35) translateY(-8%)'
              : svgT,
            transformOrigin: 'center',
            transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <defs>
            <pattern id="g-maj" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0,240,255,0.05)" strokeWidth="1" />
            </pattern>
            <pattern id="g-min" width="12.5" height="12.5" patternUnits="userSpaceOnUse">
              <path d="M 12.5 0 L 0 0 0 12.5" fill="none" stroke="rgba(0,240,255,0.015)" strokeWidth="0.5" />
            </pattern>
            <pattern id="water-pat" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 0 18 Q 12 8 25 18 T 50 18" fill="none" stroke="rgba(0,180,216,0.10)" strokeWidth="1.5" />
              <path d="M 0 36 Q 12 26 25 36 T 50 36" fill="none" stroke="rgba(0,180,216,0.06)" strokeWidth="1" />
            </pattern>
            <filter id="glow-c"><feGaussianBlur stdDeviation="5" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter>
            <filter id="glow-e"><feGaussianBlur stdDeviation="8" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter>
            <filter id="glow-r"><feGaussianBlur stdDeviation="5" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter>
          </defs>

          {/* Grid base */}
          <rect width={SVG_W} height={SVG_H} fill="url(#g-min)" />
          <rect width={SVG_W} height={SVG_H} fill="url(#g-maj)" />

          {/* Coord ruler labels */}
          <g fontSize="8" fontFamily="monospace" fill="rgba(0,240,255,0.25)" fontWeight="bold">
            {[0, 50, 100, 150, 200].map(mx => (
              <text key={`rx-${mx}`} x={toSvgX(mx)} y={SVG_H - 4} textAnchor="middle">{mx}m</text>
            ))}
            {[0, 25, 50, 75, 100].map(my => (
              <text key={`ry-${my}`} x={6} y={toSvgY(my) + 3} textAnchor="start">{my}m</text>
            ))}
          </g>

          {/* ── FLOOD WATER ZONES (from SDF) ── */}
          {SDF_WATER_ZONES.map(z => {
            const sx = toSvgX(z.cx - z.w / 2), sy = toSvgY(z.cy + z.h / 2);
            const sw = (z.w / WORLD_W) * SVG_W, sh = (z.h / WORLD_H) * SVG_H;
            return (
              <g key={z.name}>
                <rect x={sx} y={sy} width={sw} height={sh} fill="rgba(5,60,100,0.55)" />
                <rect x={sx} y={sy} width={sw} height={sh} fill="url(#water-pat)" />
                <rect x={sx} y={sy} width={sw} height={sh} fill="none" stroke="rgba(0,180,216,0.15)" strokeWidth="1" />
                {z.label && <text x={sx + 8} y={sy + 16} fill="rgba(0,200,255,0.45)" fontSize="9" fontFamily="monospace" fontWeight="800">{z.label}</text>}
              </g>
            );
          })}

          {/* ── ELEVATED HIGHWAY (from SDF: cx=100, cy=50, w=60, h=12) ── */}
          {(() => {
            const hx = toSvgX(SDF_HIGHWAY.cx - SDF_HIGHWAY.w / 2);
            const hy = toSvgY(SDF_HIGHWAY.cy + SDF_HIGHWAY.h / 2);
            const hw = (SDF_HIGHWAY.w / WORLD_W) * SVG_W;
            const hh = (SDF_HIGHWAY.h / WORLD_H) * SVG_H;
            return (
              <g>
                <rect x={hx} y={hy} width={hw} height={hh} fill="rgba(20,24,38,0.98)" stroke="rgba(255,255,255,0.06)" />
                <line x1={hx} y1={hy + hh / 2} x2={hx + hw} y2={hy + hh / 2} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="14 10" opacity="0.7" />
                {/* Road block */}
                <line x1={toSvgX(112)} y1={hy} x2={toSvgX(112)} y2={hy + hh} stroke="#ef4444" strokeWidth="2" opacity="0.85" />
                <text x={toSvgX(112) - 1} y={hy - 4} fill="#ef4444" fontSize="7" fontFamily="monospace" textAnchor="middle">ROAD BLOCK</text>
                <text x={hx + 8} y={hy - 4} fill="rgba(200,200,220,0.4)" fontSize="9" fontFamily="monospace" fontWeight="800">SECTOR B — ELEVATED HIGHWAY</text>
              </g>
            );
          })()}

          {/* ── FLOODED HOUSES (from SDF) ── */}
          {SDF_HOUSES_FLOODED.map(h => {
            const sx = toSvgX(h.x) - 14, sy = toSvgY(h.y) - 12;
            return (
              <g key={h.id}>
                <rect x={sx} y={sy} width={28} height={22} fill="rgba(80,30,30,0.8)" stroke="rgba(255,100,100,0.3)" rx="2" />
                <text x={sx + 14} y={sy + 14} fill="rgba(255,180,180,0.55)" fontSize="5.5" fontFamily="monospace" textAnchor="middle">{h.label}</text>
              </g>
            );
          })}

          {/* ── TREES (from SDF) ── */}
          {SDF_TREES.map(t => (
            <g key={t.id}>
              <circle cx={toSvgX(t.x)} cy={toSvgY(t.y)} r="9" fill="rgba(16,185,129,0.18)" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
              <circle cx={toSvgX(t.x)} cy={toSvgY(t.y)} r="4" fill="rgba(16,185,129,0.35)" />
            </g>
          ))}

          {/* ── RESCUE ASSETS ── */}
          {SDF_RESCUE_ASSETS.map(a => (
            <g key={a.id}>
              <circle cx={toSvgX(a.x)} cy={toSvgY(a.y)} r="8" fill={a.color + '33'} stroke={a.color} strokeWidth="1.5" />
              <text x={toSvgX(a.x)} y={toSvgY(a.y) - 11} fill={a.color} fontSize="6" fontFamily="monospace" textAnchor="middle">{a.label}</text>
            </g>
          ))}

          {/* ── VEHICLES ON HIGHWAY (from SDF) ── */}
          {SDF_VEHICLES.map(v => (
            <g key={v.id}>
              <rect x={toSvgX(v.x) - 8} y={toSvgY(v.y) - 5} width={16} height={10} fill="rgba(30,36,50,0.95)" stroke="rgba(200,200,220,0.2)" rx="2" />
              <text x={toSvgX(v.x)} y={toSvgY(v.y) + 2} fill="rgba(200,200,220,0.45)" fontSize="5" fontFamily="monospace" textAnchor="middle">{v.label}</text>
            </g>
          ))}

          {/* ── URBAN BUILDINGS SECTOR C (from SDF ground truth) ── */}
          {SDF_URBAN_BUILDINGS.map(b => {
            const bx = toSvgX(b.x - b.w / 2), by = toSvgY(b.y + b.h / 2);
            const bw = (b.w / WORLD_W) * SVG_W, bh = (b.h / WORLD_H) * SVG_H;
            const dc = damageColor(b.damage);
            return (
              <g key={b.id}>
                <rect x={bx} y={by} width={bw} height={bh} fill="rgba(8,12,22,0.97)" stroke={b.color} strokeWidth="1.3" rx="3" />
                <rect x={bx} y={by} width={bw} height={13} fill={b.color} rx="3" />
                <text x={bx + bw / 2} y={by + 9} fill="#fff" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">{b.label}</text>
                {b.floors > 0 && <text x={bx + bw / 2} y={by + 24} fill="rgba(180,200,220,0.55)" fontSize="5.5" fontFamily="monospace" textAnchor="middle">{b.floors}F</text>}
                <text x={bx + bw / 2} y={by + bh - 5} fill={dc} fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">{b.damage}</text>
              </g>
            );
          })}

          {/* ── GROUND BASE STATION ── */}
          <g>
            <circle cx={toSvgX(0)} cy={toSvgY(50)} r="30" fill="none" stroke="var(--accent-emerald)" strokeWidth="1" opacity="0.3">
              <animate attributeName="r" from="15" to="40" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.4" to="0" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={toSvgX(0)} cy={toSvgY(50)} r="13" fill="rgba(16,185,129,0.1)" stroke="var(--accent-emerald)" strokeWidth="1.5" filter="url(#glow-e)" />
            <circle cx={toSvgX(0)} cy={toSvgY(50)} r="5" fill="var(--accent-emerald)" />
            <circle cx={toSvgX(0)} cy={toSvgY(50)} r="2" fill="#fff" />
            <rect x={toSvgX(0) + 18} y={toSvgY(50) - 9} width="130" height="17" fill="rgba(6,10,18,0.95)" rx="4" stroke="var(--accent-emerald)" strokeWidth="0.8" />
            <text x={toSvgX(0) + 83} y={toSvgY(50) + 3} fill="var(--accent-emerald)" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="0.04em">BASE_GROUND_GATEWAY</text>
          </g>

          {/* ── MANET MESH LINKS (Simulated) ── */}
          {!hasLiveDrones && dronePos.length === 3 && (() => {
            const [d0, d1, d2] = dronePos;
            const bx = toSvgX(0), by = toSvgY(50);
            return (
              <g>
                <line x1={d0.x} y1={d0.y} x2={d1.x} y2={d1.y} stroke="rgba(0,240,255,0.18)" strokeWidth="5" filter="url(#glow-c)" />
                <line x1={d0.x} y1={d0.y} x2={d1.x} y2={d1.y} stroke="var(--accent-cyan)" strokeWidth="1.8" strokeDasharray="10 7" opacity="0.78" />
                <line x1={d1.x} y1={d1.y} x2={d2.x} y2={d2.y} stroke="rgba(0,240,255,0.18)" strokeWidth="5" filter="url(#glow-c)" />
                <line x1={d1.x} y1={d1.y} x2={d2.x} y2={d2.y} stroke="var(--accent-cyan)" strokeWidth="1.8" strokeDasharray="10 7" opacity="0.78" />
                <line x1={d0.x} y1={d0.y} x2={bx} y2={by} stroke="rgba(16,185,129,0.2)" strokeWidth="4" filter="url(#glow-e)" />
                <line x1={d0.x} y1={d0.y} x2={bx} y2={by} stroke="var(--accent-emerald)" strokeWidth="1.8" strokeDasharray="11 6" opacity="0.82" />
              </g>
            );
          })()}

          {/* ── LIVE MANET ROUTING LINKS ── */}
          {hasLiveDrones && topology?.links?.map((link, idx) => {
            const sc = typeof link.sourceDrone === 'string' ? link.sourceDrone : (link.sourceDrone as any)?.callsign;
            const tc = typeof link.targetDrone === 'string' ? link.targetDrone : (link.targetDrone as any)?.callsign;
            if (!sc || !tc) return null;
            const sd = liveDrones.find(d => d?.callsign && d.callsign.toLowerCase() === sc.toLowerCase());
            const td = liveDrones.find(d => d?.callsign && d.callsign.toLowerCase() === tc.toLowerCase());
            const x1 = sd ? toSvgX(sd.position?.x ?? 0) : toSvgX(0);
            const y1 = sd ? toSvgY(sd.position?.y ?? 50) : toSvgY(50);
            const x2 = td ? toSvgX(td.position?.x ?? 0) : toSvgX(0);
            const y2 = td ? toSvgY(td.position?.y ?? 50) : toSvgY(50);
            const col = link.linkStatus === 'CONNECTED' ? 'var(--accent-emerald)'
              : link.linkStatus === 'DEGRADED' ? 'var(--accent-amber)' : 'rgba(255,255,255,0.12)';
            return (
              <g key={`ll-${idx}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="4" opacity="0.2" filter="url(#glow-e)" />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="1.8" opacity="0.85" strokeDasharray={link.isActiveRoutingPath ? 'none' : '6 6'} />
              </g>
            );
          })}

          {/* ── 24 SURVIVOR BEACONS (SDF Ground Truth) ── */}
          {GAZEBO_SURVIVORS.map(s => {
            const sx = toSvgX(s.x), sy = toSvgY(s.y);
            const isDetected = survivors.some(ds => ds?.code && ds.code.toUpperCase().includes(s.code));
            if (hasLiveDrones && !isDetected) return null;
            const col = s.type === 'WINDOW_VOID' || s.type === 'WATER_RAFT' ? '#ef4444' : '#f59e0b';
            return (
              <g key={s.code} style={{ opacity: isDetected ? 1.0 : 0.4 }}>
                <circle cx={sx} cy={sy} r="5" fill={col} filter="url(#glow-r)" />
                <circle cx={sx} cy={sy} r="14" fill="none" stroke={col} strokeWidth="0.8" opacity="0.35" />
                <text x={sx} y={sy - 9} fill="rgba(255,255,255,0.7)" fontSize="5.5" fontFamily="monospace" textAnchor="middle">{s.label}</text>
              </g>
            );
          })}

          {/* ── SIMULATED DRONE MARKERS ── */}
          {!hasLiveDrones && dronePos.map((pos, i) => {
            const cfg = PATROL_CONFIGS[i];
            const hr = (pos.heading - 90) * Math.PI / 180;
            return (
              <g key={cfg.id}>
                <circle cx={pos.x} cy={pos.y} r={SCAN_RADIUS} fill={cfg.color + '06'} stroke={cfg.color + '18'} strokeWidth="0.8" strokeDasharray="3 4" />
                <g transform={`translate(${pos.x},${pos.y}) rotate(${pos.heading})`}>
                  <path d="M 0 0 L 70 -28 A 76 76 0 0 1 70 28 Z" fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" />
                </g>
                <circle cx={pos.x} cy={pos.y} r="10" fill="#040810" stroke={cfg.color} strokeWidth="2" filter="url(#glow-c)" />
                <circle cx={pos.x} cy={pos.y} r="4" fill={cfg.color} />
                <line x1={pos.x} y1={pos.y} x2={pos.x + 18 * Math.cos(hr)} y2={pos.y + 18 * Math.sin(hr)} stroke="#fff" strokeWidth="2" />
                <rect x={pos.x - 36} y={pos.y + 13} width="72" height="20" fill="rgba(6,10,20,0.95)" rx="3" stroke={cfg.color} strokeWidth="0.7" />
                <text x={pos.x} y={pos.y + 25} fill={cfg.color} fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{cfg.callsign}</text>
              </g>
            );
          })}

          {/* ── LIVE GAZEBO DRONE MARKERS ── */}
          {hasLiveDrones && liveDrones.map(d => {
            if (!d?.position) return null;
            const dx = toSvgX(d.position.x ?? 50), dy = toSvgY(d.position.y ?? 50);
            const hr = ((d.heading ?? 0) - 90) * Math.PI / 180;
            const col = d.callsign.includes('1') ? '#00f0ff' : d.callsign.includes('2') ? '#10b981' : '#a78bfa';
            return (
              <g key={d.callsign}>
                <circle cx={dx} cy={dy} r={SCAN_RADIUS} fill={col + '06'} stroke={col + '20'} strokeWidth="0.8" strokeDasharray="3 4" />
                <g transform={`translate(${dx},${dy}) rotate(${(d.heading ?? 0) - 90})`}>
                  <path d="M 0 0 L 70 -28 A 76 76 0 0 1 70 28 Z" fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" />
                </g>
                <circle cx={dx} cy={dy} r="10" fill="#040810" stroke={col} strokeWidth="2" filter="url(#glow-c)" />
                <circle cx={dx} cy={dy} r="4" fill={col} />
                <line x1={dx} y1={dy} x2={dx + 18 * Math.cos(hr)} y2={dy + 18 * Math.sin(hr)} stroke="#fff" strokeWidth="2" />
                <rect x={dx - 38} y={dy + 13} width="76" height="20" fill="rgba(6,10,20,0.95)" rx="3" stroke={col} strokeWidth="0.7" />
                <text x={dx} y={dy + 25} fill={col} fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{d.callsign.toUpperCase()}</text>
              </g>
            );
          })}
        </svg>

        {/* Fog of War Canvas disabled */}

        {/* Three.js 3D Scene (3D only) */}
        {viewMode === '3D' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <DisasterMap3D drones={liveDrones} survivors={survivors} topology={topology} />
          </div>
        )}
      </div>
    </div>
  );
};
