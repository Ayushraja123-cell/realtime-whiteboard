import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

const generateId = () => Math.random().toString(36).substring(2, 9);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TEMPLATES = [
  {
    id: 'brainstorming',
    name: 'Brainstorming',
    description: 'A collection of colorful sticky notes to start ideating.',
    icon: <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>,
    elements: [
      { type: 'sticky', x1: 1800, y1: 1800, color: '#fef08a', size: 10, text: 'Idea 1', id: 't1', timestamp: Date.now() },
      { type: 'sticky', x1: 2100, y1: 1800, color: '#fef08a', size: 10, text: 'Idea 2', id: 't2', timestamp: Date.now() },
      { type: 'sticky', x1: 1950, y1: 2100, color: '#fef08a', size: 10, text: 'Idea 3', id: 't3', timestamp: Date.now() }
    ]
  },
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Basic boxes and lines for mapping out a process.',
    icon: <path d="M5 12h14M12 5v14"/>,
    elements: [
      { type: 'rect', x1: 1900, y1: 1800, x2: 2100, y2: 1880, color: '#3b82f6', size: 3, id: 'f1', timestamp: Date.now() },
      { type: 'text', x1: 1950, y1: 1820, text: 'Start', color: '#111827', size: 6, id: 'f2', timestamp: Date.now() },
      { type: 'line', x1: 2000, y1: 1880, x2: 2000, y2: 1980, color: '#9ca3af', size: 3, id: 'f3', timestamp: Date.now() },
      { type: 'rect', x1: 1900, y1: 1980, x2: 2100, y2: 2060, color: '#ef4444', size: 3, id: 'f4', timestamp: Date.now() },
      { type: 'text', x1: 1950, y1: 2000, text: 'Process', color: '#111827', size: 6, id: 'f5', timestamp: Date.now() }
    ]
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Three columns for To Do, In Progress, and Done.',
    icon: <path d="M4 4h4v16H4zM10 4h4v16h-4zM16 4h4v16h-4z"/>,
    elements: [
      { type: 'rect', x1: 1600, y1: 1700, x2: 1900, y2: 2400, color: '#e5e7eb', size: 3, id: 'k1', timestamp: Date.now() },
      { type: 'text', x1: 1700, y1: 1720, text: 'To Do', color: '#111827', size: 8, id: 'k2', timestamp: Date.now() },
      { type: 'rect', x1: 1950, y1: 1700, x2: 2250, y2: 2400, color: '#e5e7eb', size: 3, id: 'k3', timestamp: Date.now() },
      { type: 'text', x1: 2020, y1: 1720, text: 'Doing', color: '#111827', size: 8, id: 'k4', timestamp: Date.now() },
      { type: 'rect', x1: 2300, y1: 1700, x2: 2600, y2: 2400, color: '#e5e7eb', size: 3, id: 'k5', timestamp: Date.now() },
      { type: 'text', x1: 2400, y1: 1720, text: 'Done', color: '#111827', size: 8, id: 'k6', timestamp: Date.now() }
    ]
  }
];

const TemplatesModal = ({ onClose }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSelect = async (template) => {
    const roomId = generateId();
    const token = localStorage.getItem('whiteboard_token');
    
    try {
      // Create board with template elements by sending a "snapshot"
      await fetch(`${API_URL}/board/${roomId}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: template.name + ' Board', elements: template.elements })
      });
      navigate(`/board/${roomId}?template=${template.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create template board');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose a Template</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TEMPLATES.map(t => (
            <div 
              key={t.id}
              onClick={() => handleSelect(t)}
              className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group bg-gray-50 dark:bg-gray-900/50"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {t.icon}
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;
