import { completeJson } from './client.js'

// Prompt base pedido por Juan, adaptado para responder en JSON en vez de texto libre.
const PROMPT_TEMPLATE = (cvText) => `Actúa como un reclutador con 15 años de experiencia. Analiza el siguiente currículo y responde ÚNICAMENTE con un objeto JSON (sin markdown, sin explicaciones) con esta estructura exacta:

{
  "top_puestos": ["...", "... (exactamente 20 puestos, del mejor encaje al menos obvio)"],
  "palabras_clave_ats": ["...", "... (palabras clave ATS que faltan o deberían reforzarse)"],
  "debilidades": ["...", "... (qué se nota en menos de 10 segundos de lectura)"],
  "calificacion": {
    "score": 7.5,
    "como_llegar_a_10": ["...", "... (acciones concretas para mejorar el CV)"]
  }
}

Reglas:
- "top_puestos": exactamente 20 puestos para los que esta persona sería mejor candidata, del encaje más fuerte al más tangencial.
- "palabras_clave_ats": términos exactos que buscan los ATS/reclutadores y que faltan o están débiles en el CV.
- "debilidades": defectos que un reclutador notaría en los primeros 10 segundos de lectura (formato, falta de métricas, título poco claro, etc.).
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
  return completeJson(PROMPT_TEMPLATE(cvText), { maxTokens: 4096 })
}
