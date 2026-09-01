import React from 'react';

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)',
        padding: '10px 20px',
        borderRadius: '999px',
        fontSize: '0.88rem',
        fontWeight: 700,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backdropFilter: 'blur(10px)',
        animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <span>{message}</span>
    </div>
  );
}
