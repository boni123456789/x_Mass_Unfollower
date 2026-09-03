import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { playKeySwitch } from '../utils/soundHaptics.js';

export default function KeyboardDock({
  activeKeys = {},
  onUnfollow,
  onKeep,
  onUndo,
  canUndo = false
}) {
  const { t } = useLanguage();

  const isUnfollowActive = !!(activeKeys['arrowleft'] || activeKeys['u'] || activeKeys.unfollow);
  const isKeepActive = !!(activeKeys['arrowright'] || activeKeys['k'] || activeKeys.keep);
  const isPrevActive = !!(activeKeys['arrowup'] || activeKeys['w'] || activeKeys.prev);
  const isSpaceActive = !!(activeKeys[' '] || activeKeys.space);
  const isUndoActive = !!(activeKeys['z'] || activeKeys.undo);

  return (
    <div className="keyboard-dock-wrapper">
      <div className="keyboard-dock">
        {/* Unfollow Shortcut Key */}
        <button 
          className={`dock-key-group red ${isUnfollowActive ? 'pressed' : ''}`}
          onClick={() => {
            playKeySwitch();
            onUnfollow && onUnfollow();
          }}
          title={t('keyboardDock.unfollowTitle')}
        >
          <span className={`dock-badge red ${isUnfollowActive ? 'pressed' : ''}`}>
            ←
          </span>
          <span className={`dock-badge red ${isUnfollowActive ? 'pressed' : ''}`}>
            U
          </span>
          <span className="dock-label red">{t('keyboardDock.unfollowLabel')}</span>
        </button>

        <div className="dock-divider" />

        {/* Keep Shortcut Key */}
        <button 
          className={`dock-key-group green ${isKeepActive ? 'pressed' : ''}`}
          onClick={() => {
            playKeySwitch();
            onKeep && onKeep();
          }}
          title={t('keyboardDock.keepTitle')}
        >
          <span className={`dock-badge green ${isKeepActive ? 'pressed' : ''}`}>
            →
          </span>
          <span className={`dock-badge green ${isKeepActive ? 'pressed' : ''}`}>
            K
          </span>
          <span className="dock-label green">{t('keyboardDock.keepLabel')}</span>
        </button>

        <div className="dock-divider" />

        {/* Previous Account Key */}
        <div className="dock-key-group">
          <span className={`dock-badge ${isPrevActive ? 'pressed' : ''}`}>
            ↑
          </span>
          <span className="dock-label">{t('keyboardDock.prevLabel')}</span>
        </div>

        <div className="dock-divider" />

        {/* Toggle / Space Key */}
        <div className="dock-key-group">
          <span className={`dock-badge space ${isSpaceActive ? 'pressed' : ''}`}>
            Space
          </span>
          <span className="dock-label">{t('keyboardDock.toggleLabel')}</span>
        </div>

        {canUndo && (
          <>
            <div className="dock-divider" />
            <button
              className={`dock-undo-btn ${isUndoActive ? 'pressed' : ''}`}
              onClick={() => {
                playKeySwitch();
                onUndo && onUndo();
              }}
              title="Shortcut: Cmd+Z / Ctrl+Z"
            >
              <RotateCcw size={14} />
              <span>{t('keyboardDock.undoLabel')}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
