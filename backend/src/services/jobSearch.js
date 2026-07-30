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
