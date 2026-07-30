import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS postulantes INTEGER,
        ADD COLUMN IF NOT EXISTS seniority TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS link TEXT DEFAULT ''
    `)
    console.log('✅ Migración exitosa: postulantes, seniority, link en applications')
  } catch (err) {
    console.error('❌ Error de migración:', err.message)
  } finally {
    await pool.end()
  }
}

migrate()
