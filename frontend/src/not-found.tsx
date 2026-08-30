import React from 'react';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

interface NotFoundProps {
  onBackToHome?: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onBackToHome }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '450px',
        height: '100%',
        padding: '40px 20px',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {/* 404 Visual Icon Badge */}
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          marginBottom: '24px',
          animation: 'bounce-light 2.5s infinite',
        }}
      >
        <AlertCircle size={36} />
      </div>

      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          color: 'var(--text-main)',
          margin: '0 0 8px 0',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.02em',
        }}
      >
        404
      </h1>

      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--text-sub)',
          margin: '0 0 12px 0',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Telemetry Lost / Node Not Found
      </h2>

      <p
        style={{
          maxWidth: '460px',
          fontSize: '0.88rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          margin: '0 0 28px 0',
          fontFamily: 'var(--font-sans)',
        }}
      >
        The requested subsystem page, coordinate vector, or sector mapping is outside the operational swarm boundary. Please check your system logs or return to the tactical dashboard.
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.15)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#1d4ed8';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(37, 99, 235, 0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#2563eb';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.15)';
            }}
          >
            <Home size={16} />
            <span>Return to Dashboard</span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes bounce-light {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
