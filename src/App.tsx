import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ClientsPage } from './pages/ClientsPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { ExpedientesPage } from './pages/ExpedientesPage'
import { ExpedienteDetailPage } from './pages/ExpedienteDetailPage'
import { KycPage } from './pages/KycPage'
import { AlertsPage } from './pages/AlertsPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { ReportsPage } from './pages/ReportsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading-screen">Cargando...</div>
  if (!profile) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { isDemo } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
      <Route path="/clientes/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
      <Route path="/expedientes" element={<ProtectedRoute><ExpedientesPage /></ProtectedRoute>} />
      <Route path="/expedientes/:id" element={<ProtectedRoute><ExpedienteDetailPage /></ProtectedRoute>} />
      <Route path="/kyc" element={<ProtectedRoute><KycPage /></ProtectedRoute>} />
      <Route path="/alertas" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/buscar" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/configuracion" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={isDemo ? '/login' : '/'} replace />} />
    </Routes>
  )
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
