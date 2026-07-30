import { Routes, Route, Navigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import NuevaBusqueda from './NuevaBusqueda.jsx'
import MisProcesos from './MisProcesos.jsx'
import MisDocumentos from './MisDocumentos.jsx'
import SobreAplicacion from './SobreAplicacion.jsx'
import CoachLaboral from './CoachLaboral.jsx'

export default function Dashboard() {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="workspace">
          <Routes>
            <Route path="nueva-busqueda" element={<NuevaBusqueda />} />
            <Route path="mis-procesos" element={<MisProcesos />} />
            <Route path="mis-documentos" element={<MisDocumentos />} />
            <Route path="sobre-la-aplicacion" element={<SobreAplicacion />} />
            <Route path="coach" element={<CoachLaboral />} />
            <Route path="*" element={<Navigate to="nueva-busqueda" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
