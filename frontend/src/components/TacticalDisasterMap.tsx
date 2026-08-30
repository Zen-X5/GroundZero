import React from 'react';
import { Compass, ShieldAlert, Radio, User, Flame } from 'lucide-react';
import { Drone, Survivor, NetworkTopology } from '../../lib/types';

interface TacticalDisasterMapProps {
  drones: Drone[];
  survivors: Survivor[];
  topology: NetworkTopology | null;
  onSelectSurvivor: (survivor: Survivor) => void;
}

export const TacticalDisasterMap: React.FC<TacticalDisasterMapProps> = ({
  drones,
  survivors,
  topology,
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

            {/* Heatmap Radial Gradients */}
            <radialGradient id="heat-red" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 42, 85, 0.45)" />
              <stop offset="100%" stopColor="rgba(255, 42, 85, 0)" />
            </radialGradient>
            <radialGradient id="heat-amber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(245, 158, 11, 0.45)" />
              <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
            </radialGradient>

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

          {/* Embedded style for line animations */}
          <style>{`
            .manet-link {
              stroke-dasharray: 8, 4;
              animation: dash-flow 1.5s linear infinite;
            }
            @keyframes dash-flow {
              to {
                stroke-dashoffset: -24;
              }
            }
          `}</style>

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

          {/* Ground Base Station (0, 50) */}
          <g>
            <circle cx="10" cy="250" r="14" fill="rgba(16, 185, 129, 0.15)" stroke="var(--accent-emerald)" strokeWidth="1" />
            <circle cx="10" cy="250" r="5" fill="var(--accent-emerald)" />
            <text x="24" y="253" fill="var(--accent-emerald)" fontSize="8" fontFamily="monospace" fontWeight="bold">BASE_STATION</text>
          </g>

          {/* ================= MANET MESH LINKS ================= */}
          {(() => {
            if (topology && topology.links && topology.links.length > 0) {
              const renderedLinks: React.ReactNode[] = [];

              // 1. Draw direct link from Gateway Drone to Ground Station Base
              if (topology.gatewayDrone) {
                const gatewayCallsign = typeof topology.gatewayDrone === 'string' 
                  ? topology.gatewayDrone 
                  : topology.gatewayDrone.callsign;
                const gateway = drones.find(d => d.callsign.toLowerCase() === gatewayCallsign?.toLowerCase());
                if (gateway) {
                  const gx = toSvgX(gateway.position?.x ?? 0) * 10;
                  const gy = toSvgY(gateway.position?.y ?? 0) * 5;
                  renderedLinks.push(
                    <line
                      key="link-gateway-base"
                      x1={gx}
                      y1={gy}
                      x2={10}
                      y2={250}
                      className="manet-link"
                      stroke="var(--accent-emerald)"
                      strokeWidth="3.5"
                    />
                  );
                }
              }

              // 2. Draw links between drones
              topology.links.forEach((link, idx) => {
                const srcCallsign = typeof link.sourceDrone === 'string' ? link.sourceDrone : link.sourceDrone?.callsign;
                const trgCallsign = typeof link.targetDrone === 'string' ? link.targetDrone : link.targetDrone?.callsign;
                const srcId = typeof link.sourceDrone === 'string' ? link.sourceDrone : link.sourceDrone?._id;
                const trgId = typeof link.targetDrone === 'string' ? link.targetDrone : link.targetDrone?._id;

                const srcDrone = drones.find(d => d._id === srcId || d.callsign.toLowerCase() === srcCallsign?.toLowerCase());
                const trgDrone = drones.find(d => d._id === trgId || d.callsign.toLowerCase() === trgCallsign?.toLowerCase());

                if (!srcDrone || !trgDrone) return;

                const x1 = toSvgX(srcDrone.position?.x ?? 0) * 10;
                const y1 = toSvgY(srcDrone.position?.y ?? 0) * 5;
                const x2 = toSvgX(trgDrone.position?.x ?? 0) * 10;
                const y2 = toSvgY(trgDrone.position?.y ?? 0) * 5;

                const isRoute = link.isActiveRoutingPath ?? false;
                const color = link.linkStatus === 'CONNECTED' ? 'var(--accent-emerald)' : (link.linkStatus === 'DEGRADED' ? 'var(--accent-amber)' : 'rgba(255,255,255,0.15)');

                renderedLinks.push(
                  <line
                    key={`link-${idx}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    className={isRoute ? "manet-link" : undefined}
                    stroke={color}
                    strokeWidth={isRoute ? "2.5" : "1.0"}
                    strokeDasharray={!isRoute ? "4, 4" : undefined}
                    opacity={isRoute ? "0.9" : "0.4"}
                  />
                );
              });

              return renderedLinks;
            } else {
              // Fallback proximity check (64.0m) if topology is null
              const COMMS_RANGE = 64.0;
              const renderedLinks: React.ReactNode[] = [];

              for (let i = 0; i < drones.length; i++) {
                const d1 = drones[i];
                const x1 = toSvgX(d1.position?.x ?? 0) * 10;
                const y1 = toSvgY(d1.position?.y ?? 0) * 5;

                // Ground Station proximity link
                const distToBase = Math.sqrt(Math.pow(d1.position?.x ?? 0, 2) + Math.pow((d1.position?.y ?? 50) - 50.0, 2));
                if (distToBase <= COMMS_RANGE) {
                  renderedLinks.push(
                    <line
                      key={`link-fallback-base-${i}`}
                      x1={x1}
                      y1={y1}
                      x2={10}
                      y2={250}
                      className="manet-link"
                      stroke="var(--accent-emerald)"
                      strokeWidth="2.5"
                    />
                  );
                }

                for (let j = i + 1; j < drones.length; j++) {
                  const d2 = drones[j];
                  const x2 = toSvgX(d2.position?.x ?? 0) * 10;
                  const y2 = toSvgY(d2.position?.y ?? 0) * 5;

                  const dist = Math.sqrt(
                    Math.pow((d1.position?.x ?? 0) - (d2.position?.x ?? 0), 2) +
                    Math.pow((d1.position?.y ?? 0) - (d2.position?.y ?? 0), 2)
                  );

                  if (dist <= COMMS_RANGE) {
                    renderedLinks.push(
                      <line
                        key={`link-fallback-${i}-${j}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        className="manet-link"
                        stroke="var(--accent-emerald)"
                        strokeWidth="1.5"
                        strokeDasharray="4, 4"
                      />
                    );
                  }
                }
              }

              return renderedLinks;
            }
          })()}

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
                {/* Prioritized Threat Heatmap Zone overlay */}
                <circle cx={sx} cy={sy} r="65" fill={`url(#heat-${isCrit ? 'red' : 'amber'})`} />

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
                {/* Dynamic Emergency Wi-Fi Hotspot Coverage Bubble */}
                {d.meshConnected ? (
                  <>
                    <circle cx={dx} cy={dy} r="45" fill="rgba(16, 185, 129, 0.04)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" strokeDasharray="3 3" />
                    {/* Pulsing Wi-Fi wave */}
                    <circle cx={dx} cy={dy} r="45" fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1">
                      <animate attributeName="r" from="40" to="52" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    <text x={dx} y={dy - 12} fill="var(--accent-emerald)" fontSize="6" fontFamily="monospace" textAnchor="middle" fontWeight="bold" letterSpacing="0.05em">
                      WI-FI ACTIVE
                    </text>
                  </>
                ) : (
                  <>
                    <circle cx={dx} cy={dy} r="45" fill="rgba(245, 158, 11, 0.03)" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1" strokeDasharray="5 5" />
                    <text x={dx} y={dy - 12} fill="var(--accent-amber)" fontSize="6" fontFamily="monospace" textAnchor="middle" fontWeight="bold" letterSpacing="0.05em">
                      LOCAL ONLY
                    </text>
                  </>
                )}

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

                {/* Callsign Tag with Altitude and Speed telemetry overlay */}
                <rect x={dx - 32} y={dy + 14} width="64" height="24" fill="rgba(10,14,22,0.9)" rx="4" stroke="var(--accent-cyan)" strokeWidth="0.8" />
                <text x={dx} y={dy + 23} fill="var(--accent-cyan)" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {d.callsign}
                </text>
                <text x={dx} y={dy + 33} fill="#fff" fontSize="6" fontFamily="monospace" textAnchor="middle">
                  Z:{(d.position?.z ?? 8.0).toFixed(0)}m | {(d.speed ?? 1.8).toFixed(1)}m/s
                </text>
              </g>
            );
          })}
        </svg>
      </div>

    </div>
  );
};
