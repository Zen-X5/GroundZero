import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { SurvivorQueue } from './components/SurvivorQueue';
import { DroneGrid } from './components/DroneGrid';
import { BuildingCards } from './components/BuildingCards';
import { NetworkStatus } from './components/NetworkStatus';
import { AlertFeed } from './components/AlertFeed';
import { SurvivorDetailModal } from './components/SurvivorDetailModal';
import { TacticalDisasterMap } from './components/TacticalDisasterMap';
import { MultiSpectralHUD } from './components/MultiSpectralHUD';
import { getSocket } from '../lib/services/socket';
import {
  useGetDronesQuery,
  useGetSurvivorsQuery,
  useGetTopologyQuery,
  useGetBuildingsQuery,
} from '../lib/store/apiSlice';
import { Survivor, SystemAlert } from '../lib/types';
import { Map, Camera, Radio } from 'lucide-react';

export function App() {
  const [connected, setConnected] = useState(false);
  const [selectedSurvivor, setSelectedSurvivor] = useState<Survivor | null>(null);
  const [centerTab, setCenterTab] = useState<'MAP' | 'HUD' | 'SWARM'>('MAP');
  const [activeDrone, setActiveDrone] = useState<string>('drone_2');

  // RTK Query Hooks with Automated Tag Caching & WebSocket Streaming
  const { data: drones = [] } = useGetDronesQuery();
  const { data: survivors = [] } = useGetSurvivorsQuery();
  const { data: topology = null } = useGetTopologyQuery();
  const { data: buildings = [] } = useGetBuildingsQuery();

  const [alerts, setAlerts] = useState<SystemAlert[]>([
    {
      id: '1',
      level: 'CRITICAL',
      title: 'Ground-Zero Blackout Active',
      message: 'Cellular grid offline. Aerial MANET mesh restored across Sectors A, B, C.',
      timestamp: '00:01 UTC',
    },
    {
      id: '2',
      level: 'WARNING',
      title: 'Sector A Flood Lake Rising',
      message: 'Water rising at 0.25m/hr. Priority queue updating for low-altitude perches.',
      timestamp: '00:02 UTC',
    },
  ]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('detection:survivor', (survivor: Survivor) => {
      setAlerts((prev) => [
        {
          id: String(Date.now()),
          level: survivor.riskScore >= 80 ? 'CRITICAL' : 'WARNING',
          title: `Survivor Target: ${survivor.code}`,
          message: `Detected at (${survivor.globalPosition.x.toFixed(0)}m, ${survivor.globalPosition.y.toFixed(0)}m) - Risk ${survivor.riskScore.toFixed(1)} / Priority #${survivor.rescuePriorityRank || 1}`,
          timestamp: new Date().toTimeString().split(' ')[0],
        },
        ...prev.slice(0, 15),
      ]);
    });

    socket.on('system:alert', (alert: any) => {
      setAlerts((prev) => [
        {
          id: String(Date.now()),
          level: alert.level || 'INFO',
          title: alert.title || 'System Alert',
          message: alert.message || '',
          timestamp: new Date().toTimeString().split(' ')[0],
        },
        ...prev.slice(0, 15),
      ]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('detection:survivor');
      socket.off('system:alert');
    };
  }, []);

  const criticalCount = survivors.filter((s) => s.riskScore >= 80).length;

  return (
    <div style={{ maxWidth: '1720px', margin: '0 auto', padding: '16px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top Command Bar */}
      <Header
        connected={connected}
        survivorsCount={survivors.length}
        criticalCount={criticalCount}
        dronesCount={drones.length}
      />

      {/* Main Grid Command Center */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr 340px', gap: '16px', flex: 1 }}>

        {/* Left Column: Prioritized Rescue Queue */}
        <div style={{ height: 'calc(100vh - 120px)' }}>
          <SurvivorQueue
            survivors={survivors}
            onSelectSurvivor={(s) => setSelectedSurvivor(s)}
          />
        </div>

        {/* Center Column: Interactive Tactical Map / Multi-Spectral HUD / Building Openings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: 'calc(100vh - 120px)' }}>

          {/* Center Pane Tab Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-cyber"
              onClick={() => setCenterTab('MAP')}
              style={{
                background: centerTab === 'MAP' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0,0,0,0.3)',
                borderColor: centerTab === 'MAP' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: centerTab === 'MAP' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.78rem',
                padding: '6px 14px',
              }}
            >
              <Map size={14} /> Tactical Map (2D Grid)
            </button>

            <button
              className="btn-cyber"
              onClick={() => setCenterTab('HUD')}
              style={{
                background: centerTab === 'HUD' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0,0,0,0.3)',
                borderColor: centerTab === 'HUD' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: centerTab === 'HUD' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.78rem',
                padding: '6px 14px',
              }}
            >
              <Camera size={14} /> Multi-Spectral Live HUD
            </button>

            <button
              className="btn-cyber"
              onClick={() => setCenterTab('SWARM')}
              style={{
                background: centerTab === 'SWARM' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0,0,0,0.3)',
                borderColor: centerTab === 'SWARM' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: centerTab === 'SWARM' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.78rem',
                padding: '6px 14px',
              }}
            >
              <Radio size={14} /> Swarm Telemetry Nodes
            </button>
          </div>

          {/* Dynamic Center Pane Content */}
          <div style={{ flex: '1 1 55%', minHeight: '340px' }}>
            {centerTab === 'MAP' && (
              <TacticalDisasterMap
                drones={drones}
                survivors={survivors}
                onSelectSurvivor={(s) => setSelectedSurvivor(s)}
              />
            )}
            {centerTab === 'HUD' && (
              <MultiSpectralHUD
                activeDrone={activeDrone}
                onSelectDrone={(d) => setActiveDrone(d)}
              />
            )}
            {centerTab === 'SWARM' && (
              <DroneGrid drones={drones} />
            )}
          </div>

          {/* Lower Center: Building Void Inspections */}
          <div style={{ flex: '1 1 45%', minHeight: '260px' }}>
            <BuildingCards buildings={buildings} />
          </div>

        </div>

        {/* Right Column: MANET Mesh Network & Live Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: 'calc(100vh - 120px)' }}>
          <div style={{ flex: '1 1 45%' }}>
            <NetworkStatus topology={topology} />
          </div>
          <div style={{ flex: '1 1 55%' }}>
            <AlertFeed alerts={alerts} />
          </div>
        </div>

      </div>

      {/* Explainable AI Detail Modal */}
      <SurvivorDetailModal
        survivor={selectedSurvivor}
        onClose={() => setSelectedSurvivor(null)}
      />

    </div>
  );
}

export default App;
