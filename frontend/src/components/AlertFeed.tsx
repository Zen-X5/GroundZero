import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, AlertCircle, Globe } from 'lucide-react';
import { SystemAlert } from '../../lib/types';

interface AlertProps {
  alerts: SystemAlert[];
}

export const AlertFeed: React.FC<AlertProps> = ({ alerts }) => {
  const [activeTab, setActiveTab] = useState<'SENSOR' | 'DISASTER'>('SENSOR');
  const [externalAlerts, setExternalAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'DISASTER' && externalAlerts.length === 0) {
      setLoading(true);
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson')
        .then(res => res.json())
        .then(data => {
          if (data.features) {
            setExternalAlerts(data.features.slice(0, 20));
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [activeTab, externalAlerts.length]);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <AlertCircle size={15} color="var(--accent-crimson)" />;
      case 'WARNING': return <AlertTriangle size={15} color="var(--accent-amber)" />;
      default: return <Info size={15} color="var(--accent-cyan)" />;
    }
  };

  const getAlertBorder = (level: string) => {
    switch (level) {
      case 'CRITICAL': return '1px solid rgba(255, 42, 85, 0.35)';
      case 'WARNING': return '1px solid rgba(255, 184, 0, 0.35)';
      default: return '1px solid rgba(0, 240, 255, 0.25)';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Live Event Feed
          </h2>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '6px' }}>
          <button 
            onClick={() => setActiveTab('SENSOR')}
            style={{ 
              background: activeTab === 'SENSOR' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'SENSOR' ? '#000' : 'var(--text-muted)',
              border: 'none', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600
            }}>
            Sensor Report
          </button>
          <button 
            onClick={() => setActiveTab('DISASTER')}
            style={{ 
              background: activeTab === 'DISASTER' ? 'var(--accent-amber)' : 'transparent',
              color: activeTab === 'DISASTER' ? '#000' : 'var(--text-muted)',
              border: 'none', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600
            }}>
            Disaster Alerts
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* SENSOR TAB */}
        {activeTab === 'SENSOR' && (
          alerts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px', fontSize: '0.8rem' }}>
              All systems normal. Monitoring incoming sensor feeds.
            </div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: getAlertBorder(a.level),
                  borderRadius: '6px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ marginTop: '2px' }}>{getAlertIcon(a.level)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#fff' }}>{a.title}</strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{a.timestamp}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{a.message}</p>
                </div>
              </div>
            ))
          )
        )}

        {/* DISASTER ALERTS TAB (USGS) */}
        {activeTab === 'DISASTER' && (
          loading ? (
             <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px', fontSize: '0.8rem' }}>
              Fetching global disaster telemetry...
            </div>
          ) : (
            externalAlerts.map((feature, idx) => {
              const mag = feature.properties.mag;
              const place = feature.properties.place;
              const time = new Date(feature.properties.time).toLocaleTimeString();
              const isSevere = mag >= 5.0;
              
              return (
                <div
                  key={feature.id || idx}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: isSevere ? '1px solid rgba(255, 42, 85, 0.35)' : '1px solid rgba(255, 184, 0, 0.35)',
                    borderRadius: '6px',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ marginTop: '2px' }}>
                     <Globe size={15} color={isSevere ? "var(--accent-crimson)" : "var(--accent-amber)"} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#fff' }}>M {mag.toFixed(1)} Earthquake</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{time}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{place}</p>
                  </div>
                </div>
              );
            })
          )
        )}

      </div>

    </div>
  );
};
