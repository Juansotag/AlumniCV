import { completeJson } from './client.js'

const PROMPT_TEMPLATE = (cvText) => `Actúa como un parser de hojas de vida. Analiza el siguiente currículum y devuelve ÚNICAMENTE un objeto JSON (sin markdown, sin explicaciones) con esta estructura exacta:

{
  "resumen": "Resumen profesional corto, 2-3 frases",
  "experiencia": [
    { "empresa": "...", "cargo": "...", "desde": "YYYY-MM", "hasta": "YYYY-MM o null si es el trabajo actual", "descripcion": "..." }
  ],
  "educacion_formal": [
    { "institucion": "...", "titulo": "...", "desde": "YYYY", "hasta": "YYYY o null" }
  ],
  "certificaciones": [
    { "nombre": "...", "fecha_emision": "YYYY-MM o null", "fecha_vencimiento": "YYYY-MM o null", "entidad_emisora": "...", "id_credencial": "... o null" }
  ],
  "formacion_no_formal": [
    { "nombre": "...", "institucion": "...", "fecha": "YYYY-MM o null" }
  ],
  "idiomas": [
    { "idioma": "...", "nivel": "básico|intermedio|avanzado|nativo" }
  ],
  "habilidades_tecnicas": [
    { "tipo": "programacion|programa|conocimiento", "nombre": "...", "nivel": "básico|intermedio|avanzado o null si no se puede inferir" }
  ],
  "habilidades_blandas": ["..."]
}

Reglas:
- Extrae TODO lo que encuentres en el CV, no inventes datos que no estén presentes.
- Si una sección no tiene información en el CV, devuélvela como arreglo vacío [].
- "habilidades_tecnicas" incluye lenguajes/frameworks de programación (tipo: "programacion"), software o herramientas (tipo: "programa"), y conocimientos específicos de dominio como estadística o machine learning (tipo: "conocimiento").
- Certificados de idioma (ej. TOEFL, IELTS) van en "certificaciones", no en "idiomas". "idiomas" es para el nivel general hablado/escrito.
- Responde exclusivamente con el JSON, nada más.

---
CONTENIDO DEL CV:
${cvText}`

/**
 * Extrae los campos estructurados del perfil a partir del texto plano de un CV.
 * @param {string} cvText
 * @returns {Promise<object>} — coincide con las columnas jsonb de la tabla `usuarios`
 */
export async function parseCvText(cvText) {
  return completeJson(PROMPT_TEMPLATE(cvText), { maxTokens: 4096 })
}
