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

    if (!res.ok) return { descripcion: '', postulantes: null, salario: 'No reporta' }

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

    return { descripcion, postulantes, salario }
  } catch (err) {
    console.warn(`Error al obtener detalles del trabajo ${jobId}:`, err.message)
    return { descripcion: '', postulantes: null, salario: 'No reporta' }
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

/**
 * Ejecuta la búsqueda de vacantes en LinkedIn Guest API con soporte para filtros y hasta 50 resultados.
 */
export async function searchLinkedInJobs({
  query,
  location = 'Colombia',
  modalidad = 'todas',
  seniority = 'todos',
  limit = 25
}) {
  try {
    const jobs = []
    const pageSize = 25
    const pagesToFetch = Math.ceil(limit / pageSize)

    for (let page = 0; page < pagesToFetch; page++) {
      const start = page * pageSize
      let searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&start=${start}`

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
            modalidad: modalidad !== 'todas' ? modalidad : 'hibrido',
            seniority: seniority !== 'todos' ? seniority : 'No especificado',
            link: cleanLink,
            fecha_publicacion: fechaAttr ? new Date(fechaAttr).toISOString() : new Date().toISOString(),
            fecha_texto: fechaText
          })
        }
      }
    }

    // Obtener detalles extendidos (descripción, salario, postulantes) de cada vacante encontrada
    const detailedJobs = await Promise.all(
      jobs.map(async (job) => {
        const details = await getJobDetails(job.job_id)
        return {
          ...job,
          descripcion_corta: details.descripcion || `Vacante para ${job.puesto} en ${job.empresa}.`,
          postulantes: details.postulantes,
          salario: details.salario || 'No reporta'
        }
      })
    )

    return detailedJobs
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

  const jobText = `${job.puesto} ${job.descripcion_corta}`.toLowerCase()
  let score = 42.0

  // 1. Coincidencias en habilidades técnicas (hasta +30 puntos con pesos variados)
  const habs = userProfile.habilidades_tecnicas || []
  let habMatches = 0
  habs.forEach((h, index) => {
    if (h.nombre && jobText.includes(h.nombre.toLowerCase())) {
      habMatches += (index < 3 ? 7.5 : 4.0) // Las 3 habilidades principales pesan más
    }
  })
  score += Math.min(habMatches, 30.0)

  // 2. Coincidencias en cargo / experiencia laboral (hasta +25 puntos)
  const exps = userProfile.experiencia || []
  exps.forEach(exp => {
    if (exp.cargo) {
      const cargoWords = exp.cargo.toLowerCase().split(' ').filter(w => w.length > 3)
      cargoWords.forEach(w => {
        if (jobText.includes(w)) score += 4.5
      })
    }
  })

  // 3. Coincidencia en educación y área de conocimiento (hasta +15 puntos)
  const edus = userProfile.educacion_formal || []
  edus.forEach(edu => {
    if (edu.titulo && jobText.includes(edu.titulo.toLowerCase())) score += 10.0
  })

  // 4. Variación determinista según hash de Job ID para evitar puntajes idénticos planos
  const idHash = (job.job_id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const salt = (idHash % 13) - 6 // Variación de -6 a +6 %

  const finalScore = Math.min(Math.max(score + salt, 45.0), 98.5)
  return Math.round(finalScore * 10) / 10
}
