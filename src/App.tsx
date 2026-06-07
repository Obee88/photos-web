import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Duplicates from './pages/Duplicates'
import Bursts from './pages/Bursts'
import Quality from './pages/Quality'
import Queue from './pages/Queue'
import { useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/duplicates" element={<ProtectedRoute><Duplicates /></ProtectedRoute>} />
      <Route path="/bursts" element={<ProtectedRoute><Bursts /></ProtectedRoute>} />
      <Route path="/quality" element={<ProtectedRoute><Quality /></ProtectedRoute>} />
      <Route path="/queue" element={<ProtectedRoute><Queue /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
