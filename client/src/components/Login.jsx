import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`);

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    if ((isRegistering || isResetting) && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setError('');
    
    if (isResetting) {
      try {
        const res = await fetch(`${API_URL}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, newPassword: password })
        });
        const data = await res.json();
        
        if (res.ok) {
          toast?.success('Password reset successfully! Please sign in.');
          setIsResetting(false);
          setPassword('');
        } else {
          setError(data.error || 'Password reset failed');
        }
      } catch (err) {
        setError('Network error');
      }
      return;
    }

    const endpoint = isRegistering ? '/register' : '/login';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok && data.token) {
        localStorage.setItem('whiteboard_token', data.token);
        localStorage.setItem('whiteboard_user', data.username);
        onLogin(data.username);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all border border-gray-100 dark:border-gray-700 relative">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-tr from-blue-500 to-purple-500 text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200 dark:shadow-none rotate-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isResetting ? 'Reset Password' : isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            {isResetting ? 'Enter a new password for your account.' : isRegistering ? 'Sign up to create and save boards.' : 'Sign in to continue collaborating.'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 text-sm rounded-lg">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none bg-gray-50/50 dark:bg-gray-700 dark:text-white"
              placeholder="e.g. Ayush"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isResetting ? 'New Password' : 'Password'}
            </label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none bg-gray-50/50 dark:bg-gray-700 dark:text-white pr-12"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {(isRegistering || isResetting) && <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>}
          </div>

          <button 
            type="submit"
            className="w-full bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg active:scale-[0.98] mt-2"
          >
            {isResetting ? 'Update Password' : isRegistering ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3 flex flex-col">
          {!isResetting && !isRegistering && (
            <button 
              onClick={() => { setIsResetting(true); setError(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
            >
              Forgot Password?
            </button>
          )}
          
          <button 
            onClick={() => {
              if (isResetting) {
                setIsResetting(false);
              } else {
                setIsRegistering(!isRegistering);
              }
              setError('');
            }}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            {isResetting || isRegistering ? 'Back to Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
