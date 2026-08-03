import { createClient } from '@supabase/supabase-js'
import { query } from '../db/index.js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL y SUPABASE_ANON_KEY son requeridas en .env')
}

/**
 * Cliente de Supabase para el backend.
 * Usamos el anon key + el JWT del usuario para validar el token
 * directamente contra Supabase Auth — sin necesitar el JWT Secret.
 */
const supabaseUrl  = process.env.SUPABASE_URL
const supabaseAnon = process.env.SUPABASE_ANON_KEY

/**
 * Middleware de autenticación.
 *
 * 1. Extrae el Bearer token del header Authorization.
 * 2. Valida el token preguntándole a Supabase Auth directamente.
 * 3. Hace UPSERT en `usuarios` (Railway) la primera vez.
 * 4. Adjunta `req.user` = { id, correo, nombre } para los handlers.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' })
  }

  const token = authHeader.slice(7)

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  const userId = user.id
  const correo = user.email
  const nombre = user.user_metadata?.nombre ?? user.user_metadata?.full_name ?? null

  try {
    // Usamos una transacción para evitar violación de unicidad en `correo`
    // cuando Supabase reasigna un nuevo UUID al mismo email (ej. re-registro).
    await query('BEGIN')

    // Elimina cualquier registro huérfano con el mismo correo pero distinto id
    await query(
      'DELETE FROM usuarios WHERE correo = $1 AND id != $2',
      [correo, userId]
    )

    await query(`
      INSERT INTO usuarios (id, correo, nombre)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
        SET correo = EXCLUDED.correo,
            nombre = COALESCE(usuarios.nombre, EXCLUDED.nombre)
    `, [userId, correo, nombre])

    await query('COMMIT')

    req.user = { id: userId, correo, nombre }
    next()
  } catch (err) {
    await query('ROLLBACK').catch(() => {})
    console.error('Error al sincronizar usuario en Railway:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      where: err.where,
    })
    res.status(500).json({ error: 'Error interno de autenticación', detail: err.message })
  }
}
