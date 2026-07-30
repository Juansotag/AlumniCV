/**
 * AlumniCV — Generador del PDF de assessment de CV.
 * Versión simple sin branding (AlumniCV aún no tiene assets de identidad visual
 * propios; cuando existan, seguir el patrón de docgen.js de Germina para agregarlos).
 */
import PDFDocument from 'pdfkit'

const BLUE = '#00135B'
const MUTED = '#64748B'
const BODY = '#374151'

function section(doc, titulo) {
  doc.moveDown(1)
  doc.fillColor(BLUE).fontSize(14).font('Helvetica-Bold').text(titulo)
  doc.moveDown(0.3)
  doc.fillColor(BODY).font('Helvetica').fontSize(11)
}

function numberedList(doc, items) {
  items.forEach((item, i) => {
    doc.text(`${i + 1}. ${item}`, { paragraphGap: 4 })
  })
}

function bulletList(doc, items) {
  items.forEach((item) => {
    doc.text(`•  ${item}`, { paragraphGap: 4 })
  })
}

/**
 * @param {object} opts
 * @param {string} opts.nombre — nombre del usuario
 * @param {object} opts.respuesta — JSON del assessment (ver llm/cvAssessment.js)
 * @returns {Promise<Buffer>}
 */
export function generarAssessmentPdf({ nombre, respuesta }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

    doc.fillColor(BLUE).fontSize(22).font('Helvetica-Bold').text('AlumniCV — Análisis de CV')
    doc.moveDown(0.2)
    doc.fillColor(MUTED).fontSize(10).font('Helvetica')
      .text(`${nombre ? nombre + ' · ' : ''}${fecha}`)

    section(doc, `1. Calificación: ${respuesta.calificacion?.score ?? '—'} / 10`)
    bulletList(doc, respuesta.calificacion?.como_llegar_a_10 ?? [])

    section(doc, '2. Los 20 puestos donde mejor encajas')
    numberedList(doc, respuesta.top_puestos ?? [])

    section(doc, '3. Palabras clave ATS a reforzar')
    bulletList(doc, respuesta.palabras_clave_ats ?? [])

    section(doc, '4. Debilidades notables en menos de 10 segundos')
    bulletList(doc, respuesta.debilidades ?? [])

    doc.end()
  })
}
