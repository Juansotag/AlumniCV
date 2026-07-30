/**
 * AlumniCV — Supabase Storage helper
 * Usa el service_role key para subir archivos sin restricciones de RLS.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Nombres exactos de los buckets en Supabase Storage
const BUCKET_CVS         = 'alumni-cvs'
const BUCKET_ASSESSMENTS = 'alumni-assessments'
const BUCKET_DOCUMENTOS  = 'alumni-documentos'

async function upload(bucket, buffer, path, contentType) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload error (${bucket}): ${error.message}`)

  const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  if (publicUrlData?.publicUrl) {
    return publicUrlData.publicUrl
  }

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(data.path, 60 * 60 * 24 * 365) // 1 año

  if (signErr) throw new Error(`Storage sign error (${bucket}): ${signErr.message}`)

  return signed?.signedUrl ?? null
}

/** Sube el PDF/DOCX original de la hoja de vida subida por el usuario. */
export function uploadCvFile(buffer, path, contentType = 'application/pdf') {
  return upload(BUCKET_CVS, buffer, path, contentType)
}

/** Sube el PDF de reporte generado por el assessment. */
export function uploadAssessmentPdf(buffer, path) {
  return upload(BUCKET_ASSESSMENTS, buffer, path, 'application/pdf')
}

/** Sube documentos generados (CV/cover letter/correo) para un proceso de selección. */
export function uploadDocumento(buffer, path, contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
  return upload(BUCKET_DOCUMENTOS, buffer, path, contentType)
}
