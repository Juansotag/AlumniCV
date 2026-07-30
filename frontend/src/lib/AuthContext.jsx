import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { apiFetch } from './api.js'

const AuthContext = createContext(null)

/**
 * Provee sesión + perfil (usuario + cv_activo + ultimo_assessment) a toda la app.
 * - `session`         → sesión Supabase
 * - `user`            → datos frescos de Supabase (user_metadata)
 * - `profile`         → { usuario, cv_activo, ultimo_assessment } desde GET /api/profile
 * - `loading`         → true mientras resuelve la sesión inicial
 * - `signOut`         → cierra sesión
 * - `refreshProfile`  → vuelve a pedir el perfil (usar después de subir un CV nuevo)
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      try {
        const data = await apiFetch('/profile')
        setProfile(data)
      } catch (err) {
        console.warn('[AuthContext] /api/profile falló:', err.message)
      }
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) await loadUser()
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        await loadUser()
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
