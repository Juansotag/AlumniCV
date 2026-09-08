import { completeJson, MODEL_FRONTIER } from './client.js'

// Prompt base adaptado para responder en JSON estructurado y soportar CVs en inglés/español con evaluación objetiva por mérito.
const PROMPT_TEMPLATE = (cvText) => `Actúa como un Director de Selección Corporativo y Headhunter Internacional con 15 años de experiencia evaluando hojas de vida para empresas Fortune 500 y startups tecnológicas de alto crecimiento.
Analiza con criterio riguroso el siguiente currículum vitae (que puede estar en español, inglés u otro idioma) y devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:

{
  "top_puestos": ["Puesto 1", "Puesto 2", "... (exactamente 20 puestos viables, del mejor encaje al menos obvio)"],
  "palabras_clave_ats": ["Keyword 1", "Keyword 2", "... (palabras clave ATS críticas que faltan o deben fortalecerse)"],
  "debilidades": ["Debilidad 1", "Debilidad 2", "... (fallas críticas detectables en los primeros 10 segundos)"],
  "calificacion": {
    "score": 0.0,
    "como_llegar_a_10": ["Acción 1", "Acción 2", "... (acciones concretas y prioritarias para elevar el puntaje a 10.0)"]
  }
}

RÚBRICA DE EVALUACIÓN Y CALIFICACIÓN ("score"):
Debes calcular el puntaje de 1.0 a 10.0 con 1 decimal evaluando estrictamente estos 4 pilares ponderados:
1. Impacto y Métricas Cuantificables (30%): ¿Usa cifras, porcentajes, ahorros o equipos liderados (metodología STAR / Google X-Y-Z) o se limita a listar funciones genéricas? (Si solo lista funciones sin métricas, este pilar no supera 5.0).
2. Densidad y Optimización ATS (25%): ¿Contiene las palabras clave, estándares técnicos e industria requeridos por los algoritmos de filtrado?
3. Jerarquía Visual y Claridad Ejecutiva (25%): ¿Es legible, directo y estructurado de forma ágil para un reclutador con poco tiempo?
4. Coherencia y Progresión Profesional (20%): ¿Muestra evolución de responsabilidades y continuidad sólida?

GUÍA DE PUNTAJES (PROHIBIDO EL SESGO DE 7.5 AUTOMÁTICO):
- 3.0 - 5.5: CV deficiente, sin logros claros, desordenado o con errores graves de formato.
- 5.6 - 6.8: CV básico, lista responsabilidades pero carece casi por completo de números, impacto o diferenciación.
- 6.9 - 7.9: CV aceptable/competente promedio, con buena estructura pero métricas tímidas o ATS mejorable.
- 8.0 - 8.9: CV muy fuerte, con logros comprobados, lenguaje de acción contundente y buena densidad ATS.
- 9.0 - 10.0: CV excepcional de nivel directivo/senior de clase mundial.
Calcula la nota auténtica con decimales reales y variados (ej. 6.4, 7.2, 8.1, 5.8, 8.6, 7.6) según el mérito estricto de este documento específico.

Reglas adicionales:
- IDIOMA: Las explicaciones, debilidades y recomendaciones deben estar redactadas en ESPAÑOL claro, formal y constructivo, independientemente del idioma original del CV.
- "top_puestos": exactamente 20 puestos ordenados de mayor a menor afinidad.
- "palabras_clave_ats": términos exactos que buscan los reclutadores en la industria.
- "debilidades": observaciones sinceras y directas de reclutador real (ej. "No cuantifica resultados en su último puesto", "Falta enlace a portafolio o LinkedIn").
- Responde estrictamente con el JSON, nada más.

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
