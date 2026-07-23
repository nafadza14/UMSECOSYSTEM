import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { ThemeProvider } from './lib/theme'
import { PricesProvider } from './lib/prices'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

// Set tema awal sebelum render (hindari flash)
try {
  const saved = localStorage.getItem('theme')
  document.documentElement.dataset.theme =
    saved === 'light' || saved === 'dark' ? saved : 'light'
} catch {
  document.documentElement.dataset.theme = 'light'
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <PricesProvider>
       <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
       </AuthProvider>
      </PricesProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
