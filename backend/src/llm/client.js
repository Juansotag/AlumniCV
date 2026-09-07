import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY no definida en .env — las funciones de IA no van a funcionar.')
}

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// Modelos disponibles
const MODEL_FULL = 'gpt-4o'        // assessment, docs, coach — calidad alta
const MODEL_MINI = 'gpt-4o-mini'   // parseo estructurado — rápido y económico

/**
 * Llama a OpenAI pidiendo una respuesta en JSON puro y la parsea.
 * Usa response_format: json_object para garantizar JSON válido sin regex.
 *
 * @param {string} prompt
 * @param {{ maxTokens?: number, model?: string }} options
 */
export async function completeJson(prompt, { maxTokens = 4096, model = MODEL_FULL } = {}) {
  if (!openai) throw new Error('OPENAI_API_KEY no configurada')

  const response = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.choices[0].message.content ?? ''

  return JSON.parse(rawText)
}

/**
 * Llama a OpenAI para flujos de chat conversacional (Coach Laboral).
 *
 * @param {string} systemPrompt
 * @param {{ role: string, content: string }[]} messages
 */
export async function chatCompletion(systemPrompt, messages) {
  if (!openai) throw new Error('OPENAI_API_KEY no configurada')

  const response = await openai.chat.completions.create({
    model: MODEL_FULL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  return response.choices[0].message.content ?? ''
}
