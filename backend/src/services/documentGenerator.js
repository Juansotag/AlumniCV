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
 * integrando el 100% de los campos del Perfil Maestro (titular adaptado, datos de contacto,
 * modalidad laboral, educación formal, certificaciones, diplomados, habilidades curadas e idiomas).
 */
export async function generateCvDocx(profile, applicationData, llmCvContent) {
  const safeLlmCv = llmCvContent && typeof llmCvContent === 'object' ? llmCvContent : {}
  const candidateName = profile.nombre || 'Candidato UniSabana'
  const headline = safeLlmCv.titular_adaptado || profile.titular || applicationData.puesto || 'Profesional Especialista'

  // Consolidar experiencias: usar las adaptadas del LLM y añadir las del perfil que falten
  const llmExps = Array.isArray(safeLlmCv.experiencia_adaptada) ? safeLlmCv.experiencia_adaptada : []
  const profileExps = Array.isArray(profile.experiencia) ? profile.experiencia : []
  const exps = []

  if (llmExps.length > 0) {
    for (const lExp of llmExps) {
      if (lExp && (lExp.cargo || lExp.empresa)) {
        exps.push(lExp)
      }
    }
    for (const pExp of profileExps) {
      const alreadyIncluded = exps.some(e =>
        (e.empresa && pExp.empresa && e.empresa.toLowerCase().trim() === pExp.empresa.toLowerCase().trim()) &&
        (e.cargo && pExp.cargo && e.cargo.toLowerCase().trim() === pExp.cargo.toLowerCase().trim())
      )
      if (!alreadyIncluded) {
        exps.push(pExp)
      }
    }
  } else {
    exps.push(...profileExps)
  }

  // Consolidar educación formal: usar las adaptadas del LLM y añadir las del perfil que falten
  const llmEdus = Array.isArray(safeLlmCv.educacion_adaptada) ? safeLlmCv.educacion_adaptada : []
  const profileEdus = Array.isArray(profile.educacion_formal) ? profile.educacion_formal : []
  const edus = []

  if (llmEdus.length > 0) {
    for (const lEdu of llmEdus) {
      if (lEdu && (lEdu.titulo || lEdu.institucion)) {
        edus.push(lEdu)
      }
    }
    for (const pEdu of profileEdus) {
      const alreadyIncluded = edus.some(e =>
        e.titulo && pEdu.titulo && e.titulo.toLowerCase().trim() === pEdu.titulo.toLowerCase().trim()
      )
      if (!alreadyIncluded) {
        edus.push(pEdu)
      }
    }
  } else {
    edus.push(...profileEdus)
  }

  // Lista de certificaciones
  const certs = Array.isArray(safeLlmCv.certificaciones_destacadas) && safeLlmCv.certificaciones_destacadas.length > 0
    ? safeLlmCv.certificaciones_destacadas
    : (Array.isArray(profile.certificaciones) ? profile.certificaciones : [])

  // Lista de formación no formal / diplomados
  const nonFormal = Array.isArray(safeLlmCv.formacion_no_formal_destacada) && safeLlmCv.formacion_no_formal_destacada.length > 0
    ? safeLlmCv.formacion_no_formal_destacada
    : (Array.isArray(profile.formacion_no_formal) ? profile.formacion_no_formal : [])

  // Idiomas
  const idiomas = Array.isArray(safeLlmCv.idiomas_destacados) && safeLlmCv.idiomas_destacados.length > 0
    ? safeLlmCv.idiomas_destacados
    : (Array.isArray(profile.idiomas) ? profile.idiomas : [])

  // Habilidades técnicas curadas
  const rawTech = Array.isArray(safeLlmCv.habilidades_tecnicas_destacadas) && safeLlmCv.habilidades_tecnicas_destacadas.length > 0
    ? safeLlmCv.habilidades_tecnicas_destacadas
    : (Array.isArray(profile.habilidades_tecnicas) ? profile.habilidades_tecnicas : [])
  const techSkillsText = rawTech
    .map(h => typeof h === 'string' ? h : (h?.nombre || h?.habilidad || ''))
    .filter(Boolean)
    .join(', ')

  // Habilidades blandas curadas
  const rawSoft = Array.isArray(safeLlmCv.habilidades_blandas_destacadas) && safeLlmCv.habilidades_blandas_destacadas.length > 0
    ? safeLlmCv.habilidades_blandas_destacadas
    : (Array.isArray(profile.habilidades_blandas) ? profile.habilidades_blandas : [])
  const softSkillsText = rawSoft
    .map(h => typeof h === 'string' ? h : (h?.nombre || String(h || '')))
    .filter(Boolean)
    .join(', ')

  const docChildren = [
    // ── 1. Nombre Completo ─────────────────────────────────────
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: candidateName,
          bold: true,
          size: 32, // 16pt
          font: 'Arial',
          color: '00135B'
        })
      ],
      spacing: { after: 60 }
    }),

    // ── Subtítulo de Posición / Titular Adaptado ───────────────
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: headline,
          bold: true,
          size: 24, // 12pt
          font: 'Arial',
          color: '374151'
        })
      ],
      spacing: { after: 100 }
    }),

    // ── Línea de Contacto Dinámica y Unificada ─────────────────
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: (() => {
        const items = []
        items.push(new TextRun({ text: profile.ubicacion || 'Bogotá, Colombia', size: 19, font: 'Arial', color: '475569' }))

        if (profile.telefono) {
          items.push(new TextRun({ text: '  |  ', bold: true, size: 19, font: 'Arial', color: '00135B' }))
          items.push(new TextRun({ text: profile.telefono, size: 19, font: 'Arial', color: '475569' }))
        }

        const emails = [profile.correo, profile.correo_personal].filter(Boolean)
        if (emails.length > 0) {
          items.push(new TextRun({ text: '  |  ', bold: true, size: 19, font: 'Arial', color: '00135B' }))
          items.push(new TextRun({ text: emails.join(' / '), size: 19, font: 'Arial', color: '475569' }))
        }

        const linksList = Array.isArray(profile.links)
          ? profile.links
          : (profile.links && typeof profile.links === 'object'
              ? Object.entries(profile.links).map(([k, v]) => ({ red: k, url: v }))
              : [])

        for (const l of linksList) {
          if (l && (l.url || typeof l === 'string')) {
            const urlVal = l.url || l
            const label = l.red || 'Enlace Profesional'
            items.push(new TextRun({ text: '  |  ', bold: true, size: 19, font: 'Arial', color: '00135B' }))
            items.push(new TextRun({ text: label, size: 19, font: 'Arial', color: '00387D', underline: {} }))
          }
        }
        return items
      })(),
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
          text: safeLlmCv.resumen_adaptado || profile.resumen || '',
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
    ...exps.map(exp => {
      let rawBullets = []
      if (Array.isArray(exp.logros) && exp.logros.length > 0) {
        rawBullets = exp.logros
      } else if (Array.isArray(exp.descripcion) && exp.descripcion.length > 0) {
        rawBullets = exp.descripcion
      } else if (typeof exp.logros === 'string' && exp.logros.trim()) {
        rawBullets = exp.logros.split(/\n+|•|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/)
      } else if (typeof exp.descripcion === 'string' && exp.descripcion.trim()) {
        rawBullets = exp.descripcion.split(/\n+|•|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/)
      }

      let cleanBullets = rawBullets
        .map(b => String(b).replace(/^[•\-*]\s*/, '').trim())
        .filter(b => b.length > 8)

      if (cleanBullets.length === 1 && cleanBullets[0].length > 80) {
        const sentenceSplit = cleanBullets[0].split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/).filter(s => s.trim().length > 10)
        if (sentenceSplit.length > 1) {
          cleanBullets = sentenceSplit
        }
      }

      const modalidadTag = exp.modalidad ? `  [${exp.modalidad}]` : ''
      const hastaText = (!exp.hasta || exp.hasta === 'null') ? 'Presente' : exp.hasta
      const desdeText = exp.desde || '2022'

      return [
        new Paragraph({
          children: [
            new TextRun({ text: exp.cargo || 'Cargo Profesional', bold: true, size: 22, font: 'Arial', color: '00135B' }),
            new TextRun({ text: `  |  ${exp.empresa || 'Empresa'}${modalidadTag}`, bold: true, size: 21, font: 'Arial', color: '475569' }),
            new TextRun({ text: `\t${desdeText} a ${hastaText}`, italic: true, size: 20, font: 'Arial', color: '64748B' })
          ],
          spacing: { before: 160, after: 60 }
        }),
        ...cleanBullets.map(bullet => (
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: bullet, size: 21, font: 'Arial', color: '334155' })
            ],
            spacing: { after: 70, line: 276 }
          })
        ))
      ]
    }).flat(),

    // ── 4. EDUCACIÓN FORMAL ────────────────────────────────────
    new Paragraph({
      children: [
        new TextRun({
          text: 'E D U C A C I Ó N   F O R M A L',
          bold: true,
          size: 22,
          font: 'Arial',
          color: '00135B'
        })
      ],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
      spacing: { before: 260, after: 120 }
    }),
    ...edus.map(edu => {
      let datesText = edu.periodo
      if (!datesText) {
        const hastaVal = (!edu.hasta || edu.hasta === 'null') ? (edu.estado === 'en_curso' ? 'En curso' : '') : edu.hasta
        if (edu.desde && hastaVal) {
          datesText = `${edu.desde} a ${hastaVal}`
        } else if (edu.anio) {
          datesText = `${edu.anio}`
        } else if (hastaVal) {
          datesText = `${hastaVal}`
        }
      }
      const eduTitle = edu.titulo || 'Grado Académico'
      const eduInst = edu.institucion || 'Institución Universitaria'

      let rawDetails = []
      if (Array.isArray(edu.detalles) && edu.detalles.length > 0) {
        rawDetails = [...edu.detalles]
      } else if (Array.isArray(edu.logros) && edu.logros.length > 0) {
        rawDetails = [...edu.logros]
      } else if (typeof edu.logros === 'string' && edu.logros.trim()) {
        rawDetails = edu.logros.split(/\n+|•|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/)
      } else if (Array.isArray(edu.reconocimientos) && edu.reconocimientos.length > 0) {
        rawDetails = [...edu.reconocimientos]
      } else if (typeof edu.reconocimientos === 'string' && edu.reconocimientos.trim()) {
        rawDetails = edu.reconocimientos.split(/\n+|•|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/)
      } else if (typeof edu.descripcion === 'string' && edu.descripcion.trim()) {
        rawDetails = edu.descripcion.split(/\n+|•|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/)
      } else if (edu.tesis) {
        rawDetails.push(`Tesis de grado / Investigación: ${edu.tesis}`)
      }

      // Preservar y asegurar reconocimientos o logros explícitos del perfil maestro
      const matchingProfileEdu = profileEdus.find(p =>
        p && p.titulo && edu.titulo && p.titulo.toLowerCase().trim() === edu.titulo.toLowerCase().trim()
      )
      const explicitLogros = matchingProfileEdu?.logros || matchingProfileEdu?.reconocimientos || edu.logros || edu.reconocimientos
      if (explicitLogros) {
        const logrosArr = Array.isArray(explicitLogros)
          ? explicitLogros
          : String(explicitLogros).split(/\n+|•/).map(s => s.trim()).filter(Boolean)
        for (const l of logrosArr) {
          const alreadyIn = rawDetails.some(d => String(d).toLowerCase().includes(String(l).toLowerCase().slice(0, 20)))
          if (!alreadyIn && l.length > 5) {
            rawDetails.unshift(l)
          }
        }
      }

      let cleanDetails = rawDetails
        .map(d => String(d).replace(/^[•\-*]\s*/, '').trim())
        .filter(d => d.length > 8)

      if (cleanDetails.length === 1 && cleanDetails[0].length > 80) {
        const sSplit = cleanDetails[0].split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/).filter(s => s.trim().length > 10)
        if (sSplit.length > 1) {
          cleanDetails = sSplit
        }
      }

      // Si no tiene detalles explícitos, derivar énfasis académico de alto valor
      if (cleanDetails.length === 0) {
        const tLower = eduTitle.toLowerCase()
        if (tLower.includes('analítica') || tLower.includes('data') || tLower.includes('inteligencia artificial')) {
          cleanDetails.push('Profundización en modelado predictivo, arquitecturas de Machine Learning y Deep Learning aplicadas a la optimización de procesos de negocio.')
          cleanDetails.push('Desarrollo de proyectos de investigación aplicada con rigor estadístico y experimentación computacional avanzada.')
        } else if (tLower.includes('psicología') || tLower.includes('social') || tLower.includes('comunitaria')) {
          cleanDetails.push('Énfasis en metodologías de intervención comunitaria participativa, diagnóstico psicosocial y relacionamiento de grupos de interés.')
          cleanDetails.push('Desarrollo de proyectos con enfoque de impacto social medible, derechos humanos y articulación interinstitucional.')
        } else if (tLower.includes('economía') || tLower.includes('finanzas')) {
          cleanDetails.push('Formación avanzada en econometría aplicada, modelado cuantitativo, inferencia causal y análisis de series de tiempo.')
          cleanDetails.push('Capacidad para evaluar el impacto económico y financiero de decisiones analíticas en entornos globales.')
        } else if (tLower.includes('política') || tLower.includes('gobierno') || tLower.includes('sociales')) {
          cleanDetails.push('Enfoque en evaluación de políticas públicas basadas en evidencia y análisis multidimensional de datos.')
          cleanDetails.push('Habilidad para comunicar resultados analíticos complejos y alinear partes interesadas en contextos institucionales.')
        }
      }

      return [
        new Paragraph({
          children: [
            new TextRun({ text: eduTitle, bold: true, size: 22, font: 'Arial', color: '1F2937' }),
            new TextRun({ text: `  |  ${eduInst}`, size: 21, font: 'Arial', color: '475569' }),
            ...(datesText ? [new TextRun({ text: `\t${datesText}`, italic: true, size: 20, font: 'Arial', color: '64748B' })] : [])
          ],
          spacing: { before: 140, after: cleanDetails.length > 0 ? 50 : 90 }
        }),
        ...cleanDetails.map(detail => (
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: detail, size: 21, font: 'Arial', color: '475569' })
            ],
            spacing: { after: 50, line: 260 }
          })
        ))
      ]
    }).flat()
  ]

  // ── 5. CERTIFICACIONES PROFESIONALES (Si existen) ────────────
  if (certs.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'C E R T I F I C A C I O N E S   Y   L I C E N C I A S',
            bold: true,
            size: 21,
            font: 'Arial',
            color: '00135B'
          })
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
        spacing: { before: 240, after: 120 }
      }),
      ...certs.map(cert => {
        const certName = typeof cert === 'string' ? cert : (cert.nombre || 'Certificación Oficial')
        const certIssuer = cert.entidad_emisora ? `  |  ${cert.entidad_emisora}` : ''
        const certYear = cert.anio || cert.fecha_emision ? `\t${cert.anio || cert.fecha_emision}` : ''
        return new Paragraph({
          children: [
            new TextRun({ text: certName, bold: true, size: 20, font: 'Arial', color: '1F2937' }),
            ...(certIssuer ? [new TextRun({ text: certIssuer, size: 19, font: 'Arial', color: '475569' })] : []),
            ...(certYear ? [new TextRun({ text: certYear, italic: true, size: 19, font: 'Arial', color: '64748B' })] : [])
          ],
          spacing: { after: 60 }
        })
      })
    )
  }

  // ── 6. DIPLOMADOS Y FORMACIÓN CONTINUA (Si existen) ─────────
  if (nonFormal.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'D I P L O M A D O S   Y   F O R M A C I Ó N   C O N T I N U A',
            bold: true,
            size: 21,
            font: 'Arial',
            color: '00135B'
          })
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
        spacing: { before: 240, after: 120 }
      }),
      ...nonFormal.map(prog => {
        const progName = typeof prog === 'string' ? prog : (prog.nombre || 'Diplomado / Programa')
        const progInst = prog.institucion ? `  |  ${prog.institucion}` : ''
        const progYear = prog.anio || prog.fecha ? `\t${prog.anio || prog.fecha}` : ''
        return new Paragraph({
          children: [
            new TextRun({ text: progName, bold: true, size: 20, font: 'Arial', color: '1F2937' }),
            ...(progInst ? [new TextRun({ text: progInst, size: 19, font: 'Arial', color: '475569' })] : []),
            ...(progYear ? [new TextRun({ text: progYear, italic: true, size: 19, font: 'Arial', color: '64748B' })] : [])
          ],
          spacing: { after: 60 }
        })
      })
    )
  }

  // ── 7. COMPETENCIAS Y HABILIDADES CURADAS ───────────────────
  if (techSkillsText || softSkillsText) {
    const skillParagraphs = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'C O M P E T E N C I A S   Y   H A B I L I D A D E S',
            bold: true,
            size: 21,
            font: 'Arial',
            color: '00135B'
          })
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '00135B' } },
        spacing: { before: 240, after: 120 }
      })
    ]

    if (techSkillsText) {
      skillParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Habilidades Técnicas y de Especialidad: ', bold: true, size: 20, font: 'Arial', color: '00135B' }),
            new TextRun({
              text: techSkillsText,
              size: 20,
              font: 'Arial',
              color: '374151'
            })
          ],
          spacing: { after: 60 }
        })
      )
    }

    if (softSkillsText) {
      skillParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Competencias de Liderazgo y Conductuales: ', bold: true, size: 20, font: 'Arial', color: '00135B' }),
            new TextRun({
              text: softSkillsText,
              size: 20,
              font: 'Arial',
              color: '374151'
            })
          ],
          spacing: { after: 120 }
        })
      )
    }

    docChildren.push(...skillParagraphs)
  }

  // ── 8. IDIOMAS (Si existen) ─────────────────────────────────
  if (idiomas.length > 0) {
    const idiomasText = idiomas
      .map(lang => {
        if (typeof lang === 'string') return lang
        const nivel = lang.nivel_mcer || lang.nivel || ''
        return nivel ? `${lang.idioma} (${nivel})` : lang.idioma
      })
      .filter(Boolean)
      .join('  •  ')

    if (idiomasText) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'I D I O M A S',
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
            new TextRun({
              text: idiomasText,
              size: 20,
              font: 'Arial',
              color: '374151'
            })
          ],
          spacing: { after: 200 }
        })
      )
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,    // ~0.7 in
              bottom: 1000,
              left: 1080,   // 0.75 in
              right: 1080
            }
          }
        },
        children: docChildren
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
  const rawCl = typeof coverLetterText === 'string' ? coverLetterText : String(coverLetterText?.texto || coverLetterText || '')
  const clParas = rawCl.split('\n\n').filter(p => p.trim())

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
              new TextRun({
                text: `${[profile.ubicacion, profile.telefono, profile.correo || profile.correo_personal].filter(Boolean).join('  |  ')}  |  ${fechaHoy}`,
                size: 19,
                font: 'Arial',
                color: '64748B'
              })
            ],
            spacing: { after: 240 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Atención: Equipo de Selección de Talento Humano', bold: true, size: 21, font: 'Arial', color: '1F2937' }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${applicationData.empresa || ''} — Vacante: ${applicationData.puesto || ''}`, bold: true, size: 21, font: 'Arial', color: '00387D' })
            ],
            spacing: { after: 240 }
          }),

          ...(clParas.map(p => (
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
  const safeEmailData = emailData && typeof emailData === 'object' ? emailData : {}
  const rawEmailBody = String(safeEmailData.cuerpo || safeEmailData.contenido || '')
  const emailParas = rawEmailBody.split('\n\n').filter(p => p.trim())

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
              new TextRun({ text: safeEmailData.asunto || `Postulación a ${applicationData.puesto} - ${profile.nombre}`, size: 21, font: 'Arial', bold: true, color: '1F2937' })
            ],
            spacing: { after: 200 }
          }),

          ...(emailParas.map(p => (
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
