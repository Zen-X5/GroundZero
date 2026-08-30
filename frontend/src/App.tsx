import React, { useEffect, useState } from 'react';
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
import { 
  Map, 
  Camera, 
  Radio, 
  Building2, 
  Users, 
  Wifi, 
  Bell, 
  Activity, 
  ShieldCheck 
} from 'lucide-react';

export function App() {
  const [connected, setConnected] = useState(false);
  const [selectedSurvivor, setSelectedSurvivor] = useState<Survivor | null>(null);
  const [activeTab, setActiveTab] = useState<'MAP' | 'HUD' | 'FLEET' | 'BUILDINGS' | 'QUEUE' | 'MANET' | 'ALERTS'>('MAP');
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
    <div className="saas-container">
      {/* Left Navigation Sidebar */}
      <aside className="saas-sidebar">
        <div className="saas-logo-area">
          <div className="saas-logo-icon">
            <Activity size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
              GROUND-ZERO
            </h1>
            <span style={{ fontSize: '0.62rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              AI SWARM RESCUE
            </span>
          </div>
        </div>

        <nav className="saas-nav-list">
          <div 
            className={`saas-nav-item ${activeTab === 'MAP' ? 'active' : ''}`}
            onClick={() => setActiveTab('MAP')}
          >
            <Map size={18} className="nav-icon" />
            <span>Tactical Map</span>
          </div>

          <div 
            className={`saas-nav-item ${activeTab === 'HUD' ? 'active' : ''}`}
            onClick={() => setActiveTab('HUD')}
          >
            <Camera size={18} className="nav-icon" />
            <span>Multi-Spectral HUD</span>
          </div>

          <div 
            className={`saas-nav-item ${activeTab === 'FLEET' ? 'active' : ''}`}
            onClick={() => setActiveTab('FLEET')}
          >
            <Radio size={18} className="nav-icon" />
            <span>Drone Fleet ({drones.length})</span>
          </div>

          <div 
            className={`saas-nav-item ${activeTab === 'BUILDINGS' ? 'active' : ''}`}
            onClick={() => setActiveTab('BUILDINGS')}
          >
            <Building2 size={18} className="nav-icon" />
            <span>Building Voids ({buildings.length})</span>
          </div>

          <div 
            className={`saas-nav-item ${activeTab === 'QUEUE' ? 'active' : ''}`}
            onClick={() => setActiveTab('QUEUE')}
          >
            <Users size={18} className="nav-icon" />
            <span>Rescue Queue ({survivors.length})</span>
          </div>

          <div 
            className={`saas-nav-item ${activeTab === 'MANET' ? 'active' : ''}`}
            onClick={() => setActiveTab('MANET')}
          >
            <Wifi size={18} className="nav-icon" />
            <span>MANET Topology</span>
          </div>

          <div 
            className={`saas-nav-item ${activeTab === 'ALERTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALERTS')}
          >
            <Bell size={18} className="nav-icon" />
            <span>Disaster Feed ({alerts.length})</span>
          </div>
        </nav>

        <div className="saas-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className={`live-dot ${connected ? 'green' : 'red'}`} />
            <span style={{ color: connected ? 'var(--text-main)' : 'var(--accent-crimson)', fontWeight: 700 }}>
              {connected ? 'LINK ONLINE' : 'DISCONNECTED'}
            </span>
          </div>
          <span style={{ fontSize: '0.62rem' }}>Prakriti Avinya 2026</span>
        </div>
      </aside>

      {/* Right Main Panel Workspace */}
      <main className="saas-main-content">
        <div className="saas-workspace">
          {activeTab === 'MAP' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
              <TacticalDisasterMap
                drones={drones}
                survivors={survivors}
                topology={topology}
                buildings={buildings}
                onSelectSurvivor={(s) => setSelectedSurvivor(s)}
              />
            </div>
          )}

          {activeTab === 'HUD' && (
            <div style={{ flex: 1, height: 'calc(100vh - 48px)' }}>
              <MultiSpectralHUD
                activeDrone={activeDrone}
                onSelectDrone={(d) => setActiveDrone(d)}
              />
            </div>
          )}

          {activeTab === 'FLEET' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                  Swarm Telemetry Fleet Nodes
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Real-time health, altitude coordinates, and navigation speeds of active search quadcopters.
                </p>
              </div>
              <DroneGrid drones={drones} />
            </div>
          )}

          {activeTab === 'BUILDINGS' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                  Collapsed Structure Openings & Balcony Voids
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Accessibility surveys and thermal venting scores per structure (concrete void perimeter inspections).
                </p>
              </div>
              <BuildingCards buildings={buildings} />
            </div>
          )}

          {activeTab === 'QUEUE' && (
            <div style={{ flex: 1, height: 'calc(100vh - 48px)' }}>
              <SurvivorQueue
                survivors={survivors}
                onSelectSurvivor={(s) => setSelectedSurvivor(s)}
              />
            </div>
          )}

          {activeTab === 'MANET' && (
            <div style={{ flex: 1, height: 'calc(100vh - 48px)' }}>
              <NetworkStatus topology={topology} />
            </div>
          )}

          {activeTab === 'ALERTS' && (
            <div style={{ flex: 1, height: 'calc(100vh - 48px)' }}>
              <AlertFeed alerts={alerts} />
            </div>
          )}
        </div>
      </main>

      {/* Explainable AI Detail Modal */}
      <SurvivorDetailModal
        survivor={selectedSurvivor}
        onClose={() => setSelectedSurvivor(null)}
      />
    </div>
  );
}

export default App;
