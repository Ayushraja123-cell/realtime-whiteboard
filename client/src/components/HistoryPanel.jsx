import React, { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`);

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('whiteboard_token')}`
});

const HistoryPanel = ({ roomId, onClose, darkMode }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/board/${roomId}/versions`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.versions) setVersions(data.versions);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [roomId]);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      const res = await fetch(`${API_URL}/board/${roomId}/restore/${restoreTarget}`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (res.ok) {
        onClose();
      } else {
        console.error('Restore failed');
      }
    } catch (err) {
      console.error('Failed to restore version', err);
    }
    setRestoreTarget(null);
  };

  return (
    <>
      <div className={`absolute top-20 right-4 w-80 rounded-2xl shadow-2xl overflow-hidden z-40 transition-all ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Version History</h3>
          <button onClick={onClose} className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No saved versions found.</div>
          ) : (
            <div className="space-y-1">
              {versions.slice().reverse().map(v => (
                <div key={v._id} className={`p-3 flex justify-between items-center rounded-xl ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                  <div>
                    <div className={`font-medium text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{v.name}</div>
                    <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(v.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => setRestoreTarget(v._id)}
                    className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-all"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!restoreTarget}
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
        title="Restore Version"
        message="This will overwrite the current board for everyone. Are you sure?"
        confirmText="Restore"
        variant="default"
      />
    </>
  );
};

export default HistoryPanel;
