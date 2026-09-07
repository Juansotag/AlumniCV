import { completeJson, MODEL_FAST } from './client.js'

const PROMPT_TEMPLATE = (cvText) => `Actúa como un parser experto de hojas de vida (CV / Resumes). Analiza el siguiente currículum (que puede estar en ESPAÑOL, INGLÉS o cualquier otro idioma) y devuelve ÚNICAMENTE un objeto JSON (sin markdown, sin explicaciones) con esta estructura exacta:

{
  "resumen": "Resumen profesional de 2-3 frases (si el CV está en inglés, puedes mantenerlo en inglés o resumirlo fielmente)",
  "experiencia": [
    {
      "empresa": "Nombre de la empresa",
      "cargo": "Cargo o título del puesto",
      "desde": "YYYY-MM o YYYY",
      "hasta": "YYYY-MM o YYYY o null si es el empleo actual (ej. Present / Current / Actual)",
      "descripcion": "Logros y responsabilidades principales"
    }
  ],
  "educacion_formal": [
    {
      "institucion": "Universidad o institución educativa",
      "titulo": "Título obtenido o carrera",
      "desde": "YYYY o null",
      "hasta": "YYYY o null si está en curso"
    }
  ],
  "certificaciones": [
    {
      "nombre": "Nombre de la certificación o licencia",
      "fecha_emision": "YYYY-MM o YYYY o null",
      "fecha_vencimiento": "YYYY-MM o YYYY o null",
      "entidad_emisora": "Entidad que emite la credencial",
      "id_credencial": "Código o ID si existe, o null"
    }
  ],
  "formacion_no_formal": [
    {
      "nombre": "Curso, bootcamp o taller",
      "institucion": "Plataforma o entidad educativa (Coursera, Udemy, etc.)",
      "fecha": "YYYY-MM o YYYY o null"
    }
  ],
  "idiomas": [
    {
      "idioma": "Nombre del idioma (ej. Español, Inglés, Francés)",
      "nivel": "básico|intermedio|avanzado|nativo"
    }
  ],
  "habilidades_tecnicas": [
    {
      "tipo": "programacion|programa|conocimiento",
      "nombre": "Nombre de la tecnología, software o conocimiento",
      "nivel": "básico|intermedio|avanzado o null si no se especifica"
    }
  ],
  "habilidades_blandas": ["Liderazgo", "Comunicación asertiva", "..."]
}

Reglas indispensables:
1. IDIOMAS Y ENCABEZADOS EN INGLÉS:
   - Si el CV está en INGLÉS, detecta adecuadamente las secciones estándar: "Work Experience", "Employment History", "Professional Experience", "Education", "Skills", "Technical Skills", "Languages", "Certifications / Licenses", "Summary / About Me", "Projects".
   - Normaliza el campo "nivel" de "idiomas" a uno de estos 4 valores exactos en español:
     * "nativo" (Native, Bilingual, Mother tongue)
     * "avanzado" (Fluent, Proficient, Advanced, C1, C2)
     * "intermedio" (Intermediate, Professional working proficiency, B1, B2)
     * "básico" (Basic, Elementary, Limited working proficiency, A1, A2)
   - Normaliza el campo "tipo" de "habilidades_tecnicas" exactamente a:
     * "programacion" (lenguajes, frameworks, librerías de código como Python, React, SQL, Java)
     * "programa" (software, herramientas, suites como Excel, Jira, Figma, Power BI, Docker)
     * "conocimiento" (metodologías, conceptos o disciplinas como Scrum, Machine Learning, SEO, Finanzas)
2. FECHAS:
   - Convierte meses a números ("Jan 2021" -> "2021-01", "Oct 2023" -> "2023-10").
   - Si la experiencia indica "Present", "Current", "Actual" o "Presente", el campo "hasta" DEBE ser null.
3. PRECISIÓN:
   - Extrae fielmente la información presente sin inventar puestos, fechas ni empresas.
   - Si una sección no tiene datos en el documento, devuélvela como arreglo vacío [].
   - Responde estrictamente con el JSON solicitado, sin rodeos ni caracteres adicionales.

---
CONTENIDO DEL CV:
${cvText}`

/**
 * Extrae los campos estructurados del perfil a partir del texto plano de un CV.
 * @param {string} cvText
 * @returns {Promise<object>} — coincide con las columnas jsonb de la tabla `usuarios`
 */
export async function parseCvText(cvText) {
  return completeJson(PROMPT_TEMPLATE(cvText), { maxTokens: 4096, model: MODEL_FAST })
}
