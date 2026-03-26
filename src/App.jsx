import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import LoginPage from './pages/LoginPage'
import MainLayout from './components/layout/MainLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import PatientsPage from './pages/PatientsPage'
import PatientDetailPage from './pages/PatientDetailPage'
import AppointmentsPage from './pages/AppointmentsPage'
import { BillingPage, ConsultationsVideoPage, ReportsPage, ConfigPage } from './pages/PlaceholderPages'

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => { init() }, [])

  return (
    <BrowserRouter>
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
          <Route path="reportes"      element={<ReportsPage />} />
          <Route path="configuracion" element={<ConfigPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
