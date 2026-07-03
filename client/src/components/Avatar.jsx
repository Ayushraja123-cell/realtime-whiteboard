import React, { useMemo } from 'react';

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#a855f7', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#f97316'  // orange
];

const getHashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const Avatar = ({ username, size = 'md', className = '' }) => {
  const color = useMemo(() => {
    if (!username) return '#6b7280';
    const hash = Math.abs(getHashCode(username));
    return COLORS[hash % COLORS.length];
  }, [username]);

  const initial = (username || '?').charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <div 
      className={`rounded-full flex items-center justify-center text-white font-semibold shadow-sm shrink-0 select-none ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color }}
      title={username}
    >
      {initial}
    </div>
  );
};

export default Avatar;
