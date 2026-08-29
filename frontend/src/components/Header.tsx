import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Radio, Play, Users, Clock } from 'lucide-react';
import { useTriggerAiSimulationMutation } from '../../lib/store/apiSlice';

interface HeaderProps {
  connected: boolean;
  survivorsCount: number;
  criticalCount: number;
  dronesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  connected,
  survivorsCount,
  criticalCount,
  dronesCount,
}) => {
  const [time, setTime] = useState<string>('');
  const [triggerAiSim, { isLoading: isSimulating }] = useTriggerAiSimulationMutation();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async () => {
    try {
      await triggerAiSim().unwrap();
    } catch (e) {
      console.error('Simulation error:', e);
    }
  };

  return (
    <header className="glass-panel" style={{ padding: '16px 24px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>

        {/* Project Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(255, 42, 85, 0.2))',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)'
          }}>
            <ShieldAlert size={24} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.04em', color: '#fff' }}>
                GROUND-ZERO <span style={{ color: 'var(--accent-cyan)' }}>AI RESCUE</span>
              </h1>
              <span className="badge-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                RTK QUERY + DIGITAL TWIN
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Autonomous Aerial Swarm Rescue & Emergency Communication Blackout System
            </p>
          </div>
        </div>

        {/* Live Command Telemetry Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>

          {/* Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div className={`live-dot ${connected ? 'green' : 'red'}`} />
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: connected ? 'var(--accent-emerald)' : 'var(--accent-crimson)' }}>
              {connected ? 'LIVE FEED CONNECTED' : 'CONNECTING TO BACKEND'}
            </span>
          </div>

          {/* Quick Counter Badges */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ padding: '6px 12px', background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={14} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drones:</span>
              <strong style={{ fontSize: '0.85rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>{dronesCount}</strong>
            </div>

            <div style={{ padding: '6px 12px', background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={14} color="var(--accent-emerald)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Survivors:</span>
              <strong style={{ fontSize: '0.85rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>{survivorsCount}</strong>
            </div>

            <div style={{ padding: '6px 12px', background: 'rgba(255, 42, 85, 0.08)', border: '1px solid rgba(255, 42, 85, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={14} color="var(--accent-crimson)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Critical Queue:</span>
              <strong style={{ fontSize: '0.85rem', color: 'var(--accent-crimson)', fontFamily: 'var(--font-mono)' }}>{criticalCount}</strong>
            </div>
          </div>

          {/* RTK Query Simulation Mutation Button */}
          <button
            className="btn-cyber"
            onClick={handleSimulate}
            disabled={isSimulating}
            style={{ opacity: isSimulating ? 0.6 : 1 }}
          >
            <Play size={14} fill="currentColor" />
            {isSimulating ? 'Injecting Stream...' : 'Simulate AI Stream'}
          </button>

          {/* Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            <Clock size={14} />
            <span>{time}</span>
          </div>

        </div>

      </div>
    </header>
  );
};
