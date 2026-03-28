import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Loader2 } from 'lucide-react'

import LoginPage      from './pages/LoginPage'
import MainLayout     from './components/layout/MainLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

const DashboardPage          = lazy(() => import('./pages/DashboardPage'))
const PatientsPage           = lazy(() => import('./pages/PatientsPage'))
const PatientDetailPage      = lazy(() => import('./pages/PatientDetailPage'))
const AppointmentsPage       = lazy(() => import('./pages/AppointmentsPage'))
const ConsultationsVideoPage = lazy(() => import('./pages/ConsultationsVideoPage'))
const BillingPage            = lazy(() => import('./pages/BillingPage'))
const InventoryPage          = lazy(() => import('./pages/InventoryPage'))
const ReportsPage            = lazy(() => import('./pages/ReportsPage'))
const ConfigPage             = lazy(() => import('./pages/ConfigPage'))

function PageLoader() {
  return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
    </div>
  )
}

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => { init() }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"     element={<DashboardPage />} />
            <Route path="pacientes"     element={<PatientsPage />} />
            <Route path="pacientes/:id" element={<PatientDetailPage />} />
            <Route path="agenda"        element={<AppointmentsPage />} />
            <Route path="consultas"     element={<ConsultationsVideoPage />} />
            <Route path="facturacion"   element={<BillingPage />} />
            <Route path="inventario"    element={<InventoryPage />} />
            <Route path="reportes"      element={<ReportsPage />} />
            <Route path="configuracion" element={<ConfigPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
