import React, { useState } from 'react';
import { getInitials } from '../../utils/chatLogic';

const AVATAR_TONES = [
  'bg-primary text-on-primary',
  'bg-secondary-container text-on-secondary-container',
  'bg-primary-container text-on-primary',
  'bg-surface-container-highest text-on-surface',
];

function toneForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_TONES.length;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export const UserAvatar: React.FC<{
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showPresence?: boolean;
}> = ({ name, src, size = 'md', isOnline = false, showPresence = false }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const dims: Record<string, string> = {
    xs: 'w-7 h-7 text-[11px]',
    sm: 'w-9 h-9 text-[13px]',
    md: 'w-12 h-12 text-[15px]',
    lg: 'w-16 h-16 text-[20px]',
    xl: 'w-20 h-20 text-[24px]',
  };

  return (
    <div className={`relative shrink-0 inline-flex items-center justify-center ${dims[size]}`}>
      <div
        className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center font-semibold shadow-sm ${
          src && !imgFailed ? 'bg-surface-container' : toneForName(name)
        }`}
      >
        {src && !imgFailed ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {showPresence && isOnline && (
        <span
          aria-label="Online"
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-online ring-2 ring-surface"
        />
      )}
    </div>
  );
};

export const AIBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <span
    className={`inline-flex items-center gap-0.5 rounded-full bg-primary text-on-primary font-semibold tracking-wide shadow-sm ${
      compact ? 'px-1.5 py-[1px] text-[9px]' : 'px-2 py-0.5 text-[10px]'
    }`}
  >
    <span className="material-symbols-outlined material-symbols-filled text-[10px]">
      auto_awesome
    </span>
    <span>AI</span>
  </span>
);

export const AssistantAvatar: React.FC<{
  name: string;
  iconName?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}> = ({ name, iconName = 'auto_awesome', src, size = 'md', showBadge = true }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const outer = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  const iconSize = size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[20px]' : 'text-[18px]';

  return (
    <div className="relative shrink-0 inline-flex">
      <div
        aria-label={name}
        className={`${outer} rounded-full p-[2px] bg-gradient-to-tr from-primary to-secondary-fixed shadow-sm`}
      >
        <div className="w-full h-full rounded-full bg-surface p-[2px]">
          <div className="w-full h-full rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
            {src && !imgFailed ? (
              <img src={src} alt={name} className="w-full h-full rounded-full object-cover" onError={() => setImgFailed(true)} />
            ) : (
              <span className={`material-symbols-outlined ${iconSize}`}>{iconName}</span>
            )}
          </div>
        </div>
      </div>
      {showBadge && (
        <span className="absolute -bottom-1 -right-0.5">
          <AIBadge compact />
        </span>
      )}
    </div>
  );
};
