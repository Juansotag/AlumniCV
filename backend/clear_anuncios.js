import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function clearAnuncios() {
  try {
    const { rowCount } = await pool.query('DELETE FROM job_search_results')
    console.log(`✅ Se eliminaron todos los anuncios (${rowCount} registros) de la base de datos.`)
  } catch (err) {
    console.error('❌ Error al eliminar anuncios:', err.message)
  } finally {
    await pool.end()
  }
}

clearAnuncios()
