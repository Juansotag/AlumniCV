import 'dotenv/config'
import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

await client.connect()
console.log('✅ Conectado')

// Ver qué hay para ese correo
const { rows } = await client.query(
  "SELECT id, correo, nombre, created_at FROM usuarios WHERE correo = 'juansotag@unisabana.edu.co'"
)
console.log('Registros con ese correo:', rows)

if (rows.length > 0) {
  // Elimina el registro huérfano (el UUID ya no existe en Supabase Auth)
  await client.query("DELETE FROM usuarios WHERE correo = 'juansotag@unisabana.edu.co'")
  console.log('🗑️  Registro huérfano eliminado. El middleware lo recreará correctamente al próximo login.')
}

await client.end()
