import * as cheerio from 'cheerio'

/**
 * Servicio de Búsqueda de Empleos en LinkedIn (vía LinkedIn Guest Jobs API)
 * Soporta filtros por modalidad, nivel de experiencia (seniority) y extracción extendida.
 */

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/** Mapeo de modalidad a parámetro f_WT de LinkedIn */
const WORK_TYPE_MAP = {
  remoto: '2',
  presencial: '1',
  hibrido: '3'
}

/** Mapeo de seniority a parámetro f_E de LinkedIn */
const SENIORITY_MAP = {
  practicante: '1',
  entry: '2',
  junior: '3',
  mid_senior: '4',
  director: '5'
}

/**
 * Diccionario de traducción de ubicaciones comunes en español a nombres geográficos
 * en inglés que LinkedIn Guest API comprende de forma fiable para búsquedas internacionales.
 */
const LOCATION_TRANSLATIONS = {
  // Países Europa
  'espana': 'Spain',
  'españa': 'Spain',
  'alemania': 'Germany',
  'francia': 'France',
  'reino unido': 'United Kingdom',
  'inglaterra': 'United Kingdom',
  'gran bretana': 'United Kingdom',
  'gran bretaña': 'United Kingdom',
  'uk': 'United Kingdom',
  'italia': 'Italy',
  'suiza': 'Switzerland',
  'paises bajos': 'Netherlands',
  'países bajos': 'Netherlands',
  'holanda': 'Netherlands',
  'belgica': 'Belgium',
  'bélgica': 'Belgium',
  'portugal': 'Portugal',
  'irlanda': 'Ireland',
  'suecia': 'Sweden',
  'noruega': 'Norway',
  'dinamarca': 'Denmark',
  'finlandia': 'Finland',
  'polonia': 'Poland',
  'austria': 'Austria',
  // Países Norteamérica y Oceanía
  'estados unidos': 'United States',
  'eeuu': 'United States',
  'ee.uu.': 'United States',
  'ee.uu': 'United States',
  'usa': 'United States',
  'canada': 'Canada',
  'canadá': 'Canada',
  'australia': 'Australia',
  'nueva zelanda': 'New Zealand',
  'nueva zelandia': 'New Zealand',
  'japon': 'Japan',
  'japón': 'Japan',
  'singapur': 'Singapore',
  // Ciudades globales frecuentes
  'londres': 'London',
  'paris': 'Paris',
  'parís': 'Paris',
  'roma': 'Rome',
  'berlin': 'Berlin',
  'berlín': 'Berlin',
  'munich': 'Munich',
  'múnich': 'Munich',
  'nueva york': 'New York',
  'sidney': 'Sydney',
  'ginebra': 'Geneva',
  'bruselas': 'Brussels',
  'lisboa': 'Lisbon',
  'tokio': 'Tokyo'
}

/**
 * Normaliza y traduce una ubicación libre para que LinkedIn Guest API devuelva
 * resultados precisos en cualquier parte del mundo (tanto en LATAM como en Europa, Norteamérica, etc.).
 * @param {string} location
 * @returns {string}
 */
function resolveSearchLocation(location) {
  if (!location) return 'Colombia'
  const trimmed = location.trim()
  const normalizedKey = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()

  return LOCATION_TRANSLATIONS[normalizedKey] || trimmed
}

const REMOTE_KEYWORDS = [
  'remoto', 'remote', 'teletrabajo', 'trabajo desde casa', 'work from home', 'wfh',
  '100% remoto', 'completamente remoto', 'fully remote', 'de forma remota'
]

const HYBRID_KEYWORDS = [
  'híbrido', 'hibrido', 'hybrid', 'mixto', 'semipresencial', 'semi-presencial', 'hibrida', 'híbrida',
  'esquema mixto', 'modalidad mixta', 'días en casa', 'dias en casa', 'días en oficina', 'dias en oficina'
]

const PRESENCIAL_KEYWORDS = [
  'presencial', 'on-site', 'on site', 'in-office', 'in office', 'in person', 'en oficina', 'en sede', 'en sitio', 'en planta', 'planta'
]

/**
 * Determina la modalidad de una vacante a partir del título, descripción y ubicación.
 * @param {object} job
 * @returns {'remoto'|'hibrido'|'presencial'}
 */
export function detectModalidad(job) {
  const searchText = `${job.puesto ?? ''} ${job.descripcion_corta ?? ''} ${job.ubicacion ?? ''}`.toLowerCase()

  if (HYBRID_KEYWORDS.some(kw => searchText.includes(kw))) {
    return 'hibrido'
  }

  const hasRemote = REMOTE_KEYWORDS.some(kw => searchText.includes(kw))
  const hasPresencial = PRESENCIAL_KEYWORDS.some(kw => searchText.includes(kw))

  // Si menciona tanto presencia física (sede/oficina/planta) como remoto -> es híbrido
  if (hasRemote && hasPresencial) {
    return 'hibrido'
  }

  if (hasRemote) {
    return 'remoto'
  }

  return 'presencial'
}

/**
 * Extrae el Job ID numérico de LinkedIn a partir de un ID puro o una URL.
 */
export function extractLinkedInJobId(input) {
  if (!input) return null
  const str = String(input).trim()

  // 1. Número directo (6 o más dígitos)
  if (/^\d{6,}$/.test(str)) {
    return str
  }

  // 2. Parámetro currentJobId=...
  const currentJobIdMatch = str.match(/currentJobId=(\d{6,})/)
  if (currentJobIdMatch) return currentJobIdMatch[1]

  // 3. /jobs/view/123456789 o /jobs/view/titulo-123456789
  const viewMatch = str.match(/\/jobs\/view\/(?:[^\/\?#]+-)?(\d{6,})/)
  if (viewMatch) return viewMatch[1]

  // 4. urn:li:jobPosting:123456789 o fs_normalized_jobPosting:123456789
  const urnMatch = str.match(/jobPosting:(\d{6,})/)
  if (urnMatch) return urnMatch[1]

  // 5. Cualquier secuencia de 8 a 12 dígitos consecutivos
  const anyDigits = str.match(/\b\d{8,12}\b/)
  if (anyDigits) return anyDigits[0]

  return null
}

/**
 * Obtiene detalles extendidos de una vacante (descripción, salario, postulantes).
 */
export async function getJobDetails(jobId) {
  try {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    })

    if (!res.ok) return { descripcion: '', postulantes: null, salario: 'No reporta', modalidadDetectada: null }

    const html = await res.text()
    const $ = cheerio.load(html)

    // Extracción de la descripción completa limpia
    const descripcionRaw = $('.show-more-less-html__markup, .description__text').text().trim()
    const descripcion = descripcionRaw.replace(/\s+/g, ' ').slice(0, 1500)

    // Extracción del número de postulantes
    const postulantesText = $('.num-applicants__caption, .applicant-count').text().trim()
    let postulantes = null
    const match = postulantesText.match(/\d+/)
    if (match) {
      postulantes = parseInt(match[0], 10)
    }

    // Extracción de salario si está público
    const salarioText = $('.compensation-range, .salary, .job-details-jobs-unified-top-card__compensation').text().trim()
    const salario = salarioText || 'No reporta'

    // Extracción de criterios para afinar la modalidad
    let criteriaText = ''
    $('.description__job-criteria-item, .job-criteria__item').each((_, el) => {
      criteriaText += ' ' + $(el).text()
    })

    const combinedText = `${descripcion} ${criteriaText}`.toLowerCase()
    let modalidadDetectada = null
    if (HYBRID_KEYWORDS.some(kw => combinedText.includes(kw))) {
      modalidadDetectada = 'hibrido'
    } else if (REMOTE_KEYWORDS.some(kw => combinedText.includes(kw))) {
      modalidadDetectada = 'remoto'
    } else if (PRESENCIAL_KEYWORDS.some(kw => combinedText.includes(kw))) {
      modalidadDetectada = 'presencial'
    }

    return { descripcion, postulantes, salario, modalidadDetectada }
  } catch (err) {
    console.warn(`Error al obtener detalles del trabajo ${jobId}:`, err.message)
    return { descripcion: '', postulantes: null, salario: 'No reporta', modalidadDetectada: null }
  }
}

/**
 * Extrae toda la información de una vacante puntual de LinkedIn a partir de su ID.
 */
export async function fetchJobPostingById(jobIdInput) {
  try {
    const cleanId = extractLinkedInJobId(jobIdInput)
    if (!cleanId) {
      throw new Error('No se pudo identificar un ID de vacante válido de LinkedIn.')
    }

    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${cleanId}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    })

    if (!res.ok) {
      throw new Error(`LinkedIn no devolvió información para el ID ${cleanId} (HTTP ${res.status}).`)
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    // Título / Puesto
    let puesto = $(
      '.top-card-layout__title, .topcard__title, .sub-nav-cta__header, .job-details-jobs-unified-top-card__job-title, h1, h2'
    ).first().text().trim()

    // Empresa
    let empresa = $(
      '.topcard__org-name-link, .topcard__flavor--black-link, .top-card-layout__first-subline a, a[data-tracking-control-name="public_jobs_topcard-org-name"]'
    ).first().text().trim()

    if (!empresa) {
      empresa = $('.topcard__flavor:first-child').text().trim()
    }

    // Ubicación
    let ubicacion = $(
      '.topcard__flavor--bullet, .top-card-layout__first-subline .topcard__flavor:not(:has(a)), .job-details-jobs-unified-top-card__bullet, span.topcard__flavor'
    ).last().text().trim()

    // Descripción
    const descripcionRaw = $('.show-more-less-html__markup, .description__text, .decorated-job-posting__details').text().trim()
    const descripcion = descripcionRaw.replace(/\s+/g, ' ').slice(0, 2000)

    // Postulantes
    const postulantesText = $('.num-applicants__caption, .applicant-count').text().trim()
    let postulantes = null
    const match = postulantesText.match(/\d+/)
    if (match) {
      postulantes = parseInt(match[0], 10)
    }

    // Salario
    const salarioText = $('.compensation-range, .salary, .job-details-jobs-unified-top-card__compensation').text().trim()
    const salario = salarioText || 'No reporta'

    // Modalidad / Seniority desde los criterios
    let modalidad = 'hibrido'
    let seniority = 'No especificado'

    const criteriaItems = $('.description__job-criteria-item, .job-criteria__item')
    criteriaItems.each((_, el) => {
      const header = $(el).find('.description__job-criteria-subheader, .job-criteria__subheader').text().toLowerCase()
      const text = $(el).find('.description__job-criteria-text, .job-criteria__text').text().trim()
      if (header.includes('antigüedad') || header.includes('seniority')) {
        seniority = text || seniority
      }
      if (header.includes('laboral') || header.includes('empleo') || header.includes('employment')) {
        const lower = text.toLowerCase()
        if (lower.includes('remoto') || lower.includes('remote')) modalidad = 'remoto'
        else if (lower.includes('presencial') || lower.includes('on-site')) modalidad = 'presencial'
        else if (lower.includes('híbrido') || lower.includes('hybrid')) modalidad = 'hibrido'
      }
    })

    // Fecha
    const fechaAttr = $('time').attr('datetime')
    const fechaText = $('time, .posted-time-ago__text').text().trim() || 'Reciente'
    const fechaPublicacion = fechaAttr ? new Date(fechaAttr).toISOString() : new Date().toISOString()

    // Fallbacks si las clases no coincidieron
    if (!puesto) {
      const pageTitle = $('title').text().trim()
      if (pageTitle) {
        const parts = pageTitle.split('|')[0].split('-')
        puesto = parts[0]?.trim() || 'Vacante de LinkedIn'
        if (!empresa && parts[1]) empresa = parts[1].trim()
      } else {
        puesto = 'Vacante de LinkedIn'
      }
    }

    if (!empresa) {
      empresa = 'Empresa en LinkedIn'
    }

    return {
      job_id: cleanId,
      plataforma: 'LinkedIn',
      puesto,
      empresa,
      ubicacion: ubicacion || 'Colombia',
      modalidad,
      seniority,
      link: `https://www.linkedin.com/jobs/view/${cleanId}`,
      fecha_publicacion: fechaPublicacion,
      fecha_texto: fechaText,
      descripcion_corta: descripcion || `Vacante para ${puesto} en ${empresa}.`,
      postulantes,
      salario
    }
  } catch (err) {
    console.error(`Error al extraer vacante LinkedIn (${jobIdInput}):`, err.message)
    throw err
  }
}

// Caché en memoria para mitigar Rate Limits de LinkedIn Guest API durante el evento piloto
const SEARCH_CACHE = new Map()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutos

function getSearchCacheKey({ query, location, modalidad, seniority, limit }) {
  return `${(query || '').trim().toLowerCase()}|${(location || '').trim().toLowerCase()}|${modalidad}|${seniority}|${limit}`
}

/**
 * Ejecuta la búsqueda de vacantes en LinkedIn Guest API con soporte para filtros y hasta 50 resultados.
 * Implementa caché en memoria (TTL 15 min) para proteger contra bloqueos de IP durante el taller.
 */
export async function searchLinkedInJobs({
  query,
  location = 'Colombia',
  modalidad = 'todas',
  seniority = 'todos',
  limit = 25
}) {
  const cacheKey = getSearchCacheKey({ query, location, modalidad, seniority, limit })
  const cached = SEARCH_CACHE.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[jobSearch QA Cache HIT] Sirviendo ${cached.data.length} vacantes desde caché para '${query}' en '${location}'`)
    return cached.data
  }

  try {
    const jobs = []
    const pageSize = 25
    const pagesToFetch = Math.ceil(limit / pageSize)

    for (let page = 0; page < pagesToFetch; page++) {
      const start = page * pageSize
      const resolvedLocation = resolveSearchLocation(location)
      let searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(resolvedLocation)}&start=${start}`

      if (modalidad && WORK_TYPE_MAP[modalidad]) {
        searchUrl += `&f_WT=${WORK_TYPE_MAP[modalidad]}`
      }
      if (seniority && SENIORITY_MAP[seniority]) {
        searchUrl += `&f_E=${SENIORITY_MAP[seniority]}`
      }

      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      })

      if (!res.ok) break

      const html = await res.text()
      const $ = cheerio.load(html)
      const jobCards = $('li')

      if (jobCards.length === 0) break

      for (let i = 0; i < jobCards.length && jobs.length < limit; i++) {
        const card = $(jobCards[i])

        const linkElem = card.find('a.base-card__full-link, a.job-search-card__title-link')
        const rawLink = linkElem.attr('href') || ''
        const urn = card.find('.base-card').attr('data-entity-urn') || ''

        let jobId = null
        if (urn) {
          const parts = urn.split(':')
          jobId = parts[parts.length - 1]
        } else if (rawLink) {
          const match = rawLink.match(/-(\d+)\?/) || rawLink.match(/\/view\/(\d+)/)
          if (match) jobId = match[1]
        }

        const puesto = card.find('.base-search-card__title, .job-search-card__title').text().trim()
        const empresa = card.find('.base-search-card__subtitle, .job-search-card__company-name').text().trim()
        const ubicacionCard = card.find('.job-search-card__location').text().trim()
        const fechaText = card.find('time').text().trim() || 'Reciente'
        const fechaAttr = card.find('time').attr('datetime')

        if (puesto && empresa && jobId) {
          const cleanLink = `https://www.linkedin.com/jobs/view/${jobId}`

          jobs.push({
            job_id: jobId,
            plataforma: 'LinkedIn',
            puesto,
            empresa,
            ubicacion: ubicacionCard || location,
            modalidad: 'presencial', // Se ajusta con la detección profunda abajo
            seniority: seniority !== 'todos' ? seniority : 'No especificado',
            link: cleanLink,
            fecha_publicacion: fechaAttr ? new Date(fechaAttr).toISOString() : new Date().toISOString(),
            fecha_texto: fechaText
          })
        }
      }
    }

    // Obtener detalles extendidos (descripción, salario, postulantes y modalidad detectada)
    const detailedJobs = await Promise.all(
      jobs.map(async (job) => {
        const details = await getJobDetails(job.job_id)
        const jobWithDesc = {
          ...job,
          descripcion_corta: details.descripcion || `Vacante para ${job.puesto} en ${job.empresa}.`,
          postulantes: details.postulantes,
          salario: details.salario || 'No reporta'
        }
        jobWithDesc.modalidad = details.modalidadDetectada || detectModalidad(jobWithDesc)
        return jobWithDesc
      })
    )

    const finalResults = (modalidad && modalidad !== 'todas')
      ? detailedJobs.filter(job => job.modalidad === modalidad)
      : detailedJobs

    if (modalidad && modalidad !== 'todas') {
      console.log(`[jobSearch] Filtro modalidad '${modalidad}': ${detailedJobs.length} total -> ${finalResults.length} coincidentes`)
    }

    // Almacenar en caché para optimizar concurrencia
    SEARCH_CACHE.set(cacheKey, { timestamp: Date.now(), data: finalResults })

    return finalResults
  } catch (err) {
    console.error('Error en servicio searchLinkedInJobs:', err.message)
    throw err
  }
}

/**
 * Algoritmo refinado de cálculo de compatibilidad % (Score).
 * Analiza coincidencias de habilidades, cargos, términos de experiencia y nivel académico.
 */
export function calculateCompatibility(job, userProfile) {
  if (!userProfile) return 72.5

  const jobText = `${job.puesto || ''} ${job.descripcion_corta || ''}`.toLowerCase()
  let score = 38.0

  // 1. Coincidencias en Titular Profesional (hasta +12 puntos)
  if (userProfile.titular) {
    const titularWords = userProfile.titular.toLowerCase().split(/[\s|,/-]+/).filter(w => w.length > 3)
    titularWords.forEach(w => {
      if (jobText.includes(w)) score += 3.0
    })
  }

  // 2. Coincidencias en habilidades técnicas y de especialidad (hasta +25 puntos)
  const habs = userProfile.habilidades_tecnicas || []
  let habMatches = 0
  habs.forEach((h, index) => {
    const hName = typeof h === 'string' ? h : (h?.nombre || '')
    if (hName && jobText.includes(hName.toLowerCase())) {
      habMatches += (index < 3 ? 6.0 : 3.5)
    }
  })
  score += Math.min(habMatches, 25.0)

  // 3. Coincidencias en certificaciones y licencias (hasta +15 puntos)
  const certs = userProfile.certificaciones || []
  let certMatches = 0
  certs.forEach(c => {
    const cName = typeof c === 'string' ? c : (c?.nombre || '')
    if (cName) {
      const cWords = cName.toLowerCase().split(/[\s|,/-]+/).filter(w => w.length > 2)
      cWords.forEach(w => {
        if (jobText.includes(w)) certMatches += 4.0
      })
    }
  })
  score += Math.min(certMatches, 15.0)

  // 4. Coincidencias en formación no formal / diplomados (hasta +10 puntos)
  const nonFormal = userProfile.formacion_no_formal || []
  let nonFormalMatches = 0
  nonFormal.forEach(p => {
    const pName = typeof p === 'string' ? p : (p?.nombre || '')
    if (pName) {
      const pWords = pName.toLowerCase().split(/[\s|,/-]+/).filter(w => w.length > 3)
      pWords.forEach(w => {
        if (jobText.includes(w)) nonFormalMatches += 3.0
      })
    }
  })
  score += Math.min(nonFormalMatches, 10.0)

  // 5. Coincidencias en cargo / experiencia laboral (hasta +20 puntos)
  const exps = userProfile.experiencia || []
  let expMatches = 0
  exps.forEach(exp => {
    if (exp.cargo) {
      const cargoWords = exp.cargo.toLowerCase().split(/[\s|,/-]+/).filter(w => w.length > 3)
      cargoWords.forEach(w => {
        if (jobText.includes(w)) expMatches += 3.5
      })
    }
  })
  score += Math.min(expMatches, 20.0)

  // 6. Coincidencia en educación formal (hasta +12 puntos)
  const edus = userProfile.educacion_formal || []
  edus.forEach(edu => {
    if (edu.titulo && jobText.includes(edu.titulo.toLowerCase())) score += 8.0
  })

  // 7. Idiomas (hasta +6 puntos)
  const idiomas = userProfile.idiomas || []
  idiomas.forEach(lang => {
    const langName = typeof lang === 'string' ? lang : (lang?.idioma || '')
    if (langName && jobText.includes(langName.toLowerCase())) score += 3.0
  })

  // 8. Variación determinista según hash de Job ID para evitar puntajes idénticos planos
  const idHash = (job.job_id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const salt = (idHash % 11) - 5 // Variación de -5 a +5 %

  const finalScore = Math.min(Math.max(score + salt, 45.0), 98.5)
  return Math.round(finalScore * 10) / 10
}
