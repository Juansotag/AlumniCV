import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function backfill() {
  try {
    const { rowCount } = await pool.query(`
      UPDATE applications a
      SET link = r.link
      FROM job_search_results r
      WHERE a.job_search_result_id = r.id
        AND (a.link IS NULL OR a.link = '')
    `)
    console.log(`✅ Reparados ${rowCount} registros de aplicaciones anteriores sin enlace.`)
  } catch (err) {
    console.error('❌ Error de backfill:', err.message)
  } finally {
    await pool.end()
  }
}

backfill()
