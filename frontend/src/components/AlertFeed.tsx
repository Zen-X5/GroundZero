import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, AlertCircle, Globe, Activity } from 'lucide-react';
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
        .then(data => { if (data.features) setExternalAlerts(data.features.slice(0, 20)); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [activeTab, externalAlerts.length]);

  const getAlertColors = (level: string) => {
    if (level === 'CRITICAL') return { bg: '#fef2f2', border: '#fecaca', icon: <AlertCircle size={15} color="#ef4444" />, titleColor: '#b91c1c' };
    if (level === 'WARNING')  return { bg: '#fffbeb', border: '#fde68a', icon: <AlertTriangle size={15} color="#f59e0b" />, titleColor: '#92400e' };
    return { bg: '#eff6ff', border: '#bfdbfe', icon: <Info size={15} color="#2563eb" />, titleColor: '#1e40af' };
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Title & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="#2563eb" />
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Live Event Feed
          </h2>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('SENSOR')}
            style={{
              background: activeTab === 'SENSOR' ? '#fff' : 'transparent',
              color: activeTab === 'SENSOR' ? '#2563eb' : '#64748b',
              border: activeTab === 'SENSOR' ? '1px solid #e2e8f0' : '1px solid transparent',
              padding: '4px 12px', fontSize: '0.75rem', borderRadius: '5px', cursor: 'pointer', fontWeight: 600,
              boxShadow: activeTab === 'SENSOR' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>
            Sensor Report
          </button>
          <button
            onClick={() => setActiveTab('DISASTER')}
            style={{
              background: activeTab === 'DISASTER' ? '#fff' : 'transparent',
              color: activeTab === 'DISASTER' ? '#f59e0b' : '#64748b',
              border: activeTab === 'DISASTER' ? '1px solid #e2e8f0' : '1px solid transparent',
              padding: '4px 12px', fontSize: '0.75rem', borderRadius: '5px', cursor: 'pointer', fontWeight: 600,
              boxShadow: activeTab === 'DISASTER' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>
            Disaster Alerts
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* SENSOR TAB */}
        {activeTab === 'SENSOR' && (
          alerts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px', fontSize: '0.8rem' }}>
              <Activity size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              All systems normal. Monitoring incoming sensor feeds.
            </div>
          ) : (
            alerts.map((a) => {
              const c = getAlertColors(a.level);
              return (
                <div key={a.id} style={{ padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>{c.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <strong style={{ fontSize: '0.8rem', color: c.titleColor }}>{a.title}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{a.timestamp}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>{a.message}</p>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* DISASTER (USGS) TAB */}
        {activeTab === 'DISASTER' && (
          loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px', fontSize: '0.8rem' }}>
              Fetching global disaster telemetry...
            </div>
          ) : (
            externalAlerts.map((feature, idx) => {
              const mag = feature.properties.mag;
              const place = feature.properties.place;
              const time = new Date(feature.properties.time).toLocaleTimeString();
              const isSevere = mag >= 5.0;
              const bg     = isSevere ? '#fef2f2' : '#fffbeb';
              const border = isSevere ? '#fecaca' : '#fde68a';
              const color  = isSevere ? '#ef4444' : '#f59e0b';
              return (
                <div key={feature.id || idx} style={{ padding: '10px 12px', background: bg, border: `1px solid ${border}`, borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    <Globe size={15} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <strong style={{ fontSize: '0.8rem', color: isSevere ? '#b91c1c' : '#92400e' }}>M {mag.toFixed(1)} Earthquake</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{time}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>{place}</p>
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
