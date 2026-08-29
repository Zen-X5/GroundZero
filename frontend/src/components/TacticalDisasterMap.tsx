import React from 'react';
import { Compass, ShieldAlert, Radio, User, Flame } from 'lucide-react';
import { Drone, Survivor } from '../../lib/types';

interface TacticalDisasterMapProps {
  drones: Drone[];
  survivors: Survivor[];
  onSelectSurvivor: (survivor: Survivor) => void;
}

export const TacticalDisasterMap: React.FC<TacticalDisasterMapProps> = ({
  drones,
  survivors,
  onSelectSurvivor,
}) => {
  // Map dimensions: World is 200m (X) x 100m (Y)
  const mapWidth = 200;
  const mapHeight = 100;

  // Convert World coordinates (x: 0..200, y: 0..100) to SVG percentage
  const toSvgX = (x: number) => Math.max(2, Math.min(98, (x / mapWidth) * 100));
  const toSvgY = (y: number) => Math.max(2, Math.min(98, 100 - (y / mapHeight) * 100));

  return (
    <div className="glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Map Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tactical Disaster Map
          </h2>
          <span className="badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
            200m × 100m AERIAL GRID
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} /> Drone
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-crimson)' }} /> Critical Target
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} /> High Target
          </span>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: '280px',
          background: 'linear-gradient(180deg, #030712 0%, #060e20 100%)',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <svg
          viewBox="0 0 1000 500"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0, 240, 255, 0.05)" strokeWidth="1" />
            </pattern>

            {/* Sector A Flood Water Pattern */}
            <linearGradient id="floodWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0, 100, 200, 0.25)" />
              <stop offset="100%" stopColor="rgba(0, 40, 120, 0.4)" />
            </linearGradient>

            {/* Pulse Glow Filters */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="1000" height="500" fill="url(#grid)" />

          {/* ================= SECTORS ================= */}
          {/* Sector A: Flood Lake (x: 0 -> 350) */}
          <rect x="0" y="0" width="350" height="500" fill="url(#floodWater)" stroke="rgba(0, 240, 255, 0.15)" strokeDasharray="4 4" />
          <text x="20" y="30" fill="rgba(0, 240, 255, 0.6)" fontSize="14" fontFamily="monospace" fontWeight="700">
            SECTOR A: FLOOD LAKE (1.0m DEPTH)
          </text>

          {/* Sector B: Dry Highway Corridor (x: 350 -> 650) */}
          <rect x="350" y="0" width="300" height="500" fill="rgba(40, 45, 55, 0.25)" stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="4 4" />
          {/* Highway Road Line */}
          <rect x="350" y="235" width="300" height="30" fill="rgba(20, 20, 25, 0.6)" />
          <line x1="350" y1="250" x2="650" y2="250" stroke="#f59e0b" strokeWidth="2" strokeDasharray="10 10" />
          <text x="370" y="30" fill="rgba(255, 255, 255, 0.6)" fontSize="14" fontFamily="monospace" fontWeight="700">
            SECTOR B: HIGHWAY CORRIDOR
          </text>

          {/* Sector C: Flooded Urban Collapse (x: 650 -> 1000) */}
          <rect x="650" y="0" width="350" height="500" fill="url(#floodWater)" stroke="rgba(0, 240, 255, 0.15)" strokeDasharray="4 4" />
          {/* Building Outlines */}
          <rect x="740" y="280" width="80" height="70" fill="rgba(60, 65, 75, 0.7)" stroke="rgba(0, 240, 255, 0.4)" rx="4" />
          <text x="745" y="320" fill="#fff" fontSize="10" fontFamily="monospace">APARTMENTS</text>
          
          <rect x="710" y="90" width="70" height="70" fill="rgba(60, 65, 75, 0.7)" stroke="rgba(0, 240, 255, 0.4)" rx="4" />
          <text x="715" y="130" fill="#fff" fontSize="10" fontFamily="monospace">COMMERCIAL</text>

          <text x="670" y="30" fill="rgba(0, 240, 255, 0.6)" fontSize="14" fontFamily="monospace" fontWeight="700">
            SECTOR C: URBAN COLLAPSE
          </text>

          {/* ================= MANET MESH LINKS ================= */}
          {drones.length >= 2 && (
            <g opacity="0.6">
              {drones.map((d, i) => {
                if (i === drones.length - 1) return null;
                const next = drones[i + 1];
                const x1 = toSvgX(d.position?.x ?? 0) * 10;
                const y1 = toSvgY(d.position?.y ?? 0) * 5;
                const x2 = toSvgX(next.position?.x ?? 0) * 10;
                const y2 = toSvgY(next.position?.y ?? 0) * 5;
                return (
                  <line
                    key={`link-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--accent-emerald)"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                );
              })}
            </g>
          )}

          {/* ================= SURVIVOR BEACONS ================= */}
          {survivors.map((s) => {
            const sx = toSvgX(s.globalPosition?.x ?? 50) * 10;
            const sy = toSvgY(s.globalPosition?.y ?? 50) * 5;
            const isCrit = s.riskScore >= 80;
            const beaconColor = isCrit ? 'var(--accent-crimson)' : 'var(--accent-amber)';

            return (
              <g
                key={s.code}
                onClick={() => onSelectSurvivor(s)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulse Wave */}
                <circle cx={sx} cy={sy} r="16" fill="none" stroke={beaconColor} strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" from="6" to="24" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Inner Marker */}
                <circle cx={sx} cy={sy} r="7" fill={beaconColor} filter={isCrit ? 'url(#glow-red)' : undefined} />
                <circle cx={sx} cy={sy} r="3" fill="#ffffff" />

                {/* Label Badge */}
                <rect x={sx - 35} y={sy - 24} width="70" height="14" fill="rgba(0,0,0,0.85)" rx="3" stroke={beaconColor} strokeWidth="0.8" />
                <text x={sx} y={sy - 14} fill="#fff" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {(s.code || 'SURV_UNKNOWN_0').split('_').slice(-2).join('_')}
                </text>
              </g>
            );
          })}

          {/* ================= DRONE FLEET ICONS ================= */}
          {drones.map((d) => {
            const dx = toSvgX(d.position?.x ?? 50) * 10;
            const dy = toSvgY(d.position?.y ?? 50) * 5;

            return (
              <g key={d.callsign || d._id}>
                {/* Coverage Bubble */}
                <circle cx={dx} cy={dy} r="45" fill="rgba(0, 240, 255, 0.06)" stroke="rgba(0, 240, 255, 0.3)" strokeWidth="1" strokeDasharray="3 3" />

                {/* Drone Center Icon */}
                <circle cx={dx} cy={dy} r="9" fill="var(--accent-cyan)" filter="url(#glow-cyan)" />
                <circle cx={dx} cy={dy} r="4" fill="#000" />

                {/* Heading Arrow */}
                <line
                  x1={dx}
                  y1={dy}
                  x2={dx + 16 * Math.cos(((d.heading ?? 0) - 90) * (Math.PI / 180))}
                  y2={dy + 16 * Math.sin(((d.heading ?? 0) - 90) * (Math.PI / 180))}
                  stroke="#fff"
                  strokeWidth="2"
                />

                {/* Callsign Tag */}
                <rect x={dx - 28} y={dy + 14} width="56" height="14" fill="rgba(0,0,0,0.85)" rx="3" stroke="var(--accent-cyan)" strokeWidth="0.8" />
                <text x={dx} y={dy + 24} fill="var(--accent-cyan)" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {d.callsign}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

    </div>
  );
};
