import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

const generateId = () => Math.random().toString(36).substring(2, 9);

// ─── Cached canvas for text measurement (P8) ────────────────────────
const measureCanvas = document.createElement('canvas');
const measureCtx = measureCanvas.getContext('2d');

// ─── Throttle helper ─────────────────────────────────────────────────
const createThrottle = (fn, ms) => {
  let lastCall = 0;
  let timer = null;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn(...args);
      }, ms - (now - lastCall));
    }
  };
};

// ─── Element bounding box helper ────────────────────────────────────
const getElementBounds = (el) => {
  if (!el) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  if (el.type === 'rect' || el.type === 'line' || el.type === 'circle') {
    minX = Math.min(el.x1, el.x2);
    maxX = Math.max(el.x1, el.x2);
    minY = Math.min(el.y1, el.y2);
    maxY = Math.max(el.y1, el.y2);
  } else if (el.type === 'text' || el.type === 'sticky') {
    minX = el.x1; minY = el.y1;
    const lines = (el.text || '').split('\n');
    const lineHeight = Math.max(16, el.size * 3) * 1.2;
    if (el.type === 'sticky') {
      measureCtx.font = `${Math.max(16, el.size * 3)}px sans-serif`;
      let maxW = 0;
      lines.forEach(l => { const w = measureCtx.measureText(l).width; if (w > maxW) maxW = w; });
      maxX = el.x1 + Math.max(maxW + 32, 100);
      maxY = el.y1 + Math.max(lines.length * lineHeight + 32, 100);
    } else {
      maxX = el.x1 + Math.max(...lines.map(l => l.length)) * (el.size * 1.5);
      maxY = el.y1 + lines.length * lineHeight;
    }
  } else if (el.points && el.points.length > 0) {
    el.points.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
  }
  return { minX, minY, maxX, maxY };
};

const drawElement = (ctx, el) => {
  if (!el) return;
  ctx.globalCompositeOperation = el.type === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  if (el.type === 'pencil' || el.type === 'eraser') {
    if (el.points && el.points.length > 0) {
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
    }
  } else if (el.type === 'line') {
    ctx.moveTo(el.x1, el.y1);
    ctx.lineTo(el.x2, el.y2);
    ctx.stroke();
  } else if (el.type === 'rect') {
    ctx.strokeRect(el.x1, el.y1, el.x2 - el.x1, el.y2 - el.y1);
  } else if (el.type === 'circle') {
    const rx = Math.abs(el.x2 - el.x1) / 2;
    const ry = Math.abs(el.y2 - el.y1) / 2;
    const cx = Math.min(el.x1, el.x2) + rx;
    const cy = Math.min(el.y1, el.y2) + ry;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (el.type === 'text' || el.type === 'sticky') {
    ctx.font = `${Math.max(16, el.size * 3)}px sans-serif`;
    ctx.textBaseline = "top";
    
    const lines = (el.text || '').split('\n');
    const lineHeight = Math.max(16, el.size * 3) * 1.2;
    
    if (el.type === 'sticky') {
      ctx.fillStyle = '#fef08a';
      let maxWidth = 0;
      lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxWidth) maxWidth = width;
      });
      const boxWidth = Math.max(maxWidth + 32, 100);
      const boxHeight = Math.max(lines.length * lineHeight + 32, 100);
      
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;
      
      ctx.fillRect(el.x1, el.y1, boxWidth, boxHeight);
      
      ctx.shadowColor = "transparent";
      ctx.fillStyle = el.color || '#111827';
      
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x1 + 16, el.y1 + 16 + i * lineHeight);
      });
    } else {
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x1, el.y1 + i * lineHeight);
      });
    }
  }
  ctx.closePath();
  ctx.globalCompositeOperation = 'source-over';
};

const distToSegment = (x, y, x1, y1, x2, y2) => {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

const hitTest = (el, x, y) => {
  if (!el) return false;
  const padding = Math.max(10, el.size || 5);
  
  if (el.type === 'rect') {
    const minX = Math.min(el.x1, el.x2) - padding;
    const maxX = Math.max(el.x1, el.x2) + padding;
    const minY = Math.min(el.y1, el.y2) - padding;
    const maxY = Math.max(el.y1, el.y2) + padding;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }
  if (el.type === 'circle') {
    const rx = Math.abs(el.x2 - el.x1) / 2;
    const ry = Math.abs(el.y2 - el.y1) / 2;
    const cx = Math.min(el.x1, el.x2) + rx;
    const cy = Math.min(el.y1, el.y2) + ry;
    return x >= cx - rx - padding && x <= cx + rx + padding && y >= cy - ry - padding && y <= cy + ry + padding;
  }
  if (el.type === 'line') {
    return distToSegment(x, y, el.x1, el.y1, el.x2, el.y2) <= padding;
  }
  if (el.type === 'pencil' || el.type === 'eraser') {
    if (!el.points || el.points.length === 0) return false;
    if (el.points.length === 1) {
      return distToSegment(x, y, el.points[0].x, el.points[0].y, el.points[0].x, el.points[0].y) <= padding;
    }
    for (let i = 0; i < el.points.length - 1; i++) {
      if (distToSegment(x, y, el.points[i].x, el.points[i].y, el.points[i+1].x, el.points[i+1].y) <= padding) {
        return true;
      }
    }
    return false;
  }
  if (el.type === 'text' || el.type === 'sticky') {
    const bounds = getElementBounds(el);
    if (!bounds) return false;
    return x >= bounds.minX - padding && x <= bounds.maxX + padding && y >= bounds.minY - padding && y <= bounds.maxY + padding;
  }
  return false;
};

// ─── Resize handle hit-test ─────────────────────────────────────────
const HANDLE_SIZE = 8;
const getResizeHandles = (bounds) => {
  if (!bounds) return [];
  const { minX, minY, maxX, maxY } = bounds;
  return [
    { pos: 'nw', x: minX, y: minY, cursor: 'nwse-resize' },
    { pos: 'n',  x: (minX + maxX) / 2, y: minY, cursor: 'ns-resize' },
    { pos: 'ne', x: maxX, y: minY, cursor: 'nesw-resize' },
    { pos: 'e',  x: maxX, y: (minY + maxY) / 2, cursor: 'ew-resize' },
    { pos: 'se', x: maxX, y: maxY, cursor: 'nwse-resize' },
    { pos: 's',  x: (minX + maxX) / 2, y: maxY, cursor: 'ns-resize' },
    { pos: 'sw', x: minX, y: maxY, cursor: 'nesw-resize' },
    { pos: 'w',  x: minX, y: (minY + maxY) / 2, cursor: 'ew-resize' },
  ];
};

const hitTestHandle = (handles, x, y) => {
  for (const h of handles) {
    if (Math.abs(x - h.x) <= HANDLE_SIZE && Math.abs(y - h.y) <= HANDLE_SIZE) {
      return h;
    }
  }
  return null;
};

const Canvas = forwardRef(({ color, brushSize, tool, socket, roomId, elements, setElements, textInput, setTextInput }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [currentElement, setCurrentElement] = useState(null);
  const [remotePreviews, setRemotePreviews] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null); // active resize handle
  const [resizeOrigin, setResizeOrigin] = useState(null); // original bounds before resize
  const [clipboard, setClipboard] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null); // { x1, y1, x2, y2 } drag-select rectangle

  // Throttled emitters
  const throttledCursorEmit = useRef(null);
  const throttledPreviewEmit = useRef(null);
  const throttledDragEmit = useRef(null);

  useEffect(() => {
    throttledCursorEmit.current = createThrottle((data) => {
      if (socket && roomId) socket.emit('cursor', data);
    }, 33);
    throttledPreviewEmit.current = createThrottle((data) => {
      if (socket && roomId) socket.emit('draw-preview', data);
    }, 50);
    throttledDragEmit.current = createThrottle((data) => {
      if (socket && roomId) socket.emit('element-update', data);
    }, 50);
  }, [socket, roomId]);

  useImperativeHandle(ref, () => ({
    clearCanvas: () => { setElements([]); },
    getCanvas: () => canvasRef.current,
    toDataURL: () => {
      if (canvasRef.current) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasRef.current.width;
        tempCanvas.height = canvasRef.current.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = color === '#ffffff' ? '#111827' : '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvasRef.current, 0, 0);
        return tempCanvas.toDataURL('image/png');
      }
      return null;
    }
  }));

  // Initial Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const CANVAS_SIZE = 5000;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    const ctx = canvas.getContext('2d');
    setContext(ctx);
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket || !context) return;

    const onDrawCommit = (el) => {
      setElements(prev => [...prev, el]);
      setRemotePreviews(prev => { const next = {...prev}; delete next[el.socketId]; return next; });
    };
    const onDrawPreview = (data) => {
      if (data.element) {
        setRemotePreviews(prev => ({...prev, [data.socketId]: data.element}));
      } else {
        setRemotePreviews(prev => { const next = {...prev}; delete next[data.socketId]; return next; });
      }
    };
    const onBoardUpdate = (updatedElements) => { setElements(updatedElements); };
    const onElementUpdate = (updatedElement) => {
      setElements(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
    };
    const onElementDelete = (elementId) => {
      setElements(prev => prev.filter(el => el.id !== elementId));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(elementId); return next; });
    };

    socket.on('draw-commit', onDrawCommit);
    socket.on('draw-preview', onDrawPreview);
    socket.on('board-update', onBoardUpdate);
    socket.on('element-update', onElementUpdate);
    socket.on('element-delete', onElementDelete);

    return () => {
      socket.off('draw-commit', onDrawCommit);
      socket.off('draw-preview', onDrawPreview);
      socket.off('board-update', onBoardUpdate);
      socket.off('element-update', onElementUpdate);
      socket.off('element-delete', onElementDelete);
    };
  }, [socket, context]);

  // ─── Draw selection box + handles ──────────────────────────────────
  const drawSelection = (ctx, elList) => {
    if (tool !== 'select' || selectedIds.size === 0) return;

    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    selectedIds.forEach(id => {
      const selEl = elList.find(e => e.id === id);
      if (!selEl) return;
      const bounds = getElementBounds(selEl);
      if (!bounds) return;

      const pad = 8;
      ctx.strokeRect(bounds.minX - pad, bounds.minY - pad, bounds.maxX - bounds.minX + pad * 2, bounds.maxY - bounds.minY + pad * 2);

      // Draw resize handles (only for single selection)
      if (selectedIds.size === 1) {
        ctx.setLineDash([]);
        const handles = getResizeHandles({ minX: bounds.minX - pad, minY: bounds.minY - pad, maxX: bounds.maxX + pad, maxY: bounds.maxY + pad });
        handles.forEach(h => {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.fillRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        });
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#3b82f6';
      }
    });

    ctx.setLineDash([]);
  };

  // Master render loop
  const redraw = (elList, currEl, remPreviews) => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    elList.forEach(el => drawElement(context, el));
    Object.values(remPreviews).forEach(el => drawElement(context, el));
    if (currEl) drawElement(context, currEl);
    drawSelection(context, elList);

    // Draw selection box (rubber band)
    if (selectionBox) {
      context.strokeStyle = '#3b82f6';
      context.fillStyle = 'rgba(59, 130, 246, 0.08)';
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      const x = Math.min(selectionBox.x1, selectionBox.x2);
      const y = Math.min(selectionBox.y1, selectionBox.y2);
      const w = Math.abs(selectionBox.x2 - selectionBox.x1);
      const h = Math.abs(selectionBox.y2 - selectionBox.y1);
      context.fillRect(x, y, w, h);
      context.strokeRect(x, y, w, h);
      context.setLineDash([]);
    }
  };

  useEffect(() => {
    redraw(elements, currentElement, remotePreviews);
  }, [elements, currentElement, remotePreviews, context, tool, selectedIds, selectionBox]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Delete selected elements
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedIds.size > 0 && tool === 'select') {
        e.preventDefault();
        setElements(prev => prev.filter(el => !selectedIds.has(el.id)));
        selectedIds.forEach(id => {
          if (socket && roomId) socket.emit('element-delete', { roomId, elementId: id });
        });
        setSelectedIds(new Set());
        return;
      }

      // Ctrl+A — select all
      if (ctrl && e.key === 'a' && tool === 'select') {
        e.preventDefault();
        setSelectedIds(new Set(elements.map(el => el.id)));
        return;
      }

      // Ctrl+C — copy
      if (ctrl && e.key === 'c' && selectedIds.size > 0) {
        e.preventDefault();
        const copied = elements.filter(el => selectedIds.has(el.id));
        setClipboard(copied);
        return;
      }

      // Ctrl+V — paste
      if (ctrl && e.key === 'v' && clipboard.length > 0) {
        e.preventDefault();
        const offset = 30;
        const newElements = clipboard.map(el => {
          const newEl = { ...el, id: generateId(), timestamp: Date.now() };
          if (newEl.x1 !== undefined) { newEl.x1 += offset; newEl.y1 += offset; }
          if (newEl.x2 !== undefined) { newEl.x2 += offset; newEl.y2 += offset; }
          if (newEl.points) {
            newEl.points = newEl.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
          }
          return newEl;
        });
        setElements(prev => [...prev, ...newElements]);
        newElements.forEach(el => {
          if (socket && roomId) socket.emit('draw-commit', { roomId, element: el });
        });
        setSelectedIds(new Set(newElements.map(el => el.id)));
        return;
      }

      // Ctrl+] — bring forward (layer ordering)
      if (ctrl && e.key === ']' && selectedIds.size > 0) {
        e.preventDefault();
        setElements(prev => {
          const arr = [...prev];
          for (let i = arr.length - 2; i >= 0; i--) {
            if (selectedIds.has(arr[i].id) && !selectedIds.has(arr[i + 1].id)) {
              [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
            }
          }
          return arr;
        });
        return;
      }

      // Ctrl+[ — send backward (layer ordering)
      if (ctrl && e.key === '[' && selectedIds.size > 0) {
        e.preventDefault();
        setElements(prev => {
          const arr = [...prev];
          for (let i = 1; i < arr.length; i++) {
            if (selectedIds.has(arr[i].id) && !selectedIds.has(arr[i - 1].id)) {
              [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
            }
          }
          return arr;
        });
        return;
      }

      // Arrow keys — nudge selected elements
      if (selectedIds.size > 0 && tool === 'select') {
        const nudge = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -nudge;
        if (e.key === 'ArrowRight') dx = nudge;
        if (e.key === 'ArrowUp') dy = -nudge;
        if (e.key === 'ArrowDown') dy = nudge;
        if (dx || dy) {
          e.preventDefault();
          setElements(prev => prev.map(el => {
            if (!selectedIds.has(el.id)) return el;
            const updated = { ...el };
            if (updated.x1 !== undefined) { updated.x1 += dx; updated.y1 += dy; }
            if (updated.x2 !== undefined) { updated.x2 += dx; updated.y2 += dy; }
            if (updated.points) {
              updated.points = updated.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
            }
            if (socket && roomId) socket.emit('element-update', { roomId, element: updated });
            return updated;
          }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, tool, socket, roomId, elements, clipboard]);

  const getCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      return { offsetX: e.touches[0].clientX - rect.left, offsetY: e.touches[0].clientY - rect.top };
    }
    return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
  };

  const startDrawing = (e) => {
    if (tool === 'pan') return;
    const { offsetX, offsetY } = getCoordinates(e);

    if (tool === 'text' || tool === 'sticky') {
      setTextInput({ visible: true, x: offsetX, y: offsetY, text: '', editingId: null });
      return;
    }

    if (tool === 'select') {
      // Check resize handles first (single selection)
      if (selectedIds.size === 1) {
        const selId = [...selectedIds][0];
        const selEl = elements.find(e => e.id === selId);
        if (selEl) {
          const bounds = getElementBounds(selEl);
          if (bounds) {
            const pad = 8;
            const handles = getResizeHandles({ minX: bounds.minX - pad, minY: bounds.minY - pad, maxX: bounds.maxX + pad, maxY: bounds.maxY + pad });
            const handle = hitTestHandle(handles, offsetX, offsetY);
            if (handle) {
              setResizeHandle(handle);
              setResizeOrigin({ ...selEl });
              setDragOffset({ x: offsetX, y: offsetY });
              setIsDrawing(true);
              return;
            }
          }
        }
      }

      // Check if clicking on an element
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTest(elements[i], offsetX, offsetY)) {
          const id = elements[i].id;
          if (e.shiftKey) {
            // Multi-select: toggle
            setSelectedIds(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          } else {
            if (!selectedIds.has(id)) {
              setSelectedIds(new Set([id]));
            }
          }
          setDragOffset({ x: offsetX, y: offsetY });
          setIsDrawing(true);
          return;
        }
      }

      // Start selection box (rubber band)
      if (!e.shiftKey) setSelectedIds(new Set());
      setSelectionBox({ x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY });
      setIsDrawing(true);
      return;
    }
    
    const newElement = {
      id: generateId(),
      type: tool,
      color,
      size: brushSize,
      x1: offsetX, y1: offsetY,
      x2: offsetX, y2: offsetY,
      points: [{ x: offsetX, y: offsetY }],
      timestamp: Date.now(),
      author: localStorage.getItem('whiteboard_user')
    };
    setCurrentElement(newElement);
    setIsDrawing(true);
    if (socket && roomId) socket.emit('status', { roomId, status: 'drawing' });
  };

  const handleMouseMove = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    
    if (throttledCursorEmit.current) {
      throttledCursorEmit.current({ roomId, x: offsetX, y: offsetY, username: localStorage.getItem('whiteboard_user') });
    }

    if (!isDrawing) return;

    // Selection box drag
    if (selectionBox) {
      setSelectionBox(prev => ({ ...prev, x2: offsetX, y2: offsetY }));
      return;
    }

    // Resize mode
    if (resizeHandle && selectedIds.size === 1) {
      const selId = [...selectedIds][0];
      setElements(prev => prev.map(el => {
        if (el.id !== selId) return el;
        const updated = { ...el };
        const dx = offsetX - dragOffset.x;
        const dy = offsetY - dragOffset.y;

        if (updated.type === 'rect' || updated.type === 'circle' || updated.type === 'line') {
          const pos = resizeHandle.pos;
          if (pos.includes('w')) updated.x1 = (resizeOrigin.x1 || 0) + dx;
          if (pos.includes('e')) updated.x2 = (resizeOrigin.x2 || 0) + dx;
          if (pos.includes('n')) updated.y1 = (resizeOrigin.y1 || 0) + dy;
          if (pos.includes('s')) updated.y2 = (resizeOrigin.y2 || 0) + dy;
        }
        return updated;
      }));
      return;
    }

    // Drag selected elements
    if (tool === 'select' && selectedIds.size > 0) {
      const dx = offsetX - dragOffset.x;
      const dy = offsetY - dragOffset.y;
      
      setElements(prev => prev.map(el => {
        if (!selectedIds.has(el.id)) return el;
        const updated = { ...el };
        if (updated.type === 'rect' || updated.type === 'circle' || updated.type === 'line') {
          updated.x1 += dx; updated.y1 += dy;
          updated.x2 += dx; updated.y2 += dy;
        } else if (updated.type === 'text' || updated.type === 'sticky') {
          updated.x1 += dx; updated.y1 += dy;
        } else if ((updated.type === 'pencil' || updated.type === 'eraser') && updated.points) {
          updated.points = updated.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        }
        if (throttledDragEmit.current) {
          throttledDragEmit.current({ roomId, element: updated });
        }
        return updated;
      }));
      setDragOffset({ x: offsetX, y: offsetY });
      return;
    }

    if (!currentElement) return;
    setCurrentElement(prev => {
      const next = { ...prev, x2: offsetX, y2: offsetY };
      if (tool === 'pencil' || tool === 'eraser') {
        next.points = [...prev.points, { x: offsetX, y: offsetY }];
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDrawing && currentElement && throttledPreviewEmit.current) {
      throttledPreviewEmit.current({ roomId, element: currentElement });
    }
  }, [currentElement, isDrawing, roomId]);

  const finishDrawing = () => {
    // Finish selection box
    if (selectionBox) {
      const bx1 = Math.min(selectionBox.x1, selectionBox.x2);
      const by1 = Math.min(selectionBox.y1, selectionBox.y2);
      const bx2 = Math.max(selectionBox.x1, selectionBox.x2);
      const by2 = Math.max(selectionBox.y1, selectionBox.y2);

      if (bx2 - bx1 > 5 || by2 - by1 > 5) {
        const newIds = new Set();
        elements.forEach(el => {
          const bounds = getElementBounds(el);
          if (bounds && bounds.minX >= bx1 && bounds.maxX <= bx2 && bounds.minY >= by1 && bounds.maxY <= by2) {
            newIds.add(el.id);
          }
        });
        setSelectedIds(prev => {
          const combined = new Set(prev);
          newIds.forEach(id => combined.add(id));
          return combined;
        });
      }
      setSelectionBox(null);
      setIsDrawing(false);
      return;
    }

    // Finish resize
    if (resizeHandle) {
      if (selectedIds.size === 1 && socket && roomId) {
        const selId = [...selectedIds][0];
        const el = elements.find(e => e.id === selId);
        if (el) socket.emit('element-update', { roomId, element: el });
      }
      setResizeHandle(null);
      setResizeOrigin(null);
      setIsDrawing(false);
      return;
    }

    if (tool === 'select') {
      if (isDrawing && selectedIds.size > 0 && socket && roomId) {
        selectedIds.forEach(id => {
          const el = elements.find(e => e.id === id);
          if (el) socket.emit('element-update', { roomId, element: el });
        });
      }
      setIsDrawing(false);
      return;
    }

    if (!isDrawing || !currentElement) return;
    
    setElements(prev => [...prev, currentElement]);
    if (socket && roomId) {
      socket.emit('draw-commit', { roomId, element: currentElement });
      socket.emit('draw-preview', { roomId, element: null });
    }
    setCurrentElement(null);
    setIsDrawing(false);
    if (socket && roomId) socket.emit('status', { roomId, status: 'idle' });
  };

  const handleDoubleClick = (e) => {
    if (tool === 'pan') return;
    const { offsetX, offsetY } = getCoordinates(e);

    if (tool === 'select') {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if ((el.type === 'text' || el.type === 'sticky') && hitTest(el, offsetX, offsetY)) {
          setTextInput({
            visible: true, x: el.x1, y: el.y1, text: el.text || '',
            editingId: el.id, elementType: el.type
          });
          return;
        }
      }
    }
    setTextInput({ visible: true, x: offsetX, y: offsetY, text: '', editingId: null });
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        onDoubleClick={handleDoubleClick}
        onTouchStart={startDrawing}
        onTouchMove={handleMouseMove}
        onTouchEnd={finishDrawing}
        onTouchCancel={finishDrawing}
        className={`bg-transparent pointer-events-auto absolute ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair touch-none'}`}
      />
      {textInput?.visible && (() => {
        const isSticky = tool === 'sticky' || textInput.elementType === 'sticky';
        return (
          <div className="absolute z-50 flex" style={{ left: textInput.x, top: textInput.y }}>
            {isSticky && (
              <div className="absolute inset-0 bg-[#fef08a] shadow-md pointer-events-none"
                style={{ width: '100%', height: '100%', minWidth: '100px', minHeight: '100px' }} />
            )}
            <textarea
              autoFocus
              className={`bg-transparent outline-none resize-none overflow-hidden ${isSticky ? 'p-4' : 'border-b-2 border-blue-500'} relative z-10`}
              style={{ 
                color: isSticky ? '#111827' : color,
                fontSize: `${Math.max(16, brushSize * 3)}px`,
                fontFamily: 'sans-serif',
                minWidth: '100px', minHeight: '100px',
                whiteSpace: 'pre',
                width: isSticky ? 'auto' : 'max-content'
              }}
              value={textInput.text}
              onChange={e => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                e.target.style.width = 'auto';
                e.target.style.width = e.target.scrollWidth + 'px';
                setTextInput(prev => ({...prev, text: e.target.value}));
              }}
              onBlur={() => {
                if (textInput.text.trim()) {
                  if (textInput.editingId) {
                    setElements(prev => prev.map(el => {
                      if (el.id === textInput.editingId) {
                        const updated = { ...el, text: textInput.text };
                        if (socket && roomId) socket.emit('element-update', { roomId, element: updated });
                        return updated;
                      }
                      return el;
                    }));
                  } else {
                    const el = {
                      id: generateId(),
                      type: tool === 'sticky' ? 'sticky' : 'text',
                      color: tool === 'sticky' ? '#111827' : color,
                      size: brushSize,
                      x1: textInput.x, y1: textInput.y,
                      text: textInput.text,
                      timestamp: Date.now()
                    };
                    setElements(prev => [...prev, el]);
                    if (socket && roomId) socket.emit('draw-commit', { roomId, element: el });
                  }
                } else if (textInput.editingId) {
                  setElements(prev => prev.filter(e => e.id !== textInput.editingId));
                  if (socket && roomId) socket.emit('element-delete', { roomId, elementId: textInput.editingId });
                }
                setTextInput(prev => {
                  if (prev && prev.x === textInput.x && prev.y === textInput.y) return null;
                  return prev;
                });
              }}
            />
          </div>
        );
      })()}
    </>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
