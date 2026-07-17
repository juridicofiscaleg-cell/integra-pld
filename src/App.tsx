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
import { LegalLibraryPage } from './pages/LegalLibraryPage'
import { OperationsPage } from './pages/OperationsPage'
import { CalendarPage } from './pages/CalendarPage'
import { CompliancePage } from './pages/CompliancePage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { ActivityLogPage } from './pages/ActivityLogPage'
import { PendingAccountPage, RejectedAccountPage } from './pages/PendingAccountPage'
import { isAccountPending, isAccountRejected } from './lib/permissions'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading-screen">Cargando...</div>
  if (!profile) return <Navigate to="/login" replace />
  if (isAccountRejected(profile)) return <RejectedAccountPage />
  if (isAccountPending(profile)) return <PendingAccountPage />
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
      <Route path="/operaciones" element={<ProtectedRoute><OperationsPage /></ProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/alertas" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/cumplimiento" element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} />
      <Route path="/autorizaciones" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
      <Route path="/bitacora" element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/biblioteca" element={<ProtectedRoute><LegalLibraryPage /></ProtectedRoute>} />
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
