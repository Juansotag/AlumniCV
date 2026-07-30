import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

/**
 * Envuelve rutas que requieren sesión activa.
 * Si no hay sesión, redirige a /login.
 * Muestra nada mientras carga la sesión (evita el flash de redirect).
 */
export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return children
}
