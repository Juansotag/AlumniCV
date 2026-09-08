import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_URL = 'http://localhost:8000/api'
const SUPABASE_URL = process.env.SUPABASE_URL
const ANON_KEY = process.env.SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function testDocEndpoints() {
  console.log('--- Iniciando prueba de preview y replace de documentos ---')

  // 1. Iniciar sesión como Mariana Restrepo
  const { data: authData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'mariana.restrepo@unisabana.edu.co',
    password: 'EsgPassword2026!#'
  })
  if (loginErr) throw loginErr
  const token = authData.session.access_token

  // 2. Obtener lista de documentos
  const docsRes = await fetch(`${API_URL}/documents`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const { documents } = await docsRes.json()
  console.log(`[OK] Se encontraron ${documents.length} documentos para Mariana`)
  if (documents.length === 0) throw new Error('No hay documentos generados para probar')

  const sampleDoc = documents[0]
  console.log(`[OK] Probando con documento: ${sampleDoc.nombre_archivo} (ID: ${sampleDoc.id})`)

  // 3. Probar GET /api/documents/:id/file (Proxy de streaming para previsualizador)
  const fileRes = await fetch(`${API_URL}/documents/${sampleDoc.id}/file`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!fileRes.ok) throw new Error(`GET /file falló con status ${fileRes.status}`)
  const blob = await fileRes.blob()
  console.log(`[PASS] GET /api/documents/${sampleDoc.id}/file respondió con ${blob.size} bytes (${blob.type})`)

  // 4. Probar POST /api/documents/:id/replace (Subida de versión modificada)
  const modifiedContent = 'CONTENIDO MODIFICADO DE PRUEBA EN WORD PARA EVALUAR REEMPLAZO'
  const tempPath = path.join(__dirname, 'uploads', 'temp_modificado.docx')
  fs.writeFileSync(tempPath, Buffer.from(modifiedContent))

  const formData = new FormData()
  const modBlob = new Blob([fs.readFileSync(tempPath)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  formData.append('file', modBlob, 'Mariana_CV_Editado_Manual.docx')

  const replaceRes = await fetch(`${API_URL}/documents/${sampleDoc.id}/replace`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  })
  const replaceData = await replaceRes.json()
  if (!replaceRes.ok) throw new Error(`POST /replace falló: ${JSON.stringify(replaceData)}`)

  console.log(`[PASS] POST /replace exitoso:`, replaceData.message)
  console.log(`[PASS] Nuevo nombre guardado: ${replaceData.document?.nombre_archivo}`)
  console.log(`[PASS] Nueva URL generada: ${replaceData.document?.file_url}`)

  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
  console.log('--- Todas las pruebas de preview y replace pasaron exitosamente ---')
}

testDocEndpoints().catch(err => {
  console.error('[ERROR]', err)
  process.exit(1)
})
