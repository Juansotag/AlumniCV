import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle
} from 'docx'

/**
 * Genera un buffer de archivo .docx con el formato ejecutivo oficial de GovLab / UniSabana,
 * replicando exactamente la estructura tipográfica, márgenes y líneas divisorias
 * de la hoja de vida ejecutiva (ej. Juan Diego Sotelo Aguilar).
 */
export async function generateCvDocx(profile, applicationData, llmCvContent) {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 in
              bottom: 720,
              left: 1080,  // 0.75 in
              right: 1080
            }
          }
        },
        children: [
          // ── 1. Nombre Completo ─────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: profile.nombre || 'Juan Diego Sotelo Aguilar',
                bold: true,
                size: 32, // 16pt
                font: 'Arial',
                color: '00135B'
              })
            ],
            spacing: { after: 60 }
          }),

          // ── Subtítulo de Posición ──────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: applicationData.puesto || profile.resumen?.split('.')[0] || 'Profesional / Especialista',
                bold: true,
                size: 24, // 12pt
                font: 'Arial',
                color: '374151'
              })
            ],
            spacing: { after: 100 }
          }),

          // ── Línea de Contacto Institucional ───────────────────────
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: 'Bogotá / Cundinamarca, Colombia', size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: '  |  ', bold: true, size: 19, font: 'Arial', color: '00135B' }),
              new TextRun({ text: profile.correo || 'usuario@unisabana.edu.co', size: 19, font: 'Arial', color: '475569' }),
              new TextRun({ text: '  |  ', bold: true, size: 19, font: 'Arial', color: '00135B' }),
              new TextRun({ text: 'LinkedIn', size: 19, font: 'Arial', color: '00387D', underline: {} })
            ],
            spacing: { after: 240 }
          }),

          // ── 2. PERFIL PROFESIONAL ──────────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: 'P E R F I L   P R O F E S I O N A L',
                bold: true,
                size: 21,
                font: 'Arial',
                color: '00135B'
              })
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
            spacing: { before: 180, after: 120 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: llmCvContent.resumen_adaptado || profile.resumen || '',
                size: 20,
                font: 'Arial',
                color: '1F2937'
              })
            ],
            spacing: { after: 240 }
          }),

          // ── 3. EXPERIENCIA PROFESIONAL ─────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: 'E X P E R I E N C I A   P R O F E S I O N A L',
                bold: true,
                size: 21,
                font: 'Arial',
                color: '00135B'
              })
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
            spacing: { before: 200, after: 120 }
          }),
          ...(llmCvContent.experiencia_adaptada || profile.experiencia || []).map(exp => [
            new Paragraph({
              children: [
                new TextRun({ text: exp.cargo || 'Cargo Profesional', bold: true, size: 21, font: 'Arial', color: '00135B' }),
                new TextRun({ text: `  |  ${exp.empresa || 'Empresa'}`, bold: true, size: 21, font: 'Arial', color: '475569' }),
                new TextRun({ text: `\t${exp.desde || '2023'} a ${exp.hasta || 'Presente'}`, italic: true, size: 19, font: 'Arial', color: '64748B' })
              ],
              spacing: { before: 100, after: 60 }
            }),
            ...( (exp.descripcion || exp.logros || '').split('\n').filter(Boolean).map(bullet => (
              new Paragraph({
                bullet: { level: 0 },
                children: [
                  new TextRun({ text: bullet.replace(/^[•\-*]\s*/, ''), size: 19, font: 'Arial', color: '374151' })
                ],
                spacing: { after: 40 }
              })
            )))
          ]).flat(),

          // ── 4. EDUCACIÓN ───────────────────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: 'E D U C A C I Ó N',
                bold: true,
                size: 21,
                font: 'Arial',
                color: '00135B'
              })
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
            spacing: { before: 240, after: 120 }
          }),
          ...(profile.educacion_formal || []).map(edu => (
            new Paragraph({
              children: [
                new TextRun({ text: edu.titulo || 'Grado Académico', bold: true, size: 21, font: 'Arial', color: '1F2937' }),
                new TextRun({ text: `  |  ${edu.institucion || 'Universidad de La Sabana'}`, size: 20, font: 'Arial', color: '475569' }),
                new TextRun({ text: `\t${edu.desde || ''} a ${edu.hasta || '2024'}`, italic: true, size: 19, font: 'Arial', color: '64748B' })
              ],
              spacing: { after: 80 }
            })
          )),

          // ── 5. HABILIDADES TÉCNICAS ─────────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: 'H A B I L I D A D E S   T É C N I C A S',
                bold: true,
                size: 21,
                font: 'Arial',
                color: '00135B'
              })
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
            spacing: { before: 240, after: 120 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Habilidades Principales: ', bold: true, size: 20, font: 'Arial', color: '00135B' }),
              new TextRun({ text: ((profile.habilidades_tecnicas || []).map(h => h.nombre).join(', ') || 'Python, SQL, Power BI, Análitica de Datos'), size: 20, font: 'Arial', color: '374151' })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Habilidades Blandas: ', bold: true, size: 20, font: 'Arial', color: '00135B' }),
              new TextRun({ text: ((profile.habilidades_blandas || []).join(', ') || 'Liderazgo, Resolución de Problemas, Comunicación Ejecutiva'), size: 20, font: 'Arial', color: '374151' })
            ],
            spacing: { after: 200 }
          })
        ]
      }
    ]
  })

  return await Packer.toBuffer(doc)
}

/**
 * Genera el documento .docx para la Carta de Presentación.
 */
export async function generateCoverLetterDocx(profile, applicationData, coverLetterText) {
  const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } }
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: profile.nombre || 'Candidato UniSabana', bold: true, size: 26, font: 'Arial', color: '00135B' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${profile.correo || ''}  |  ${fechaHoy}`, size: 19, font: 'Arial', color: '64748B' })
            ],
            spacing: { after: 240 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Atención: Equipo de Selección de Personal', bold: true, size: 21, font: 'Arial', color: '1F2937' }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${applicationData.empresa || ''} — Vacante: ${applicationData.puesto || ''}`, bold: true, size: 21, font: 'Arial', color: '00387D' })
            ],
            spacing: { after: 240 }
          }),

          ...(coverLetterText.split('\n\n').map(p => (
            new Paragraph({
              children: [
                new TextRun({ text: p.trim(), size: 20, font: 'Arial', color: '374151' })
              ],
              spacing: { after: 180 }
            })
          ))),

          new Paragraph({ text: '', spacing: { before: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Atentamente,', size: 20, font: 'Arial', color: '374151' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: profile.nombre || 'Candidato', bold: true, size: 22, font: 'Arial', color: '00135B' })
            ]
          })
        ]
      }
    ]
  })

  return await Packer.toBuffer(doc)
}

/**
 * Genera el documento .docx para el borrador de Correo de Aplicación.
 */
export async function generateEmailDocx(profile, applicationData, emailData) {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } }
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'BORRADOR DE CORREO DE POSTULACIÓN', bold: true, size: 24, font: 'Arial', color: '00135B' })
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
            spacing: { after: 240 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Asunto: ', bold: true, size: 21, font: 'Arial', color: '00387D' }),
              new TextRun({ text: emailData.asunto || `Postulación a ${applicationData.puesto} - ${profile.nombre}`, size: 21, font: 'Arial', bold: true, color: '1F2937' })
            ],
            spacing: { after: 200 }
          }),

          ...( (emailData.cuerpo || '').split('\n\n').map(p => (
            new Paragraph({
              children: [
                new TextRun({ text: p.trim(), size: 20, font: 'Arial', color: '374151' })
              ],
              spacing: { after: 180 }
            })
          )))
        ]
      }
    ]
  })

  return await Packer.toBuffer(doc)
}
