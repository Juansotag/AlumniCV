import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en .env')
}

/**
 * Pool de conexiones a PostgreSQL (Railway).
 * Se reutiliza una sola instancia en toda la app.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,              // máximo de conexiones simultáneas
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres:', err.message)
})

/** Ejecuta una query. Usa el pool directamente para queries simples. */
export const query = (text, params) => pool.query(text, params)

/** Devuelve un cliente del pool para transacciones manuales. */
export const getClient = () => pool.connect()
