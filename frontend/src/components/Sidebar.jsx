import { Search, ListChecks, FileStack, Info, MessageSquare } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const NAV_ITEMS = [
  { path: '/dashboard/nueva-busqueda', label: 'Nueva búsqueda', icon: Search },
  { path: '/dashboard/mis-procesos', label: 'Mis procesos', icon: ListChecks },
  { path: '/dashboard/mis-documentos', label: 'Mis documentos', icon: FileStack },
  { path: '/dashboard/coach', label: 'Coach Laboral', icon: MessageSquare },
  { path: '/dashboard/sobre-la-aplicacion', label: 'Sobre la aplicación', icon: Info },
]

export default function Sidebar() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const nombre = profile?.usuario?.nombre ?? 'Usuario'
  const initials = nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <aside className="sidebar" aria-label="Panel lateral">
      <button onClick={() => navigate('/profile')} style={{ all: 'unset', cursor: 'pointer', width: '100%' }} title="Ver mi perfil">
        <div className="sidebar-profile">
          <div className="sidebar-avatar" aria-hidden="true">{initials || '??'}</div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <p className="sidebar-name">{nombre}</p>
            <p className="sidebar-role">{profile?.usuario?.correo}</p>
          </div>
        </div>
      </button>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            className={`sidebar-nav-item ${location.pathname === path ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
