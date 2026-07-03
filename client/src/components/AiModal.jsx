import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AiModal = ({ onClose, onGenerate, darkMode }) => {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return setError('API Key is required');
    if (!prompt.trim()) return setError('Prompt is required');

    localStorage.setItem('gemini_api_key', apiKey);
    setLoading(true);
    setError('');

    try {
      // Route through backend proxy to keep API key off browser network logs
      const response = await fetch(`${API_URL}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('whiteboard_token')}`
        },
        body: JSON.stringify({ apiKey, prompt })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate flowchart');
      }

      if (data.elements && data.elements.length > 0) {
        onGenerate(data.elements);
        onClose();
      } else {
        throw new Error('AI returned no elements. Please try a different topic.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate flowchart. Check API Key or try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-white/20'}`}>
        <div className="text-center mb-6">
          <div className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200 rotate-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          </div>
          <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            AI Flowchart Generator
          </h2>
          <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Describe a process and Gemini AI will magically draw a flowchart on your board.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-500 text-sm rounded-lg">{error}</div>}
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Gemini API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              placeholder="AIzaSy..."
            />
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-purple-500 hover:text-purple-600 mt-1 inline-block">Get a free API key here</a>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Flowchart Topic</label>
            <textarea 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none resize-none h-24 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              placeholder="e.g. Binary Search Algorithm, User Login Flow, etc."
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className={`flex-1 font-medium py-3 rounded-xl transition-all ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Generating...
                </>
              ) : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AiModal;
