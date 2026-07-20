import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { ThemeProvider } from './lib/theme'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

// Set tema awal sebelum render (hindari flash)
try {
  const saved = localStorage.getItem('theme')
  document.documentElement.dataset.theme =
    saved === 'light' || saved === 'dark' ? saved : 'dark'
} catch {
  document.documentElement.dataset.theme = 'dark'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
