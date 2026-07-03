import React from 'react';

const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#ffffff'];

const Toolbar = React.memo(({
  color, setColor,
  brushSize, setBrushSize,
  tool, setTool,
  onClear,
  onUndo,
  onRedo,
  onExport,
  onReplay,
  onSaveVersion,
  onToggleHistory,
  onToggleAi,
  darkMode, setDarkMode,
  zoomLevel,
  onResetZoom,
  onToast
}) => {
  return (
    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] ${darkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-100'} backdrop-blur-md shadow-xl rounded-2xl p-3 flex items-center gap-3 transition-all z-20 border overflow-x-auto lg:overflow-x-visible flex-nowrap lg:flex-wrap`}>

      {/* Home */}
      <div className={`flex items-center border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} pr-3 shrink-0`}>
        <a href="/" className={`p-2 rounded-xl transition-all active:scale-95 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-100 text-gray-600'}`} title="Dashboard" aria-label="Dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </a>
      </div>

      {/* Colors */}
      <div className={`flex gap-1.5 items-center border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} pr-3 shrink-0`}>
        {colors.map(c => (
          <button
            key={c}
            onClick={() => { setColor(c); if(tool==='eraser') setTool('pencil'); }}
            className={`w-7 h-7 rounded-full shadow-sm transition-transform hover:scale-110 active:scale-95 ${color === c && tool !== 'eraser' ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      {/* Tools */}
      <div className={`flex gap-1.5 items-center border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} pr-3 shrink-0`}>
        {[
          { id: 'select', icon: <><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></> },
          { id: 'pan', icon: <path d="M18 11V6a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v2m-4-2V4a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v6m-4-1.5v-1a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v9.38a8 8 0 0 0 2.22 5.5l2.4 2.44A2.32 2.32 0 0 0 11.23 24h4.63c1.78 0 3.32-1.28 3.65-3.03l1.35-7.14a2 2 0 0 0-1.95-2.37H18Z"/> },
          { id: 'pencil', icon: <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/> },
          { id: 'line', icon: <path d="M5 19L19 5"/> },
          { id: 'rect', icon: <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/> },
          { id: 'circle', icon: <circle cx="12" cy="12" r="10"/> },
          { id: 'sticky', icon: <path d="M3 3v18h18V3H3zm12 14H9v-2h6v2zm0-4H9v-2h6v2zm0-4H9V7h6v2z"/> },
          { id: 'text', icon: <path d="M4 7V4h16v3M9 20h6M12 4v16"/> },
          { id: 'eraser', icon: <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21 M22 21H7 m-2-10l9 9"/> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`p-2 rounded-xl transition-all active:scale-95 ${tool === t.id ? 'bg-blue-100 text-blue-600' : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-100 text-gray-600'}`}
            title={t.id.charAt(0).toUpperCase() + t.id.slice(1)}
            aria-label={t.id.charAt(0).toUpperCase() + t.id.slice(1)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {t.icon}
            </svg>
          </button>
        ))}
      </div>

      {/* Undo/Redo */}
      <div className={`flex gap-1.5 items-center border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} pr-3 shrink-0`}>
        <button onClick={onUndo} className={`p-2 rounded-xl transition-all active:scale-95 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-100 text-gray-600'}`} title="Undo" aria-label="Undo">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>
        <button onClick={onRedo} className={`p-2 rounded-xl transition-all active:scale-95 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-100 text-gray-600'}`} title="Redo" aria-label="Redo">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
        </button>
      </div>

      {/* Brush Size */}
      <div className={`flex items-center gap-2 border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} pr-3 shrink-0`}>
        <input
          type="range" min="1" max="50" value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-20 accent-blue-500 cursor-pointer" title="Brush Size"
          aria-label="Brush Size"
        />
      </div>

      {/* Zoom Level */}
      {zoomLevel !== undefined && (
        <div className={`flex items-center gap-1.5 border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} pr-3 shrink-0`}>
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {Math.round(zoomLevel * 100)}%
          </span>
          {onResetZoom && (
            <button
              onClick={onResetZoom}
              className={`p-1.5 rounded-lg transition-all active:scale-95 text-xs font-medium ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          )}
        </div>
      )}

      {/* Share & Export */}
      <div className={`flex items-center gap-1.5 border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} pr-3 shrink-0`}>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            if (onToast) {
              onToast('Link copied to clipboard!');
            }
          }}
          className={`p-2 rounded-xl transition-all font-medium flex items-center gap-1 active:scale-95 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'hover:bg-blue-50 text-blue-500'}`}
          title="Share Board"
          aria-label="Share Board"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button
          onClick={() => onExport('png')}
          className={`p-2 rounded-xl transition-all font-medium flex items-center gap-1 active:scale-95 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-100 text-gray-600'}`}
          title="Export PNG"
          aria-label="Export PNG"
        >
          PNG
        </button>
        <button
          onClick={() => onExport('pdf')}
          className={`p-2 rounded-xl transition-all font-medium flex items-center gap-1 active:scale-95 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-100 text-gray-600'}`}
          title="Export PDF"
          aria-label="Export PDF"
        >
          PDF
        </button>
        <button
          onClick={() => onExport('svg')}
          className={`p-2 rounded-xl transition-all font-medium flex items-center gap-1 active:scale-95 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-100 text-gray-600'}`}
          title="Export SVG"
          aria-label="Export SVG"
        >
          SVG
        </button>
        <button
          onClick={onReplay}
          className={`p-2 rounded-xl transition-all font-medium flex items-center gap-1 active:scale-95 ${darkMode ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-green-50'}`}
          title="Replay Drawing"
          aria-label="Replay Drawing"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
      </div>

      {/* History & Versions */}
      <div className={`flex items-center gap-1.5 border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} pr-3 shrink-0`}>
        <button
          onClick={onSaveVersion}
          className={`p-2 rounded-xl transition-all font-medium flex items-center gap-1 active:scale-95 ${darkMode ? 'text-purple-400 hover:bg-gray-700' : 'text-purple-600 hover:bg-purple-50'}`}
          title="Save Snapshot"
          aria-label="Save Snapshot"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        </button>
        <button
          onClick={onToggleHistory}
          className={`p-2 rounded-xl transition-all font-medium flex items-center gap-1 active:scale-95 ${darkMode ? 'text-purple-400 hover:bg-gray-700' : 'text-purple-600 hover:bg-purple-50'}`}
          title="View History"
          aria-label="View History"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/></svg>
        </button>
        <button
          onClick={onToggleAi}
          className={`p-2 rounded-xl transition-all font-medium flex items-center gap-1 active:scale-95 ${darkMode ? 'text-pink-400 hover:bg-gray-700' : 'text-pink-500 hover:bg-pink-50'}`}
          title="Generate AI Flowchart"
          aria-label="Generate AI Flowchart"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </button>
      </div>

      {/* Clear & Dark Mode */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => {
          const newTheme = !darkMode;
          setDarkMode(newTheme);
          localStorage.setItem('theme', newTheme ? 'dark' : 'light');
        }} className={`p-2 rounded-xl transition-all active:scale-95 ${darkMode ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`} title="Toggle Dark Mode" aria-label="Toggle Dark Mode">
          {darkMode ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>}
        </button>
        <button onClick={onClear} className={`p-2 rounded-xl transition-all font-medium active:scale-95 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'hover:bg-red-50 text-red-500'}`} title="Clear Board" aria-label="Clear Board">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>

    </div>
  );
});

Toolbar.displayName = 'Toolbar';

export default Toolbar;
