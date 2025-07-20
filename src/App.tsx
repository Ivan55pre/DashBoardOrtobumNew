// import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { TelegramProvider } from './contexts/TelegramContext'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Login from './pages/Login'
import TelegramTurnoverReport from './pages/TelegramTurnoverReport'
import TelegramDashboard from './pages/TelegramDashboard'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import ProtectedLayout from './components/Layout/ProtectedLayout'

function App() {
  return (
    <ThemeProvider>
      <TelegramProvider>
        <AuthProvider>
          <DndProvider backend={HTML5Backend}>
            <Router>
              <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-200">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/telegram-turnover" element={
                    <ProtectedRoute>
                      <TelegramTurnoverReport />
                    </ProtectedRoute>
                  } />
                  <Route path="/telegram-dashboard" element={
                    <ProtectedRoute>
                      <TelegramDashboard />
                    </ProtectedRoute>
                  } />
                  {/* Группа маршрутов, которые используют основной Layout и защищены */}
                  <Route element={<ProtectedLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Routes>
              </div>
            </Router>
          </DndProvider>
        </AuthProvider>
      </TelegramProvider>
    </ThemeProvider>
  )
}

export default App
