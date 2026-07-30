import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY no definida en .env — las funciones de IA no van a funcionar.')
}

export const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const MODEL = 'claude-sonnet-4-5-20250929'

/**
 * Llama a Claude pidiendo una respuesta en JSON puro y la parsea.
 * Sigue el mismo patrón de extracción que usa Germina con OpenAI
 * (regex sobre el bloque {...} por si el modelo agrega texto o fences).
 */
export async function completeJson(prompt, { maxTokens = 4096 } = {}) {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY no configurada')

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()

  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude no devolvió un JSON válido: ' + rawText.slice(0, 200))

  return JSON.parse(jsonMatch[0])
}

/**
 * Llama a Claude para flujos de chat conversacional
 */
export async function chatCompletion(systemPrompt, messages) {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY no configurada')

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages
  })

  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
}
