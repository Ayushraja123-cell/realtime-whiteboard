import React, { useState, useRef, useEffect, useCallback } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Login from './components/Login';
import Cursors from './components/Cursors';
import ConfirmDialog from './components/ConfirmDialog';
import Avatar from './components/Avatar';
import { useToast } from './components/Toast';
import { io } from 'socket.io-client';
import { jsPDF } from 'jspdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import HistoryPanel from './components/HistoryPanel';
import AiModal from './components/AiModal';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`);

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('whiteboard_token')}`
});

function Board() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('pencil');
  const [roomId, setRoomId] = useState('');
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const [elements, setElements] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [showHistory, setShowHistory] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const replayTimersRef = useRef([]);

  // Initialize room and user
  useEffect(() => {
    const storedUser = localStorage.getItem('whiteboard_user');
    if (storedUser) setUser(storedUser);

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setDarkMode(true);

    if (id) {
      setRoomId(id);
    } else {
      const newRoom = Math.random().toString(36).substring(2, 9);
      navigate(`/board/${newRoom}`, { replace: true });
    }
  }, [id, navigate]);

  // Socket connection lifecycle — only connect when authenticated
  useEffect(() => {
    if (!user || !roomId) return;

    const token = localStorage.getItem('whiteboard_token');
    if (!token) return;

    setLoading(true);
    setLoadError(null);

    const socket = io(API_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    // Fetch the current board state
    fetch(`${API_URL}/board/${roomId}`, { headers: authHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load board');
        return res.json();
      })
      .then(data => {
        if (data.elements) setElements(data.elements);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load board:", err);
        setLoadError(err.message);
        setLoading(false);
      });

    // Join the socket room
    socket.on('connect', () => {
      socket.emit('join-room', roomId);
    });

    // Socket event handlers
    const handleClearReceive = () => {
      setElements([]);
      setRedoStack([]);
    };
    const handleUndoSuccess = (removedElement) => {
      setRedoStack(prev => [...prev, removedElement]);
    };

    const handleBoardUpdate = (newElements) => {
      setElements(newElements);
      setRedoStack([]);
      toast.info('Board state was restored');
    };

    socket.on('clear', handleClearReceive);
    socket.on('users-update', setOnlineUsers);
    socket.on('undo-success', handleUndoSuccess);
    socket.on('board-update', handleBoardUpdate);

    return () => {
      socket.off('clear', handleClearReceive);
      socket.off('users-update', setOnlineUsers);
      socket.off('undo-success', handleUndoSuccess);
      socket.off('board-update', handleBoardUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, roomId]);

  // Auto-save indicator
  useEffect(() => {
    if (elements.length === 0) {
      setSaveStatus('saved');
      return;
    }
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      setSaveStatus('saving');
      setTimeout(() => setSaveStatus('saved'), 800);
    }, 2500);
    return () => clearTimeout(timer);
  }, [elements]);

  const handleClear = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const confirmClear = useCallback(() => {
    setElements(prev => prev.filter(el => el.author !== user));
    setRedoStack([]);
    socketRef.current?.emit('clear-user', { roomId, username: user });
    setShowClearConfirm(false);
    toast.info('Your drawings were cleared');
  }, [roomId, user, toast]);

  const handleUndo = useCallback(() => {
    socketRef.current?.emit('undo', roomId);
  }, [roomId]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const el = redoStack[redoStack.length - 1];
      setRedoStack(prev => prev.slice(0, -1));
      setElements(prev => [...prev, el]);
      socketRef.current?.emit('draw-commit', { roomId, element: el });
    }
  }, [redoStack, roomId]);

  const handleExport = useCallback((format) => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    if (!dataUrl) return;

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `whiteboard-${roomId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG exported');
    } else if (format === 'pdf') {
      const pdf = new jsPDF({ orientation: 'landscape' });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`whiteboard-${roomId}.pdf`);
      toast.success('PDF exported');
    } else if (format === 'svg') {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      elements.forEach(el => {
         if (el.type === 'pencil' || el.type === 'eraser') {
            el.points?.forEach(p => {
               minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
               minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            });
         } else if (el.x1 !== undefined) {
            minX = Math.min(minX, el.x1, el.x2 || el.x1);
            maxX = Math.max(maxX, el.x1, el.x2 || el.x1);
            minY = Math.min(minY, el.y1, el.y2 || el.y1);
            maxY = Math.max(maxY, el.y1, el.y2 || el.y1);
         }
      });
      
      if (minX === Infinity) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
      else { minX -= 50; minY -= 50; maxX += 50; maxY += 50; }
      
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}" style="background-color: ${darkMode ? '#111827' : '#ffffff'}">`;
      
      elements.forEach(el => {
        const strokeColor = el.type === 'eraser' ? (darkMode ? '#111827' : '#ffffff') : el.color;
        if (el.type === 'pencil' || el.type === 'eraser') {
          if (!el.points || el.points.length === 0) return;
          const pointsStr = el.points.map(p => `${p.x},${p.y}`).join(' ');
          svgContent += `<polyline points="${pointsStr}" fill="none" stroke="${strokeColor}" stroke-width="${el.size}" stroke-linecap="round" stroke-linejoin="round" />`;
        } else if (el.type === 'line') {
          svgContent += `<line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${strokeColor}" stroke-width="${el.size}" stroke-linecap="round" />`;
        } else if (el.type === 'rect') {
          const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2), w = Math.abs(el.x2 - el.x1), h = Math.abs(el.y2 - el.y1);
          svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${strokeColor}" stroke-width="${el.size}" />`;
        } else if (el.type === 'circle') {
          const rx = Math.abs(el.x2 - el.x1) / 2, ry = Math.abs(el.y2 - el.y1) / 2;
          const cx = Math.min(el.x1, el.x2) + rx, cy = Math.min(el.y1, el.y2) + ry;
          svgContent += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${strokeColor}" stroke-width="${el.size}" />`;
        } else if (el.type === 'text') {
          const lines = (el.text || '').split('\\n');
          const fontSize = Math.max(16, el.size * 3);
          const lineHeight = fontSize * 1.2;
          lines.forEach((line, i) => {
             svgContent += `<text x="${el.x1}" y="${el.y1 + i * lineHeight}" fill="${strokeColor}" font-family="sans-serif" font-size="${fontSize}px" dominant-baseline="text-before-edge">${line}</text>`;
          });
        } else if (el.type === 'sticky') {
          const lines = (el.text || '').split('\\n');
          const fontSize = Math.max(16, el.size * 3);
          const lineHeight = fontSize * 1.2;
          const charWidth = fontSize * 0.6;
          let maxChars = 0;
          lines.forEach(l => { if (l.length > maxChars) maxChars = l.length; });
          const boxWidth = Math.max(maxChars * charWidth + 32, 100);
          const boxHeight = Math.max(lines.length * lineHeight + 32, 100);
          svgContent += `<rect x="${el.x1}" y="${el.y1}" width="${boxWidth}" height="${boxHeight}" fill="#fef08a" filter="drop-shadow(2px 4px 10px rgba(0,0,0,0.1))" />`;
          lines.forEach((line, i) => {
             svgContent += `<text x="${el.x1 + 16}" y="${el.y1 + 16 + i * lineHeight}" fill="${el.color || '#111827'}" font-family="sans-serif" font-size="${fontSize}px" dominant-baseline="text-before-edge">${line}</text>`;
          });
        }
      });
      svgContent += `</svg>`;
      
      const blob = new Blob([svgContent], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `whiteboard-${roomId}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('SVG exported');
    }
  }, [roomId, toast, elements, darkMode]);

  const handleReplay = useCallback(() => {
    if (elements.length === 0) return;

    replayTimersRef.current.forEach(id => clearTimeout(id));
    replayTimersRef.current = [];

    const sortedElements = [...elements].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    setElements([]);
    
    const startTime = sortedElements[0].timestamp || Date.now();
    
    sortedElements.forEach((el, index) => {
      const delay = el.timestamp ? Math.min(el.timestamp - startTime, index * 500) : index * 500;
      
      const timerId = setTimeout(() => {
        setElements(prev => {
          if (prev.find(p => p.id === el.id)) return prev;
          return [...prev, el];
        });
      }, delay);
      replayTimersRef.current.push(timerId);
    });
    toast.info('Replaying drawing...');
  }, [elements, toast]);

  const handleSaveVersion = useCallback(async () => {
    const name = `Snapshot - ${new Date().toLocaleTimeString()}`;
    try {
      const res = await fetch(`${API_URL}/board/${roomId}/version`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, elements })
      });
      if (!res.ok) throw new Error('Failed');
      
      if (canvasRef.current && canvasRef.current.getCanvas) {
        const rawCanvas = canvasRef.current.getCanvas();
        if (rawCanvas) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 400;
          tempCanvas.height = 300;
          const ctx = tempCanvas.getContext('2d');
          ctx.fillStyle = darkMode ? '#111827' : '#ffffff';
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          const scale = Math.min(400 / rawCanvas.width, 300 / rawCanvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(rawCanvas, 0, 0);
          
          const thumbnail = tempCanvas.toDataURL('image/jpeg', 0.5);
          fetch(`${API_URL}/board/${roomId}/thumbnail`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ thumbnail, owner: user })
          });
        }
      }

      toast.success('Snapshot saved!');
    } catch (err) {
      toast.error('Failed to save snapshot');
    }
  }, [roomId, darkMode, user, toast, elements]);

  const handleAiGenerate = useCallback((newElements) => {
    // Normalize coordinates so the flowchart always appears in the visible area (1800, 1800)
    let minX = Infinity, minY = Infinity;
    newElements.forEach(el => {
      if (el.x1 !== undefined) minX = Math.min(minX, el.x1);
      if (el.x2 !== undefined) minX = Math.min(minX, el.x2);
      if (el.y1 !== undefined) minY = Math.min(minY, el.y1);
      if (el.y2 !== undefined) minY = Math.min(minY, el.y2);
    });
    
    let normalizedElements = newElements;
    if (minX !== Infinity && minY !== Infinity) {
      const offsetX = 1800 - minX;
      const offsetY = 1800 - minY;
      normalizedElements = newElements.map(el => {
        const updated = { ...el, id: Math.random().toString(36).substring(2, 9), timestamp: Date.now(), author: user };
        // Enforce proper sizes so we don't get huge borders
        if (updated.type === 'rect' || updated.type === 'line' || updated.type === 'circle') {
          updated.size = 3;
        } else if (updated.type === 'text') {
          updated.size = 6;
          // Fix any literal \n characters the AI might output
          if (updated.text) {
            updated.text = updated.text.replace(/\\n/g, '\n');
          }
        }

        if (updated.x1 !== undefined) updated.x1 += offsetX;
        if (updated.x2 !== undefined) updated.x2 += offsetX;
        if (updated.y1 !== undefined) updated.y1 += offsetY;
        if (updated.y2 !== undefined) updated.y2 += offsetY;
        if (updated.points) updated.points = updated.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
        return updated;
      });
    }

    setElements(prev => [...prev, ...normalizedElements]);
    
    normalizedElements.forEach(el => {
      socketRef.current?.emit('draw-commit', { roomId, element: el });
    });
    toast.success(`Generated ${normalizedElements.length} elements`);
  }, [roomId, toast]);

  const handleLogout = () => {
    localStorage.removeItem('whiteboard_token');
    localStorage.removeItem('whiteboard_user');
    setUser(null);
  };

  const handleToggleHistory = useCallback(() => setShowHistory(prev => !prev), []);
  const handleToggleAi = useCallback(() => setShowAi(true), []);

  if (!user) return <Login onLogin={setUser} />;
  if (!roomId) return null;

  const socket = socketRef.current;

  return (
    <div className={`relative w-screen h-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-[#f8f9fa]'}`}>
      
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading board...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {loadError && !loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{loadError}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-500 text-white text-sm rounded-xl font-medium">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Clear Board Confirm Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onConfirm={confirmClear}
        onCancel={() => setShowClearConfirm(false)}
        title="Clear Your Drawings"
        message="This will erase only the strokes and shapes you have drawn. Other users' drawings will remain."
        confirmText="Clear My Drawings"
        variant="danger"
      />

      {/* Top Left Header */}
      <div className={`absolute top-4 left-4 ${darkMode ? 'bg-gray-800/90 border-gray-700 text-gray-300' : 'bg-white/90 border-gray-100 text-gray-500'} backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border font-medium z-20 flex items-center gap-4 transition-colors`}>
        <div className="flex items-center gap-2">
          <div>
            Room: <span className={`${darkMode ? 'text-white' : 'text-gray-900'} font-bold ml-1`}>{roomId}</span>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Invite link copied!');
            }}
            className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-800'} transition-all active:scale-95`}
            title="Copy Invite Link"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <div className={`w-px h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className="flex items-center gap-2">
           <Avatar username={user} size="sm" />
           <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>{user}</span>
        </div>
        {/* Auto-save indicator */}
        <div className={`text-xs flex items-center gap-1.5 ${
          saveStatus === 'saved' ? (darkMode ? 'text-green-400' : 'text-green-600') :
          saveStatus === 'saving' ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
          (darkMode ? 'text-gray-500' : 'text-gray-400')
        }`}>
          {saveStatus === 'saved' && (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              Saved
            </>
          )}
          {saveStatus === 'saving' && (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          )}
          {saveStatus === 'unsaved' && '•'}
        </div>
        <button onClick={handleLogout} className={`ml-2 text-sm ${darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'} transition-colors`}>
          Logout
        </button>
      </div>
      
      {/* Users List */}
      <div className={`absolute top-20 left-4 ${darkMode ? 'bg-gray-800/90 border-gray-700 text-gray-300' : 'bg-white/90 border-gray-100 text-gray-800'} backdrop-blur-md p-4 rounded-2xl shadow-xl border font-medium z-20 w-48 transition-colors`}>
        <h3 className={`text-xs uppercase tracking-wider font-bold mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Users Online ({onlineUsers.length})</h3>
        <ul className="space-y-3">
          {onlineUsers.map((u, i) => (
            <li key={i} className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              <div className="relative">
                <Avatar username={u.username} size="sm" />
                <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800 ${u.status === 'drawing' ? 'bg-green-500' : 'bg-yellow-400'}`}></div>
              </div>
              <span className="truncate flex-1">{u.username}</span>
            </li>
          ))}
        </ul>
      </div>

      <Cursors socket={socket} />

      <Toolbar 
        color={color} setColor={setColor} 
        brushSize={brushSize} setBrushSize={setBrushSize} 
        tool={tool} setTool={setTool}
        onClear={handleClear}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        onReplay={handleReplay}
        onSaveVersion={handleSaveVersion}
        onToggleHistory={handleToggleHistory}
        onToggleAi={handleToggleAi}
        darkMode={darkMode} setDarkMode={setDarkMode}
      />

      {showHistory && <HistoryPanel roomId={roomId} onClose={() => setShowHistory(false)} darkMode={darkMode} />}
      {showAi && <AiModal onClose={() => setShowAi(false)} onGenerate={handleAiGenerate} darkMode={darkMode} />}

      <TransformWrapper
        disabled={tool !== 'pan'}
        panning={{ disabled: tool !== 'pan' }}
        wheel={{ step: 0.1 }}
        doubleClick={{ disabled: true }}
        minScale={0.1}
        maxScale={5}
        initialPositionX={-1500}
        initialPositionY={-1500}
      >
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh", position: "absolute", top: 0, left: 0 }}>
          <div className="w-[5000px] h-[5000px] relative bg-white dark:bg-gray-900 overflow-hidden" 
               style={{ 
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='${darkMode ? '%23374151' : '%23e5e7eb'}' stroke-width='1'/%3E%3C/svg%3E")`,
                 backgroundPosition: '-1px -1px'
               }}>
            
            <Canvas 
              ref={canvasRef}
              color={darkMode && color === '#000000' ? '#ffffff' : color} 
              brushSize={brushSize} 
              tool={tool}
              socket={socket}
              roomId={roomId}
              elements={elements}
              setElements={setElements}
              textInput={textInput}
              setTextInput={setTextInput}
            />
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

export default Board;
