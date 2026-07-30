/**
 * migrate.js — Runner de migraciones para AlumniCV
 *
 * Cómo usarlo:
 *   node src/db/migrate.js
 *
 * Lee todos los archivos .sql de src/db/migrations/ en orden
 * y los ejecuta contra la base de datos definida en DATABASE_URL.
 * Lleva un registro en la tabla `schema_migrations` para no
 * volver a ejecutar migraciones ya aplicadas.
 */

import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL no está definida en .env')
    process.exit(1)
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  })

  await client.connect()
  console.log('✅  Conectado a PostgreSQL\n')

  try {
    // Tabla de control de migraciones (idempotente)
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Leer y ordenar archivos .sql
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      // Verificar si ya fue aplicada
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      )

      if (rows.length > 0) {
        console.log(`⏭   ${file} — ya aplicada, omitiendo`)
        continue
      }

      // Leer y ejecutar el SQL
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      console.log(`▶   Aplicando ${file}…`)

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')
        console.log(`✅  ${file} aplicada correctamente`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`❌  Error en ${file}:`, err.message)
        throw err
      }
    }

    console.log('\n🌱  Migraciones completadas.')
  } finally {
    await client.end()
  }
}

migrate().catch(err => {
  console.error('Error fatal en migrate.js:', err.message)
  process.exit(1)
})
