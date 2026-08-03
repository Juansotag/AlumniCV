import 'dotenv/config'
import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  await client.connect()
  console.log('✅ Conectado a PostgreSQL')

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  )
  console.log('📋 Tablas:', tables.rows.map(x => x.table_name))

  const count = await client.query('SELECT COUNT(*) FROM usuarios')
  console.log('👤 Usuarios en BD:', count.rows[0].count)

  // Prueba INSERT igual al del middleware
  const testId = '00000000-0000-0000-0000-000000000001'
  await client.query(`
    INSERT INTO usuarios (id, correo, nombre)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE
      SET correo = EXCLUDED.correo,
          nombre = COALESCE(usuarios.nombre, EXCLUDED.nombre)
  `, [testId, 'test@test.com', 'Test User'])
  console.log('✅ INSERT de prueba exitoso')

  // Limpia el test
  await client.query('DELETE FROM usuarios WHERE id = $1', [testId])
  console.log('🧹 Limpieza hecha')

} catch (err) {
  console.error('❌ ERROR:', err.message)
  console.error('   code:', err.code)
  console.error('   detail:', err.detail)
} finally {
  await client.end()
}
