import React from 'react';
import { Activity } from 'lucide-react';

interface LoadingProps {
  message?: string;
  fullscreen?: boolean;
  inline?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading disaster data...',
  fullscreen = false,
  inline = false,
}) => {
  const containerStyle: React.CSSProperties = fullscreen
    ? {
        position: 'fixed',
        inset: 0,
        background: 'rgba(244, 246, 249, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }
    : inline
    ? {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        color: '#2563eb',
      }
    : {
        width: '100%',
        height: '100%',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      };

  return (
    <div style={containerStyle}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Outer Ring */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid #eff6ff',
            borderTop: '3px solid #2563eb',
            animation: 'gz-spin 1.2s linear infinite',
          }}
        />
        {/* Pulsing inner icon */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'gz-pulse 2s infinite ease-in-out',
          }}
        >
          <Activity size={18} color="#2563eb" />
        </div>
      </div>
      
      {!inline && (
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              margin: '8px 0 2px 0',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {message}
          </p>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Synchronizing telemetry
          </span>
        </div>
      )}

      <style>{`
        @keyframes gz-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes gz-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Loading;
