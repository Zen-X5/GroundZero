import React from 'react';
import { Bell, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { SystemAlert } from '../../lib/types';

interface AlertProps {
  alerts: SystemAlert[];
}

export const AlertFeed: React.FC<AlertProps> = ({ alerts }) => {
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

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Live Disaster Event Feed
          </h2>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Real-Time Log
        </span>
      </div>

      {/* Alert Feed Items */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.length === 0 ? (
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
        )}
      </div>

    </div>
  );
};
