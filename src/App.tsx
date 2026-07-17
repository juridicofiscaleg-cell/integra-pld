import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/layout/Layout'
import { ClientPortalLayout } from './components/layout/ClientPortalLayout'
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
import { ClientPortalPage } from './pages/ClientPortalPage'
import { ClientPortalHomePage } from './pages/ClientPortalHomePage'
import { isAccountPending, isAccountRejected, isClientPortalUser } from './lib/permissions'

function StaffProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading-screen">Cargando...</div>
  if (!profile) return <Navigate to="/login" replace />
  if (isClientPortalUser(profile.role)) return <Navigate to="/mi-portal" replace />
  if (isAccountRejected(profile)) return <RejectedAccountPage />
  if (isAccountPending(profile)) return <PendingAccountPage />
  return <Layout>{children}</Layout>
}

function ClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading-screen">Cargando...</div>
  if (!profile) return <Navigate to="/login?modo=cliente" replace />
  if (!isClientPortalUser(profile.role)) return <Navigate to="/" replace />
  if (isAccountRejected(profile)) return <RejectedAccountPage />
  return <ClientPortalLayout>{children}</ClientPortalLayout>
}

function AppRoutes() {
  const { isDemo } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/:token" element={<ClientPortalPage />} />
      <Route path="/mi-portal" element={<ClientProtectedRoute><ClientPortalHomePage /></ClientProtectedRoute>} />
      <Route path="/" element={<StaffProtectedRoute><DashboardPage /></StaffProtectedRoute>} />
      <Route path="/clientes" element={<StaffProtectedRoute><ClientsPage /></StaffProtectedRoute>} />
      <Route path="/clientes/:id" element={<StaffProtectedRoute><ClientDetailPage /></StaffProtectedRoute>} />
      <Route path="/expedientes" element={<StaffProtectedRoute><ExpedientesPage /></StaffProtectedRoute>} />
      <Route path="/expedientes/:id" element={<StaffProtectedRoute><ExpedienteDetailPage /></StaffProtectedRoute>} />
      <Route path="/kyc" element={<StaffProtectedRoute><KycPage /></StaffProtectedRoute>} />
      <Route path="/operaciones" element={<StaffProtectedRoute><OperationsPage /></StaffProtectedRoute>} />
      <Route path="/calendario" element={<StaffProtectedRoute><CalendarPage /></StaffProtectedRoute>} />
      <Route path="/alertas" element={<StaffProtectedRoute><AlertsPage /></StaffProtectedRoute>} />
      <Route path="/cumplimiento" element={<StaffProtectedRoute><CompliancePage /></StaffProtectedRoute>} />
      <Route path="/autorizaciones" element={<StaffProtectedRoute><ApprovalsPage /></StaffProtectedRoute>} />
      <Route path="/bitacora" element={<StaffProtectedRoute><ActivityLogPage /></StaffProtectedRoute>} />
      <Route path="/reportes" element={<StaffProtectedRoute><ReportsPage /></StaffProtectedRoute>} />
      <Route path="/biblioteca" element={<StaffProtectedRoute><LegalLibraryPage /></StaffProtectedRoute>} />
      <Route path="/buscar" element={<StaffProtectedRoute><SearchPage /></StaffProtectedRoute>} />
      <Route path="/configuracion" element={<StaffProtectedRoute><SettingsPage /></StaffProtectedRoute>} />
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
