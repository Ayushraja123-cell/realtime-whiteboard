import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Unique color palette for remote cursors (F14) ──────────────────
const CURSOR_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4', '#f97316'];

const hashUsername = (username) => {
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++) {
    hash = ((hash << 5) - hash) + username.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getUserColor = (username) => {
  return CURSOR_COLORS[hashUsername(username) % CURSOR_COLORS.length];
};

const Cursors = React.memo(({ socket }) => {
  // Use ref for cursor data to avoid re-renders on every cursor event (P15)
  const cursorsRef = useRef({});
  const rafRef = useRef(null);
  const containerRef = useRef(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleCursor = (data) => {
      cursorsRef.current[data.id] = {
        x: data.x,
        y: data.y,
        username: data.username,
        color: getUserColor(data.username),
        lastUpdate: Date.now()
      };

      // Batch DOM updates with requestAnimationFrame
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          forceUpdate(n => n + 1);
        });
      }
    };

    socket.on('cursor', handleCursor);

    // Cleanup stale cursors every second
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const id in cursorsRef.current) {
        if (now - cursorsRef.current[id].lastUpdate > 3000) {
          delete cursorsRef.current[id];
          changed = true;
        }
      }
      if (changed) forceUpdate(n => n + 1);
    }, 1000);

    return () => {
      socket.off('cursor', handleCursor);
      clearInterval(interval);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [socket]);

  const cursors = cursorsRef.current;

  return (
    <>
      {Object.entries(cursors).map(([id, cursor]) => (
        <div 
          key={id}
          className="absolute pointer-events-none z-50 flex items-center gap-2 transition-all duration-100 ease-out"
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
        >
          <svg className="w-6 h-6 drop-shadow-md" viewBox="0 0 24 24" fill={cursor.color}>
            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z" />
          </svg>
          <div 
            className="text-white text-xs font-medium px-2 py-1 rounded shadow-md whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.username}
          </div>
        </div>
      ))}
    </>
  );
});

Cursors.displayName = 'Cursors';

export default Cursors;
