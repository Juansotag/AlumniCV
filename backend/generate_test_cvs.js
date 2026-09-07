import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

const OUT_DIR = path.resolve('../test_cvs')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

// 1. CV de 7 páginas (Para probar el aviso de las 5 páginas)
function generate7PagesCv() {
  return new Promise((resolve) => {
    const filePath = path.join(OUT_DIR, '1_prueba_aviso_7_paginas.pdf')
    const doc = new PDFDocument({ margin: 50 })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    for (let i = 1; i <= 7; i++) {
      if (i > 1) doc.addPage()
      doc.fontSize(20).fillColor('#1E3A8A').text(`CARLOS EDUARDO MARTÍNEZ - PÁGINA ${i}`, { underline: true })
      doc.moveDown()
      doc.fontSize(12).fillColor('#000000').text(`Esta es la página número ${i} de un currículum extenso de 7 páginas.`)
      doc.text(`Al subir este archivo a AlumniCV, el sistema debe procesar solo las primeras 5 páginas y mostrar una notificación informativa al usuario alertando que se tomaron las primeras 5 páginas para la optimización del análisis.`)
      doc.moveDown()
      doc.fontSize(14).text(`Sección ${i}: Proyectos e Investigaciones Académicas`)
      doc.fontSize(11).text('• Líder de proyecto en transformación digital y modernización de infraestructura.')
      doc.text('• Implementación de pipelines de datos y modelos predictivos para optimización logística.')
      doc.text('• Publicaciones y conferencias internacionales en el área de ingeniería de software.')
    }
    doc.end()
    stream.on('finish', () => {
      console.log(`[OK] Generado: ${filePath}`)
      resolve()
    })
  })
}

// 2. CV escaneado / Solo imagen (Para probar el mensaje de error instructivo)
function generateScannedImageCv() {
  return new Promise((resolve) => {
    const filePath = path.join(OUT_DIR, '2_prueba_error_escaneado_imagen.pdf')
    const doc = new PDFDocument({ margin: 0 })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    // Dibujamos un "falso documento escaneado" con gráficos y líneas grises (0 texto seleccionable)
    doc.rect(40, 40, 520, 720).lineWidth(1).stroke('#999999')
    doc.rect(60, 60, 200, 30).fill('#CCCCCC')
    doc.rect(60, 110, 480, 8).fill('#E5E7EB')
    doc.rect(60, 125, 450, 8).fill('#E5E7EB')
    doc.rect(60, 140, 400, 8).fill('#E5E7EB')
    doc.rect(60, 180, 150, 20).fill('#D1D5DB')
    doc.rect(60, 220, 480, 8).fill('#E5E7EB')
    doc.rect(60, 235, 460, 8).fill('#E5E7EB')
    doc.circle(500, 85, 30).fill('#9CA3AF')

    doc.end()
    stream.on('finish', () => {
      console.log(`[OK] Generado: ${filePath}`)
      resolve()
    })
  })
}

// 3. CV en inglés con diseño moderno (Para probar lectura en inglés y respuesta en español)
function generateEnglishModernCv() {
  return new Promise((resolve) => {
    const filePath = path.join(OUT_DIR, '3_prueba_cv_ingles_moderno.pdf')
    const doc = new PDFDocument({ margin: 50 })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    doc.fontSize(22).fillColor('#0F172A').text('SARAH CONNOR')
    doc.fontSize(14).fillColor('#2563EB').text('Senior Full-Stack Engineer & Cloud Architect')
    doc.moveDown()
    doc.fontSize(10).fillColor('#475569').text('Location: Medellín, Colombia | Email: sarah.connor@tech.co | LinkedIn: linkedin.com/in/sarahc')
    doc.moveDown()

    doc.fontSize(14).fillColor('#0F172A').text('PROFESSIONAL SUMMARY', { underline: true })
    doc.fontSize(10).fillColor('#334155').text('Results-driven software engineer with 6+ years of experience designing microservices, REST APIs, and modern frontend web applications using React, Node.js, and PostgreSQL.')
    doc.moveDown()

    doc.fontSize(14).fillColor('#0F172A').text('WORK EXPERIENCE', { underline: true })
    doc.fontSize(12).fillColor('#1E293B').text('Tech Lead - Cyberdyne Solutions (2022 - Present)')
    doc.fontSize(10).fillColor('#475569').text('• Led a distributed team of 8 engineers building cloud-native analytics platforms.')
    doc.text('• Improved system throughput by 40% through Redis caching and query optimization.')
    doc.moveDown(0.5)

    doc.fontSize(12).fillColor('#1E293B').text('Full Stack Developer - Skynet Corp (2019 - 2022)')
    doc.fontSize(10).fillColor('#475569').text('• Developed responsive web applications using React and Tailwind CSS.')
    doc.text('• Implemented automated CI/CD deployment pipelines on AWS.')
    doc.moveDown()

    doc.fontSize(14).fillColor('#0F172A').text('SKILLS', { underline: true })
    doc.fontSize(10).fillColor('#334155').text('Languages: JavaScript, TypeScript, Python, SQL, C++')
    doc.text('Frameworks & Tools: React, Next.js, Node.js, Express, Docker, AWS, Git')

    doc.end()
    stream.on('finish', () => {
      console.log(`[OK] Generado: ${filePath}`)
      resolve()
    })
  })
}

async function main() {
  console.log('Generando archivos PDF listos para pruebas de QA en:', OUT_DIR)
  await generate7PagesCv()
  await generateScannedImageCv()
  await generateEnglishModernCv()
  console.log('\n[OK] Archivos de prueba generados exitosamente.')
}

main()
