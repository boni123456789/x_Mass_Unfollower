import React from 'react';
import { RotateCcw } from 'lucide-react';

export default function KeyboardDock({
  activeKeys = {},
  onUnfollow,
  onKeep,
  onUndo,
  canUndo = false
}) {
  return (
    <div className="keyboard-dock-wrapper">
      <div className="keyboard-dock">
        {/* Unfollow Shortcut Key */}
        <button 
          className="dock-key-group red"
          onClick={onUnfollow}
          title="Drücke 'U' oder '←' zum Entfolgen"
        >
          <span className={`dock-badge red ${(activeKeys['arrowleft'] || activeKeys['u']) ? 'pressed' : ''}`}>
            ←
          </span>
          <span className={`dock-badge red ${(activeKeys['u']) ? 'pressed' : ''}`}>
            U
          </span>
          <span className="dock-label red">Entfolgen</span>
        </button>

        <div className="dock-divider" />

        {/* Keep Shortcut Key */}
        <button 
          className="dock-key-group green"
          onClick={onKeep}
          title="Drücke 'K' oder '→' zum Behalten"
        >
          <span className={`dock-badge green ${(activeKeys['arrowright'] || activeKeys['k']) ? 'pressed' : ''}`}>
            →
          </span>
          <span className={`dock-badge green ${(activeKeys['k']) ? 'pressed' : ''}`}>
            K
          </span>
          <span className="dock-label green">Behalten</span>
        </button>

        <div className="dock-divider" />

        {/* Previous Account Key */}
        <div className="dock-key-group">
          <span className={`dock-badge ${(activeKeys['arrowup'] || activeKeys['w']) ? 'pressed' : ''}`}>
            ↑
          </span>
          <span className="dock-label">Prev</span>
        </div>

        <div className="dock-divider" />

        {/* Toggle / Space Key */}
        <div className="dock-key-group">
          <span className={`dock-badge space ${(activeKeys[' ']) ? 'pressed' : ''}`}>
            Space
          </span>
          <span className="dock-label">Toggle</span>
        </div>

        {canUndo && (
          <>
            <div className="dock-divider" />
            <button
              className="dock-undo-btn"
              onClick={onUndo}
              title="Shortcut: Cmd+Z oder Ctrl+Z"
            >
              <RotateCcw size={14} />
              <span>Undo (Ctrl+Z)</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

