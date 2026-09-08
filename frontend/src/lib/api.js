import { supabase } from './supabase.js'

const _raw = import.meta.env.VITE_API_URL?.trim() ?? ''
const API_BASE = _raw.startsWith('http')
  ? (_raw.endsWith('/api') ? _raw : `${_raw.replace(/\/$/, '')}/api`)
  : '/api'

/**
 * Hace un fetch autenticado al backend usando el JWT de Supabase.
 * Lanza un error si la respuesta no es OK.
 */
export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Sin sesión activa')
  }

  const isFormData = options.body instanceof FormData

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Authorization': `Bearer ${session.access_token}`,
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Error ${res.status}`)
  }

  return res.json()
}

/**
 * Realiza un fetch autenticado retornando el Blob binario (para previsualización de .docx o .pdf)
 */
export async function apiFetchBlob(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Sin sesión activa')
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    throw new Error(`Error al obtener archivo binario: ${res.status}`)
  }

  return res.blob()
}
