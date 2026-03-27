import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../store/authStore'
import { usePatientsStore } from '../../store/patientsStore'
import { useClinicStore } from '../../store/clinicStore'

export default function MainLayout() {
  const { doctor }                          = useAuthStore()
  const { patients, fetchPatients }         = usePatientsStore()
  const { clinics, fetchClinics }           = useClinicStore()

  // Precarga datos comunes una sola vez al montar el layout
  useEffect(() => {
    if (patients.length === 0) fetchPatients()
    if (clinics.length === 0 && doctor?.id) fetchClinics(doctor.id)
  }, [doctor?.id])

  return (
    <div className="flex min-h-screen" style={{ background: '#f1f5f9' }}>
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
