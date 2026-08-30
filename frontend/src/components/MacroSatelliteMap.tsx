import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, Satellite, ShieldAlert, Crosshair, Droplets, Calendar, Layers } from 'lucide-react';

const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Simulated drone deployment zones spread across the wider Assam flood region
const DRONE_ZONES = [
  { id: 'ALPHA', pos: [26.85, 92.2] as [number, number], sector: 'Barpeta District', drones: 3, status: 'ACTIVE' },
  { id: 'BRAVO', pos: [26.45, 93.8] as [number, number], sector: 'Morigaon District', drones: 4, status: 'SEARCHING' },
  { id: 'CHARLIE', pos: [26.75, 94.5] as [number, number], sector: 'Jorhat District', drones: 2, status: 'STANDBY' },
];

const zoneColor: Record<string, string> = {
  ACTIVE: '#22c55e',
  SEARCHING: '#f59e0b',
  STANDBY: '#60a5fa',
};

export const MacroSatelliteMap: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  useEffect(() => {
    const fetchSatelliteData = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8005/api/v1/satellite/live-flood-map');
        if (!res.ok) throw new Error('Failed to fetch satellite data');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setGeoData(data);
        setError(null);
      } catch (err: any) {
        console.error('Satellite Fetch Error:', err);
        setError(err.message || 'Failed to connect to AI Service');
      } finally {
        setLoading(false);
      }
    };
    fetchSatelliteData();
  }, []);

  // Color-coded by severity
  const geoJsonStyle = (feature: any) => {
    const severity = feature?.properties?.severity;
    const isDeep = severity === 'DEEP_FLOOD';
    return {
      fillColor: isDeep ? '#0891b2' : '#22d3ee',
      weight: isDeep ? 2 : 1,
      opacity: 0.9,
      color: isDeep ? '#06b6d4' : '#67e8f9',
      fillOpacity: isDeep ? 0.65 : 0.35,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const sev = feature?.properties?.severity || 'UNKNOWN';
    const ndwi = feature?.properties?.ndwi_mean;
    const ndwiStr = (typeof ndwi === 'number') ? ndwi.toFixed(3) : 'N/A';
    const isDeep = sev === 'DEEP_FLOOD';

    layer.bindPopup(`
      <div style="font-family:monospace;min-width:200px;padding:4px 0;">
        <div style="color:${isDeep ? '#0ea5e9' : '#22d3ee'};font-weight:bold;font-size:13px;margin-bottom:6px;">
          ⚠ ${isDeep ? 'DEEP INUNDATION' : 'FLOOD MARGIN'}
        </div>
        <div style="color:#374151;font-size:12px;line-height:1.8;">
          NDWI Index: <b>${ndwiStr}</b><br/>
          Severity: <b>${sev.replace('_', ' ')}</b><br/>
          Ground Status: <b>${isDeep ? 'Impassable' : 'Hazardous'}</b><br/>
          Action: <b>${isDeep ? '🚁 Aerial rescue only' : '⚠ Drone perimeter scan'}</b>
        </div>
      </div>
    `);

    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.85, weight: 3 }));
    layer.on('mouseout', () => layer.setStyle(geoJsonStyle(feature)));
  };

  const deepCount = geoData?.features?.filter((f: any) => f.properties?.severity === 'DEEP_FLOOD').length ?? 0;
  const shallowCount = geoData?.features?.filter((f: any) => f.properties?.severity === 'SHALLOW_FLOOD').length ?? 0;
  const totalDrones = DRONE_ZONES.reduce((a, z) => a + z.drones, 0);

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#020617', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden', position: 'relative' }}>
      
      {/* ─── LEFT STATS PANEL ─── */}
      <div style={{ width: '230px', flexShrink: 0, backgroundColor: 'rgba(2,6,23,0.95)', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', zIndex: 1000, overflowY: 'auto' }}>
        
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Satellite size={18} color="#60a5fa" />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.08em', fontFamily: 'monospace' }}>SATELLITE INTEL</div>
            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>Sentinel-2 / NDWI</div>
          </div>
          {loading && <Activity size={12} color="#22d3ee" style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />}
          {!loading && !error && <span style={{ marginLeft: 'auto', fontSize: '10px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.3)' }}>LIVE</span>}
        </div>

        {/* Imagery Date */}
        {geoData?.imagery_date && (
          <div style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Calendar size={12} color="#94a3b8" />
              <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase' }}>Imagery Date</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>{geoData.imagery_date}</div>
          </div>
        )}

        {/* Flood Stats */}
        <div style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Droplets size={12} color="#94a3b8" />
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase' }}>Flood Zones</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', backgroundColor: '#0891b2', borderRadius: '2px', border: '1px solid #06b6d4' }} />
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>Deep Water</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0ea5e9', fontFamily: 'monospace' }}>{deepCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', backgroundColor: '#22d3ee', borderRadius: '2px', border: '1px solid #67e8f9', opacity: 0.7 }} />
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>Shallow/Edge</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#22d3ee', fontFamily: 'monospace' }}>{shallowCount}</span>
            </div>
          </div>
        </div>

        {/* Drone Swarm Deployments */}
        <div style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Crosshair size={12} color="#94a3b8" />
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase' }}>Drone Deployment</span>
          </div>
          {DRONE_ZONES.map(z => (
            <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '6px', borderRadius: '4px', backgroundColor: 'rgba(15,23,42,0.6)' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: zoneColor[z.status], fontFamily: 'monospace' }}>SWARM {z.id}</div>
                <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{z.sector}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>{z.drones}x</div>
                <div style={{ fontSize: '9px', color: zoneColor[z.status], fontFamily: 'monospace' }}>{z.status}</div>
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #334155', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>TOTAL DRONES</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{totalDrones}</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Layers size={12} color="#94a3b8" />
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase' }}>Map Legend</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '10px', color: '#cbd5e1', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '18px', height: '10px', backgroundColor: 'rgba(8,145,178,0.65)', border: '2px solid #06b6d4', borderRadius: '2px' }} /> Deep Flood (NDWI &gt; 0.3)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '18px', height: '10px', backgroundColor: 'rgba(34,211,238,0.35)', border: '1px solid #67e8f9', borderRadius: '2px' }} /> Shallow Flood (NDWI &gt; 0.1)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '50%' }} /> Active Swarm Zone</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '50%' }} /> Searching Zone</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#60a5fa', borderRadius: '50%' }} /> Standby Zone</div>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(69,10,10,0.8)', border: '1px solid #ef4444', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <ShieldAlert size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ color: '#f87171', fontWeight: 700, fontSize: '11px', fontFamily: 'monospace' }}>LINK FAILED</div>
              <div style={{ color: 'rgba(252,165,165,0.7)', fontSize: '10px', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-word' }}>{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MAP ─── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Header strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 14px', background: 'linear-gradient(to bottom, rgba(2,6,23,0.85), transparent)', zIndex: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            📡 Source: Copernicus Sentinel-2 · Region: Jorhat, Assam, India · NDWI Flood Classification
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22d3ee', fontSize: '11px', fontFamily: 'monospace' }}>
              <Activity size={12} /> Fetching live telemetry...
            </div>
          )}
        </div>

        <MapContainer
          center={[26.5, 93.0]}
          zoom={8}
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          zoomControl={true}
        >
          {/* Base satellite imagery (Esri) */}
          <TileLayer url={SATELLITE_TILE_URL} maxZoom={19} attribution="&copy; Esri, Maxar" />

          {/* Sentinel-2 True Color imagery from Earth Engine */}
          {geoData?.tile_url && (
            <TileLayer url={geoData.tile_url} maxZoom={19} opacity={0.75} attribution="&copy; Google Earth Engine / Copernicus" />
          )}

          {/* Flood polygons color-coded by severity */}
          {geoData?.features?.length > 0 && (
            <GeoJSON
              key={geoData.imagery_date}
              data={geoData}
              style={geoJsonStyle}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Drone Swarm Deployment Markers */}
          {DRONE_ZONES.map(zone => (
            <React.Fragment key={zone.id}>
              {/* Outer search radius ring */}
              <Circle
                center={zone.pos}
                radius={8000}
                pathOptions={{ color: zoneColor[zone.status], fillColor: zoneColor[zone.status], fillOpacity: 0.05, weight: 1.5, dashArray: '6 4' }}
              />
              {/* Center marker */}
              <CircleMarker
                center={zone.pos}
                radius={9}
                pathOptions={{ color: zoneColor[zone.status], fillColor: zoneColor[zone.status], fillOpacity: 0.85, weight: 2 }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', padding: '4px 0', minWidth: '180px' }}>
                    <div style={{ color: zoneColor[zone.status], fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                      🚁 SWARM {zone.id}
                    </div>
                    <div style={{ color: '#374151', fontSize: '12px', lineHeight: '1.8' }}>
                      Sector: <b>{zone.sector}</b><br/>
                      Drones Deployed: <b>{zone.drones}</b><br/>
                      Status: <b style={{ color: zoneColor[zone.status] }}>{zone.status}</b><br/>
                      Search Radius: <b>1.5 km</b>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Vignette border */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 60px rgba(2,6,23,0.6)', zIndex: 500 }} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .leaflet-popup-content-wrapper { border-radius: 8px !important; border: 1px solid #e2e8f0; }
      `}</style>
    </div>
  );
};
