import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, Satellite, ShieldAlert, Crosshair, Droplets, Calendar, Layers } from 'lucide-react';
import { Loading } from './Loading';

const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Drone deployment zones
const DRONE_ZONES = [
  { id: 'ALPHA',   pos: [26.85, 92.2] as [number, number], sector: 'Barpeta District',  drones: 3, status: 'ACTIVE'    },
  { id: 'BRAVO',   pos: [26.45, 93.8] as [number, number], sector: 'Morigaon District', drones: 4, status: 'SEARCHING' },
  { id: 'CHARLIE', pos: [26.75, 94.5] as [number, number], sector: 'Jorhat District',   drones: 2, status: 'STANDBY'   },
];

const zoneColor: Record<string, string> = {
  ACTIVE:    '#2563eb',  // blue-600
  SEARCHING: '#f59e0b',  // amber
  STANDBY:   '#64748b',  // slate
};

// ── Shared style tokens matching the light theme ──────────────
const T = {
  card:       '#ffffff',
  page:       '#f8fafc',
  border:     '#e2e8f0',
  borderMd:   '#cbd5e1',
  accent:     '#2563eb',
  accentLight:'#eff6ff',
  accentMid:  '#bfdbfe',
  text:       '#0f172a',
  textSub:    '#475569',
  textMuted:  '#94a3b8',
  red:        '#ef4444',
  redLight:   '#fef2f2',
};

export const MacroSatelliteMap: React.FC = () => {
  const [geoData,  setGeoData]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const fetchSatelliteData = async () => {
      try {
        setLoading(true);
        const res  = await fetch('http://localhost:8005/api/v1/satellite/live-flood-map');
        if (!res.ok) throw new Error('Failed to fetch satellite data');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setGeoData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to connect to AI Service');
      } finally {
        setLoading(false);
      }
    };
    fetchSatelliteData();
  }, []);

  // Flood polygon styles — blue palette
  const geoJsonStyle = (feature: any) => {
    const isDeep = feature?.properties?.severity === 'DEEP_FLOOD';
    return {
      fillColor:   isDeep ? '#1d4ed8' : '#3b82f6',
      color:       isDeep ? '#2563eb' : '#60a5fa',
      weight:      isDeep ? 2 : 1,
      opacity:     0.9,
      fillOpacity: isDeep ? 0.55 : 0.3,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const sev   = feature?.properties?.severity ?? 'UNKNOWN';
    const ndwi  = feature?.properties?.ndwi_mean;
    const ndwiStr = typeof ndwi === 'number' ? ndwi.toFixed(3) : 'N/A';
    const isDeep = sev === 'DEEP_FLOOD';

    layer.bindPopup(`
      <div style="font-family:Inter,sans-serif;min-width:190px;padding:4px 0;">
        <div style="color:${isDeep ? '#1d4ed8' : '#2563eb'};font-weight:700;font-size:13px;margin-bottom:6px;">
          ${isDeep ? '🔵 Deep Inundation' : '🔷 Flood Margin'}
        </div>
        <div style="color:#374151;font-size:12px;line-height:1.9;">
          NDWI Index: <b>${ndwiStr}</b><br/>
          Severity: <b>${sev.replace('_', ' ')}</b><br/>
          Ground Access: <b>${isDeep ? 'Impassable' : 'Hazardous'}</b><br/>
          Action: <b>${isDeep ? '🚁 Aerial rescue only' : '⚠ Drone perimeter scan'}</b>
        </div>
      </div>
    `);
    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.75, weight: 3 }));
    layer.on('mouseout',  () => layer.setStyle(geoJsonStyle(feature)));
  };

  const deepCount    = geoData?.features?.filter((f: any) => f.properties?.severity === 'DEEP_FLOOD').length  ?? 0;
  const shallowCount = geoData?.features?.filter((f: any) => f.properties?.severity === 'SHALLOW_FLOOD').length ?? 0;
  const totalDrones  = DRONE_ZONES.reduce((a, z) => a + z.drones, 0);

  return (
    <div style={{ display: 'flex', height: '100%', background: T.page, borderRadius: '12px', border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>

      {/* ── LEFT STATS PANEL ──────────────────────────────────── */}
      <div style={{ width: '220px', flexShrink: 0, background: T.card, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: T.accentLight, borderRadius: '6px', border: `1px solid ${T.accentMid}` }}>
            <Satellite size={16} color={T.accent} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: T.text }}>Satellite Intel</div>
            <div style={{ fontSize: '10px', color: T.textMuted, fontFamily: 'monospace' }}>Sentinel-2 · NDWI</div>
          </div>
          {loading && <Activity size={12} color={T.accent} style={{ marginLeft: 'auto' }} />}
          {!loading && !error && (
            <span style={{ marginLeft: 'auto', fontSize: '10px', background: '#f0fdf4', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 600 }}>LIVE</span>
          )}
        </div>

        {/* Imagery date */}
        {geoData?.imagery_date && (
          <div style={{ background: T.page, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
              <Calendar size={11} color={T.textMuted} />
              <span style={{ fontSize: '10px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imagery Date</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: T.text, fontFamily: 'monospace' }}>{geoData.imagery_date}</div>
          </div>
        )}

        {/* Flood stats */}
        <div style={{ background: T.page, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <Droplets size={11} color={T.textMuted} />
            <span style={{ fontSize: '10px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Flood Zones</span>
          </div>
          {[
            { label: 'Deep Water',    count: deepCount,    bg: '#eff6ff', border: T.accentMid, dot: '#1d4ed8', textColor: T.accent },
            { label: 'Shallow / Edge', count: shallowCount, bg: '#e0f2fe', border: '#7dd3fc',  dot: '#3b82f6', textColor: '#0ea5e9' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: r.bg, border: `2px solid ${r.dot}`, borderRadius: '2px' }} />
                <span style={{ fontSize: '11px', color: T.textSub }}>{r.label}</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: r.textColor }}>{r.count}</span>
            </div>
          ))}
        </div>

        {/* Drone deployments */}
        <div style={{ background: T.page, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <Crosshair size={11} color={T.textMuted} />
            <span style={{ fontSize: '10px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Drone Deployment</span>
          </div>
          {DRONE_ZONES.map(z => (
            <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '6px 8px', borderRadius: '6px', background: T.card, border: `1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: zoneColor[z.status] }}>SWARM {z.id}</div>
                <div style={{ fontSize: '10px', color: T.textMuted }}>{z.sector}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.text }}>{z.drones}x</div>
                <div style={{ fontSize: '9px', color: zoneColor[z.status], fontWeight: 600 }}>{z.status}</div>
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: T.textMuted }}>Total Drones</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: T.text }}>{totalDrones}</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ background: T.page, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <Layers size={11} color={T.textMuted} />
            <span style={{ fontSize: '10px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '10px', color: T.textSub }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '18px', height: '10px', background: 'rgba(29,78,216,0.55)', border: '2px solid #2563eb', borderRadius: '2px' }} /> Deep Flood (NDWI &gt; 0.3)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '18px', height: '10px', background: 'rgba(59,130,246,0.3)', border: '1px solid #60a5fa', borderRadius: '2px' }} /> Shallow Flood (NDWI &gt; 0.1)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#2563eb', borderRadius: '50%' }} /> Active Swarm</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }} /> Searching</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#64748b', borderRadius: '50%' }} /> Standby</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: T.redLight, border: `1px solid #fecaca`, padding: '10px', borderRadius: '8px', display: 'flex', gap: '8px' }}>
            <ShieldAlert size={15} color={T.red} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ color: T.red, fontWeight: 700, fontSize: '11px' }}>Link Failed</div>
              <div style={{ color: '#b91c1c', fontSize: '10px', marginTop: '2px', wordBreak: 'break-word' }}>{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── MAP ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Top info bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '36px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${T.border}`, zIndex: 800, display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: T.textSub, fontFamily: 'monospace' }}>
            📡 Copernicus Sentinel-2 · Jorhat, Assam, India · NDWI Flood Classification
          </span>
          {loading && (
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: T.accent, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={11} /> Fetching...
            </span>
          )}
        </div>

        {loading && !geoData ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderLeft: `1px solid ${T.border}` }}>
            <Loading message="Fetching live Sentinel-2 flood map polygons..." />
          </div>
        ) : (
          <MapContainer center={[26.5, 93.0]} zoom={8} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer url={SATELLITE_TILE_URL} maxZoom={19} attribution="&copy; Esri, Maxar" />

            {geoData?.tile_url && (
              <TileLayer url={geoData.tile_url} maxZoom={19} opacity={0.8} attribution="&copy; Google Earth Engine / Copernicus" />
            )}

            {geoData?.features?.length > 0 && (
              <GeoJSON key={geoData.imagery_date} data={geoData} style={geoJsonStyle} onEachFeature={onEachFeature} />
            )}

            {DRONE_ZONES.map(zone => (
              <React.Fragment key={zone.id}>
                <Circle center={zone.pos} radius={8000} pathOptions={{ color: zoneColor[zone.status], fillColor: zoneColor[zone.status], fillOpacity: 0.06, weight: 1.5, dashArray: '6 4' }} />
                <CircleMarker center={zone.pos} radius={9} pathOptions={{ color: '#fff', fillColor: zoneColor[zone.status], fillOpacity: 1, weight: 2 }}>
                  <Popup>
                    <div style={{ fontFamily: 'Inter,sans-serif', minWidth: '180px', padding: '4px 0' }}>
                      <div style={{ color: zoneColor[zone.status], fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                        🚁 SWARM {zone.id}
                      </div>
                      <div style={{ color: '#374151', fontSize: '12px', lineHeight: '1.8' }}>
                        Sector: <b>{zone.sector}</b><br />
                        Drones: <b>{zone.drones}</b><br />
                        Status: <b style={{ color: zoneColor[zone.status] }}>{zone.status}</b><br />
                        Search Radius: <b>8 km</b>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            ))}
          </MapContainer>
        )}
      </div>

      <style>{`
        .leaflet-popup-content-wrapper { border-radius: 10px !important; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
        .leaflet-popup-tip { background: #fff !important; }
        .leaflet-container { font-family: Inter, sans-serif; }
        .leaflet-control-zoom a { border-color: #e2e8f0 !important; color: #475569 !important; }
        .leaflet-control-zoom a:hover { background: #eff6ff !important; color: #2563eb !important; }
      `}</style>
    </div>
  );
};
