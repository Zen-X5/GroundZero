import React, { useEffect, useState } from 'react';
import {
  Users, Radio, Wifi, ShieldAlert, Map, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Activity, Zap, Layers
} from 'lucide-react';
import { Drone, Survivor, NetworkTopology, SystemAlert } from '../../lib/types';

interface DashboardProps {
  drones: Drone[];
  survivors: Survivor[];
  topology: NetworkTopology | null;
  alerts: SystemAlert[];
  connected: boolean;
  onNavigate: (tab: string) => void;
}

// Uptime since mount
function useUptime() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export const Dashboard: React.FC<DashboardProps> = ({
  drones, survivors, topology, alerts, connected, onNavigate
}) => {
  const uptime = useUptime();
  const now = Date.now();
  const TTL = 8000;

  const liveDrones   = drones.filter(d => d?.lastHeartbeatAt && now - new Date(d.lastHeartbeatAt).getTime() < TTL);
  const criticalSurv = survivors.filter(s => s.riskScore >= 80);
  const warningSurv  = survivors.filter(s => s.riskScore >= 60 && s.riskScore < 80);
  const criticalAlerts = alerts.filter(a => a.level === 'CRITICAL');
  const health = topology?.networkHealth ?? 0;

  // ── KPI cards ─────────────────────────────────────────────────────
  const kpis = [
    {
      label: 'Survivors Detected',
      value: survivors.length,
      sub: `${criticalSurv.length} critical · ${warningSurv.length} warning`,
      icon: <Users size={20} />,
      color: '#ef4444',
      bg: '#fef2f2',
      border: '#fecaca',
      onClick: () => onNavigate('QUEUE'),
    },
    {
      label: 'Drones Active',
      value: `${liveDrones.length} / ${drones.length}`,
      sub: liveDrones.length === drones.length ? 'Full swarm operational' : `${drones.length - liveDrones.length} drones offline`,
      icon: <Radio size={20} />,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      onClick: () => onNavigate('FLEET'),
    },
    {
      label: 'Mesh Health',
      value: `${health}%`,
      sub: topology ? (topology.connectedToGround ? 'Ground link active' : 'Ground link lost') : 'Awaiting telemetry',
      icon: <Wifi size={20} />,
      color: health > 70 ? '#22c55e' : health > 40 ? '#f59e0b' : '#ef4444',
      bg: health > 70 ? '#f0fdf4' : health > 40 ? '#fffbeb' : '#fef2f2',
      border: health > 70 ? '#bbf7d0' : health > 40 ? '#fde68a' : '#fecaca',
      onClick: () => onNavigate('MANET'),
    },
    {
      label: 'Active Alerts',
      value: alerts.length,
      sub: `${criticalAlerts.length} critical events`,
      icon: <ShieldAlert size={20} />,
      color: criticalAlerts.length > 0 ? '#ef4444' : '#f59e0b',
      bg: criticalAlerts.length > 0 ? '#fef2f2' : '#fffbeb',
      border: criticalAlerts.length > 0 ? '#fecaca' : '#fde68a',
      onClick: () => onNavigate('ALERTS'),
    },
    {
      label: 'Buildings Scanned',
      value: '—',
      sub: 'Connect simulation for data',
      icon: <Layers size={20} />,
      color: '#64748b',
      bg: '#f8fafc',
      border: '#e2e8f0',
      onClick: () => {},
    },
    {
      label: 'Mission Uptime',
      value: uptime,
      sub: connected ? 'WebSocket connected' : 'Disconnected',
      icon: <Clock size={20} />,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      onClick: () => {},
    },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Mission Banner */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse-live 1.5s infinite' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>MISSION ACTIVE</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
            Assam Flood Response — Ground-Zero 2026
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Prakriti Avinya 2026 · Jorhat Sector · Autonomous Swarm Rescue in Progress
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', background: connected ? '#f0fdf4' : '#fef2f2', border: `1px solid ${connected ? '#bbf7d0' : '#fecaca'}` }}>
            <div className={`live-dot ${connected ? 'green' : 'red'}`} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: connected ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
              {connected ? 'LINK ONLINE' : 'DISCONNECTED'}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Uptime: {uptime}</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Live Situational Overview
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {kpis.map((k, i) => (
            <div
              key={i}
              onClick={k.onClick}
              style={{ background: '#fff', border: `1px solid #e2e8f0`, borderRadius: '10px', padding: '16px', cursor: k.onClick.toString() !== '() => {}' ? 'pointer' : 'default', transition: 'all 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              onMouseEnter={e => { if (k.onClick.toString() !== '() => {}') { e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.1)'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: k.bg, border: `1px solid ${k.border}`, color: k.color }}>
                  {k.icon}
                </div>
                {k.onClick.toString() !== '() => {}' && (
                  <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 500 }}>View →</span>
                )}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: '4px' }}>
                {k.value}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>{k.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions + Recent Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Quick Actions */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="#2563eb" /> Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Open Tactical Map', sub: 'Drone positions & survivor heatmap', tab: 'MAP', icon: <Map size={14} /> },
              { label: 'View Satellite Intel', sub: 'Live Sentinel-2 flood coverage', tab: 'SATELLITE', icon: <Activity size={14} /> },
              { label: 'Rescue Priority Queue', sub: 'AI-ranked survivor rescue order', tab: 'QUEUE', icon: <Users size={14} /> },
              { label: 'TDoA Triangulation', sub: 'RF beacon geolocation simulation', tab: 'TDOA', icon: <TrendingUp size={14} /> },
            ].map(a => (
              <button
                key={a.tab}
                onClick={() => onNavigate(a.tab)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease', width: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <div style={{ color: '#2563eb', flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{a.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.sub}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} color="#f59e0b" /> Recent Alerts
            {criticalAlerts.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                {criticalAlerts.length} CRITICAL
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <CheckCircle size={24} style={{ margin: '0 auto 6px', opacity: 0.3 }} />
                All systems nominal
              </div>
            ) : alerts.slice(0, 6).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: '10px', padding: '8px 10px', borderRadius: '6px', background: a.level === 'CRITICAL' ? '#fef2f2' : a.level === 'WARNING' ? '#fffbeb' : '#eff6ff', border: `1px solid ${a.level === 'CRITICAL' ? '#fecaca' : a.level === 'WARNING' ? '#fde68a' : '#bfdbfe'}` }}>
                <div style={{ marginTop: '1px', flexShrink: 0 }}>
                  {a.level === 'CRITICAL' ? <ShieldAlert size={13} color="#ef4444" /> : <AlertTriangle size={13} color="#f59e0b" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{a.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
