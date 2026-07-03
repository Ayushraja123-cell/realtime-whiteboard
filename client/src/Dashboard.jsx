import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './components/Login';
import ConfirmDialog from './components/ConfirmDialog';
import Avatar from './components/Avatar';
import TemplatesModal from './components/TemplatesModal';
import { useToast } from './components/Toast';

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`);

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('whiteboard_token')}`
});

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(localStorage.getItem('whiteboard_user'));
  const toast = useToast();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/user/${user}/boards`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        setBoards(data.boards || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('whiteboard_token');
    localStorage.removeItem('whiteboard_user');
    setUser(null);
    toast.info('Logged out');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_URL}/board/${deleteTarget}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        setBoards(prev => prev.filter(b => b.roomId !== deleteTarget));
        toast.success('Board deleted');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete board');
    }
    setDeleteTarget(null);
  };

  const handleRename = async (roomId) => {
    if (!editValue.trim()) {
      setEditingName(null);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/board/${roomId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ name: editValue.trim() })
      });
      if (res.ok) {
        setBoards(prev => prev.map(b => b.roomId === roomId ? { ...b, name: editValue.trim() } : b));
        toast.success('Board renamed');
      } else {
        toast.error('Failed to rename');
      }
    } catch {
      toast.error('Failed to rename board');
    }
    setEditingName(null);
  };

  const handleNewBoard = async () => {
    const roomId = Math.random().toString(36).substring(2, 9);
    const token = localStorage.getItem('whiteboard_token');
    
    try {
      await fetch(`${API_URL}/board/${roomId}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Untitled Board', elements: [] })
      });
      navigate(`/board/${roomId}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create new board');
    }
  };

  const filteredBoards = boards.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (b.roomId || '').toLowerCase().includes(q) || (b.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Boards</h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 mr-4">
                <Avatar username={user} size="md" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user}</span>
                  <button 
                    onClick={handleLogout}
                    className="text-xs text-left text-gray-500 hover:text-red-500 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
            <button 
              onClick={() => setShowTemplates(true)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-800/40 px-6 py-2 rounded-xl font-medium shadow-sm transition-all active:scale-[0.97]"
            >
              Templates
            </button>
            <button 
              onClick={handleNewBoard}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium shadow-sm transition-all active:scale-[0.97]"
            >
              + New Board
            </button>
          </div>
        </div>

        {/* Search */}
        {user && !loading && boards.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {!user && (
          <div className="flex justify-center py-10">
            <Login onLogin={(username) => setUser(username)} />
          </div>
        )}

        {user && loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {user && !loading && boards.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No boards</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new whiteboard.</p>
          </div>
        )}

        {user && !loading && boards.length > 0 && filteredBoards.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
            No boards matching "{searchQuery}"
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBoards.map(board => (
            <div 
              key={board.roomId}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex flex-col h-48"
            >
              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(board.roomId); }}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                title="Delete board"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>

              <div 
                onClick={() => navigate(`/board/${board.roomId}`)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 relative overflow-hidden flex items-center justify-center cursor-pointer"
              >
                {board.thumbnail ? (
                  <img src={board.thumbnail} alt="Board Thumbnail" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="text-gray-400 font-medium">No Thumbnail</div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                {editingName === board.roomId ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => handleRename(board.roomId)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(board.roomId); if (e.key === 'Escape') setEditingName(null); }}
                    className="font-medium text-sm bg-transparent border-b border-blue-500 outline-none flex-1 mr-2 dark:text-white"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div 
                    className="font-medium truncate cursor-text hover:text-blue-500 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setEditingName(board.roomId); setEditValue(board.name || board.roomId); }}
                    title="Click to rename"
                  >
                    {board.name || board.roomId}
                  </div>
                )}
                <div 
                  onClick={() => navigate(`/board/${board.roomId}`)}
                  className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Board"
        message="Are you sure you want to delete this board? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
    </div>
  );
};

export default Dashboard;
