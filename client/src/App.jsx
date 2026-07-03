import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Board from './Board';
import Dashboard from './Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/board/:id" element={<Board />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
