import { extractText, extractTextItems, getDocumentProxy } from 'unpdf'

/**
 * Ordena y formatea un conjunto de items de texto de un bloque (columna o sección)
 * de arriba hacia abajo (Y descendente) y de izquierda a derecha en la misma línea.
 */
function formatBlock(blockItems) {
  if (!blockItems || blockItems.length === 0) return ''
  // En PDF Y mayor = más arriba en la página
  blockItems.sort((a, b) => b.y - a.y || a.x - b.x)

  const lines = []
  let currentLine = [blockItems[0]]
  let currentY = blockItems[0].y

  for (let i = 1; i < blockItems.length; i++) {
    const it = blockItems[i]
    // Misma línea si la coordenada Y está a menos de 4.5pt de diferencia
    if (Math.abs(it.y - currentY) <= 4.5) {
      currentLine.push(it)
    } else {
      currentLine.sort((a, b) => a.x - b.x)
      lines.push(currentLine.map(x => x.str.trim()).filter(Boolean).join(' '))
      currentLine = [it]
      currentY = it.y
    }
  }

  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x)
    lines.push(currentLine.map(x => x.str.trim()).filter(Boolean).join(' '))
  }

  return lines.filter(l => l.trim().length > 0).join('\n')
}

/**
 * Procesa los items de texto estructurados de una página para detectar si existe un
 * diseño de doble columna (típico de Canva, Word o plantillas modernas de CV)
 * y extrae el texto respetando las columnas sin entremezclar líneas horizontales.
 */
function extractLayoutAwarePage(pageItems) {
  const items = pageItems.filter(it => it.str && it.str.trim().length > 0)
  if (items.length === 0) return ''

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const it of items) {
    if (it.x < minX) minX = it.x
    if (it.x + it.width > maxX) maxX = it.x + it.width
    if (it.y < minY) minY = it.y
    if (it.y > maxY) maxY = it.y
  }

  const pageWidth = maxX - minX
  const pageHeight = maxY - minY

  // Escanear posibles "canales" verticales (gutters) entre el 20% y 80% del ancho
  let bestGutter = null
  let bestGutterScore = 0

  const step = 5
  for (let gx = minX + pageWidth * 0.20; gx <= minX + pageWidth * 0.80; gx += step) {
    const gutterWidth = 12
    const gLeft = gx - gutterWidth / 2
    const gRight = gx + gutterWidth / 2

    let leftCount = 0
    let rightCount = 0
    let crossCount = 0

    // Evaluamos items del cuerpo (excluyendo el 20% superior que suele ser cabecera completa)
    for (const it of items) {
      if (it.y > maxY - pageHeight * 0.20) continue
      const itRight = it.x + it.width
      if (it.x < gLeft && itRight > gRight) {
        crossCount++
      } else if (itRight <= gRight) {
        leftCount++
      } else if (it.x >= gLeft) {
        rightCount++
      }
    }

    if (leftCount >= 3 && rightCount >= 3) {
      const balance = 1 - Math.abs(leftCount - rightCount) / (leftCount + rightCount)
      const score = (leftCount + rightCount) * balance - crossCount * 12
      if (score > bestGutterScore && crossCount <= 2) {
        bestGutterScore = score
        bestGutter = gx
      }
    }
  }

  // Si detectamos doble columna
  if (bestGutter) {
    const splitX = bestGutter

    // Detectar si hay encabezado superior que cruza splitX
    const topCandidates = items.filter(it => it.y > maxY - pageHeight * 0.25)
    let headerCutoffY = maxY
    for (const it of topCandidates) {
      const itRight = it.x + it.width
      if (it.x < splitX && itRight > splitX) {
        headerCutoffY = Math.min(headerCutoffY, it.y)
      }
    }

    const headerItems = []
    const leftItems = []
    const rightItems = []

    for (const it of items) {
      if (headerCutoffY < maxY && it.y >= headerCutoffY - 3) {
        headerItems.push(it)
      } else if (it.x + it.width * 0.5 < splitX) {
        leftItems.push(it)
      } else {
        rightItems.push(it)
      }
    }

    const headerText = formatBlock(headerItems)
    const leftText = formatBlock(leftItems)
    const rightText = formatBlock(rightItems)

    return [headerText, leftText, rightText].filter(Boolean).join('\n\n')
  }

  // Si es una sola columna: ordenamiento natural top-to-bottom por coordenadas Y y X
  // (corrige el desorden de cajas de texto de Canva)
  return formatBlock(items)
}

/**
 * Crea un objeto con resultado enriquecido y compatibilidad de string
 */
function createExtractionResult(text, totalPages, pagesProcessed) {
  const isTruncated = totalPages > pagesProcessed
  return {
    text: text || '',
    totalPages,
    pagesProcessed,
    truncated: isTruncated,
    toString() { return this.text },
    trim() { return this.text.trim() },
    toLowerCase() { return this.text.toLowerCase() },
    toUpperCase() { return this.text.toUpperCase() },
    includes(...args) { return this.text.includes(...args) },
    indexOf(...args) { return this.text.indexOf(...args) },
    match(...args) { return this.text.match(...args) },
    split(...args) { return this.text.split(...args) },
    startsWith(...args) { return this.text.startsWith(...args) },
    endsWith(...args) { return this.text.endsWith(...args) },
    charAt(i) { return this.text.charAt(i) },
    slice(...args) { return this.text.slice(...args) },
    get length() { return this.text.length },
    [Symbol.toPrimitive]() { return this.text }
  }
}

/**
 * Extrae el texto plano de un PDF de hoja de vida con conciencia de diseño (doble columna, Canva).
 * Implementa defensas QA contra:
 * - Archivos corruptos o menores a 500 bytes
 * - Archivos que no son PDF pero tienen extensión .pdf (Magic Bytes)
 * - PDFs encriptados o con contraseña
 * - PDFs excesivamente largos (limita a las primeras 5 páginas para evitar desbordar contexto/memoria y avisa al usuario)
 *
 * @param {Buffer} fileBuffer
 * @returns {Promise<{text: string, totalPages: number, pagesProcessed: number, truncated: boolean}>}
 */
export async function extractTextFromCv(fileBuffer) {
  // 1. Blindaje de tamaño mínimo
  if (!fileBuffer || fileBuffer.byteLength < 500) {
    throw new Error('El archivo subido está vacío o corrupto (menos de 500 bytes).')
  }

  // 2. Blindaje Magic Bytes (%PDF-)
  const magicHeader = fileBuffer.subarray(0, 5).toString('ascii')
  if (!magicHeader.startsWith('%PDF-')) {
    throw new Error('El archivo no es un documento PDF válido (encabezado o formato no reconocido).')
  }

  const uint8 = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength)

  let totalPages = 1
  const MAX_PAGES = 5

  try {
    const pdf = await getDocumentProxy(uint8)
    const { items: pagesItems } = await extractTextItems(pdf)

    totalPages = pagesItems?.length || 1
    const pagesToProcess = (pagesItems || []).slice(0, MAX_PAGES)

    if (pagesToProcess.length > 0) {
      const pageTexts = pagesToProcess.map(pageItems => extractLayoutAwarePage(pageItems))
      const combined = pageTexts.filter(t => t.trim().length > 0).join('\n\n')

      if (combined.trim().length >= 50) {
        return createExtractionResult(combined, totalPages, pagesToProcess.length)
      }
    }
  } catch (err) {
    // Blindaje contra PDFs protegidos por contraseña
    if (err.name === 'PasswordException' || /password|encrypted|contraseña/i.test(err.message)) {
      throw new Error('Este archivo PDF está protegido con contraseña. Por favor remueve la contraseña antes de subirlo.')
    }

    console.warn('[cvService] Extracción por layout falló, reintentando con extractText básico:', err.message)
  }

  // Fallback con extractText estándar de unpdf
  try {
    const { text, totalPages: unpdfTotalPages } = await extractText(uint8, { mergePages: true })
    const actualTotal = unpdfTotalPages || totalPages || 1
    return createExtractionResult(text || '', actualTotal, Math.min(actualTotal, MAX_PAGES))
  } catch (fallbackErr) {
    if (fallbackErr.name === 'PasswordException' || /password|encrypted|contraseña/i.test(fallbackErr.message)) {
      throw new Error('Este archivo PDF está protegido con contraseña. Por favor remueve la contraseña antes de subirlo.')
    }
    throw fallbackErr
  }
}
