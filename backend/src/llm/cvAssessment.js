import { completeJson, MODEL_FRONTIER } from './client.js'

// Prompt base adaptado para responder en JSON estructurado y soportar CVs en inglés/español.
const PROMPT_TEMPLATE = (cvText) => `Actúa como un reclutador sénior con 15 años de experiencia internacional. Analiza el siguiente currículum (que puede estar redactado en español, inglés u otro idioma) y responde ÚNICAMENTE con un objeto JSON (sin markdown, sin explicaciones) con esta estructura exacta:

{
  "top_puestos": ["...", "... (exactamente 20 puestos, del mejor encaje al menos obvio)"],
  "palabras_clave_ats": ["...", "... (palabras clave ATS que faltan o deberían reforzarse)"],
  "debilidades": ["...", "... (qué se nota en menos de 10 segundos de lectura)"],
  "calificacion": {
    "score": 7.5,
    "como_llegar_a_10": ["...", "... (acciones concretas para mejorar el CV)"]
  }
}

Reglas indispensables:
- IDIOMA DE LA RESPUESTA: El CV puede estar escrito en INGLÉS o ESPAÑOL. Sin importar el idioma original del CV, las explicaciones, debilidades ("debilidades") y las recomendaciones ("calificacion.como_llegar_a_10") deben redactarse SIEMPRE en ESPAÑOL claro, directo y constructivo.
- PUESTOS Y PALABRAS CLAVE: "top_puestos" y "palabras_clave_ats" pueden mantener términos en inglés o español según los estándares reales de contratación de la industria (ej. "Data Engineer", "Frontend Developer", "Agile", "Kubernetes").
- "top_puestos": exactamente 20 puestos para los que esta persona sería mejor candidata, del encaje más fuerte al más tangencial.
- "palabras_clave_ats": términos exactos que buscan los ATS/reclutadores y que faltan o están débiles en el CV.
- "debilidades": defectos que un reclutador notaría en los primeros 10 segundos de lectura (formato, falta de métricas de impacto, título poco claro, falta de datos de contacto o enlaces a portafolio, etc.).
- "calificacion.score": número del 1 al 10 (puede tener un decimal).
- "calificacion.como_llegar_a_10": pasos concretos y accionables para subir la calificación a 10.
- Sé directo y específico, como en una revisión real de reclutamiento — no genérico.
- Responde exclusivamente con el JSON, nada más.

---
CONTENIDO DEL CV:
${cvText}`

/**
 * Corre el assessment de reclutador sobre el texto plano de un CV.
 * @param {string} cvText
 * @returns {Promise<object>} — { top_puestos, palabras_clave_ats, debilidades, calificacion }
 */
export async function runCvAssessment(cvText) {
  return completeJson(PROMPT_TEMPLATE(cvText), { maxTokens: 4096, model: MODEL_FRONTIER })
}
