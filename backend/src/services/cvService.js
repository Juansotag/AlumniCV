import { extractText } from 'unpdf'

/**
 * Extrae el texto plano de un PDF de hoja de vida.
 * @param {Buffer} fileBuffer
 * @returns {Promise<string>}
 */
export async function extractTextFromCv(fileBuffer) {
  const uint8 = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength)
  const { text } = await extractText(uint8, { mergePages: true })
  return text
}
