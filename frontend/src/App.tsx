import React, { useEffect, useState } from 'react';
import { SurvivorQueue } from './components/SurvivorQueue';
import { DroneGrid } from './components/DroneGrid';
import { NetworkStatus } from './components/NetworkStatus';
import { AlertFeed } from './components/AlertFeed';
import { SurvivorDetailModal } from './components/SurvivorDetailModal';
import { TacticalDisasterMap } from './components/TacticalDisasterMap';
import { MultiSpectralHUD } from './components/MultiSpectralHUD';
import { TDoASimulation3D } from './components/TDoASimulation3D';
import { MacroSatelliteMap } from './components/MacroSatelliteMap';
import { Dashboard } from './components/Dashboard';
import { Loading } from './components/Loading';
import CommandAgent from './components/CommandAgent';
import { getSocket } from '../lib/services/socket';
import {
  useGetDronesQuery,
  useGetSurvivorsQuery,
  useGetTopologyQuery,
  useGetBuildingsQuery,
} from '../lib/store/apiSlice';
import { Survivor, SystemAlert } from '../lib/types';
import {
  LayoutDashboard,
  Map,
  Camera,
  Radio,
  Users,
  Wifi,
  Bell,
  Activity,
  Satellite,
  TrendingUp,
} from 'lucide-react';

type Tab = 'HOME' | 'MAP' | 'SATELLITE' | 'HUD' | 'FLEET' | 'QUEUE' | 'MANET' | 'ALERTS' | 'TDOA';

// Page metadata: title, subtitle, and breadcrumb for each tab
const PAGE_META: Record<Tab, { title: string; subtitle: string; crumb: string }> = {
  HOME: { title: 'Mission Overview', subtitle: 'Live KPIs and situational awareness for the active rescue operation.', crumb: 'Dashboard' },
  MAP: { title: 'Tactical Disaster Map', subtitle: 'Real-time 2D/3D drone positions, survivor heatmap, and sector coverage.', crumb: 'Intelligence › Tactical Map' },
  SATELLITE: { title: 'Satellite Intel', subtitle: 'Live Sentinel-2 flood classification using NDWI and drone deployment zones.', crumb: 'Intelligence › Satellite Intel' },
  HUD: { title: 'Multi-Spectral HUD', subtitle: 'RGB + thermal camera feed from the selected active drone.', crumb: 'Intelligence › Multi-Spectral HUD' },
  FLEET: { title: 'Drone Fleet Telemetry', subtitle: 'Real-time battery, altitude, speed, and mesh status for all swarm nodes.', crumb: 'Operations › Drone Fleet' },
  QUEUE: { title: 'Rescue Priority Queue', subtitle: 'AI-ranked survivors sorted by risk score, confidence, and environment type.', crumb: 'Operations › Rescue Queue' },
  MANET: { title: 'MANET Mesh Topology', subtitle: 'Ad-hoc aerial communication network — link quality and relay node status.', crumb: 'Network › MANET Topology' },
  ALERTS: { title: 'Disaster Event Feed', subtitle: 'Sensor-triggered system alerts and live global seismic data from USGS.', crumb: 'Network › Disaster Feed' },
  TDOA: { title: 'TDoA Geolocation Simulation', subtitle: 'Time-difference-of-arrival RF multilateration for survivor phone triangulation.', crumb: 'Operations › TDoA Simulation' },
};

// Sidebar nav group definitions
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { tab: 'HOME' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { tab: 'MAP' as Tab, label: 'Tactical Map', icon: Map },
      { tab: 'SATELLITE' as Tab, label: 'Satellite Intel', icon: Satellite },
      { tab: 'HUD' as Tab, label: 'Multi-Spectral HUD', icon: Camera },
    ],
  },
  {
    label: 'Operations',
    items: [
      { tab: 'FLEET' as Tab, label: 'Drone Fleet', icon: Radio },
      { tab: 'QUEUE' as Tab, label: 'Rescue Queue', icon: Users },
      { tab: 'TDOA' as Tab, label: 'TDoA Simulation', icon: TrendingUp },
    ],
  },
  {
    label: 'Network',
    items: [
      { tab: 'MANET' as Tab, label: 'MANET Topology', icon: Wifi },
      { tab: 'ALERTS' as Tab, label: 'Disaster Feed', icon: Bell },
    ],
  },
];

export function App() {
  const [connected, setConnected] = useState(false);
  const [selectedSurvivor, setSelectedSurvivor] = useState<Survivor | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [activeDrone, setActiveDrone] = useState<string>('drone_2');

  const { data: drones = [], isLoading: isLoadingDrones } = useGetDronesQuery();
  const { data: survivors = [], isLoading: isLoadingSurvivors } = useGetSurvivorsQuery();
  const { data: topology = null } = useGetTopologyQuery();
  const { data: buildings = [] } = useGetBuildingsQuery();

  const [alerts, setAlerts] = useState<SystemAlert[]>([
    { id: '1', level: 'CRITICAL', title: 'Ground-Zero Blackout Active', message: 'Cellular grid offline. Aerial MANET mesh restored across Sectors A, B, C.', timestamp: '00:01 UTC' },
    { id: '2', level: 'WARNING', title: 'Sector A Flood Lake Rising', message: 'Water rising at 0.25m/hr. Priority queue updating for low-altitude perches.', timestamp: '00:02 UTC' },
  ]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('detection:survivor', (survivor: Survivor) => {
      setAlerts(prev => [{
        id: String(Date.now()),
        level: survivor.riskScore >= 80 ? 'CRITICAL' : 'WARNING',
        title: `Survivor Target: ${survivor.code}`,
        message: `Detected at (${survivor.globalPosition.x.toFixed(0)}m, ${survivor.globalPosition.y.toFixed(0)}m) - Risk ${survivor.riskScore.toFixed(1)} / Priority #${survivor.rescuePriorityRank || 1}`,
        timestamp: new Date().toTimeString().split(' ')[0],
      }, ...prev.slice(0, 15)]);
    });

    socket.on('system:alert', (alert: any) => {
      setAlerts(prev => [{
        id: String(Date.now()),
        level: alert.level || 'INFO',
        title: alert.title || 'System Alert',
        message: alert.message || '',
        timestamp: new Date().toTimeString().split(' ')[0],
      }, ...prev.slice(0, 15)]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('detection:survivor');
      socket.off('system:alert');
    };
  }, []);

  const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length;
  const meta = PAGE_META[activeTab] || { title: '404 - Subsystem Lost', subtitle: 'Requested resource is offline or outside current swarm boundary.', crumb: 'Error' };

  return (
    <div className="saas-container">

      <aside className="saas-sidebar">
        <div className="saas-logo-area">
          <div className="saas-logo-icon">
            <Activity size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
              GROUND-ZERO
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              AI SWARM RESCUE
            </div>
          </div>
        </div>

        {/* Grouped navigation */}
        <nav className="saas-nav-list">
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: '8px' }}>
              {/* Group label */}
              <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 12px 4px' }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const Icon = item.icon;
                // Count badges
                const badge =
                  item.tab === 'ALERTS' && criticalCount > 0 ? criticalCount :
                    item.tab === 'QUEUE' && survivors.length > 0 ? survivors.length :
                      item.tab === 'FLEET' && drones.length > 0 ? drones.length : null;

                return (
                  <div
                    key={item.tab}
                    className={`saas-nav-item ${activeTab === item.tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.tab)}
                  >
                    <Icon size={16} className="nav-icon" />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {badge !== null && (
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700,
                        minWidth: '18px', height: '18px', borderRadius: '9px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.tab === 'ALERTS' ? '#fef2f2' : '#eff6ff',
                        color: item.tab === 'ALERTS' ? '#ef4444' : '#2563eb',
                        border: item.tab === 'ALERTS' ? '1px solid #fecaca' : '1px solid #bfdbfe',
                        padding: '0 4px',
                      }}>
                        {badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="saas-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className={`live-dot ${connected ? 'green' : 'red'}`} />
            <span style={{ color: connected ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: '0.72rem' }}>
              {connected ? 'LINK ONLINE' : 'DISCONNECTED'}
            </span>
          </div>
          <span>Prakriti Avinya 2026</span>
        </div>
      </aside>

      <main className="saas-main-content">

        {/* Per-page header */}
        <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
            Ground-Zero › {meta.crumb}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '14px' }}>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
                {meta.title}
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{meta.subtitle}</p>
            </div>
            {/* Tab-specific action chips */}
            {activeTab === 'MAP' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                  {drones.length} Drones
                </span>
                <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontWeight: 600 }}>
                  {survivors.length} Survivors
                </span>
              </div>
            )}
            {activeTab === 'SATELLITE' && (
              <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 600 }}>
                📡 Copernicus Sentinel-2
              </span>
            )}
            {activeTab === 'ALERTS' && criticalCount > 0 && (
              <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontWeight: 600 }}>
                🔴 {criticalCount} Critical
              </span>
            )}
          </div>
        </div>

        {/* Tab content workspace */}
        <div className="saas-workspace">

          {(isLoadingDrones && drones.length === 0) || (isLoadingSurvivors && survivors.length === 0) ? (
            <Loading message="Connecting to swarm data bridge..." />
          ) : (
            <>
              {activeTab === 'HOME' && (
                <Dashboard
                  drones={drones}
                  survivors={survivors}
                  topology={topology}
                  alerts={alerts}
                  connected={connected}
                  onNavigate={(tab) => setActiveTab(tab as Tab)}
                />
              )}

              {activeTab === 'MAP' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
                  <TacticalDisasterMap
                    drones={drones}
                    survivors={survivors}
                    topology={topology}
                    buildings={buildings}
                    onSelectSurvivor={(s) => setSelectedSurvivor(s)}
                  />
                </div>
              )}

              {activeTab === 'SATELLITE' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
                  <MacroSatelliteMap />
                </div>
              )}

              {activeTab === 'HUD' && (
                <div style={{ flex: 1, height: 'calc(100vh - 120px)' }}>
                  <MultiSpectralHUD
                    activeDrone={activeDrone}
                    onSelectDrone={(d) => setActiveDrone(d)}
                  />
                </div>
              )}

              {activeTab === 'FLEET' && (
                <div style={{ flex: 1, height: 'calc(100vh - 120px)' }}>
                  <DroneGrid drones={drones} />
                </div>
              )}

              {activeTab === 'QUEUE' && (
                <div style={{ flex: 1, height: 'calc(100vh - 120px)' }}>
                  <SurvivorQueue
                    survivors={survivors}
                    onSelectSurvivor={(s) => setSelectedSurvivor(s)}
                  />
                </div>
              )}

              {activeTab === 'MANET' && (
                <div style={{ flex: 1, height: 'calc(100vh - 120px)' }}>
                  <NetworkStatus topology={topology} />
                </div>
              )}

              {activeTab === 'ALERTS' && (
                <div style={{ flex: 1, height: 'calc(100vh - 120px)' }}>
                  <AlertFeed alerts={alerts} />
                </div>
              )}

              {activeTab === 'TDOA' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
                  <TDoASimulation3D />
                </div>
              )}

            </>
          )}

        </div>
      </main>

      <SurvivorDetailModal
        survivor={selectedSurvivor}
        onClose={() => setSelectedSurvivor(null)}
      />
      <CommandAgent />
    </div>
  );
}

export default App;
