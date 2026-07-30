# AlumniCV

Herramienta pedida por Luis Miguel Manjarrez Motta (Dirección de Alumni, UniSabana) — distinta de ChatPosgrados (proyecto de Dalia, ya en producción). Ayuda al usuario a construir/calificar su hoja de vida, buscar posiciones, generar documentos de aplicación y hacer seguimiento visual a cada proceso de selección.

**Fuera de alcance:** selección de maestría — vive en otro servicio, no es parte de esta herramienta.

## Flujo de usuario

### 1. Onboarding
- Crear cuenta con correo institucional `@unisabana.edu.co` (mismo patrón que Germina)
- Email de confirmación vía Supabase Auth — **apagado en pruebas iniciales**
- Al crear la cuenta, el usuario sube su hoja de vida (PDF/DOCX) y la herramienta llena automáticamente los campos del perfil (parseo con `unpdf`, igual que Germina)

### 2. Perfil — campos extendidos
Más allá del CV estándar (experiencia, educación formal, resumen), el perfil agrega:
- **Certificaciones** — nombre, fecha de emisión, fecha de vencimiento, entidad emisora, ID de credencial
- **Formación no formal**
- **Idiomas** (aparte de certificados de idioma, que caen dentro de Certificaciones)
- **Habilidades técnicas** — programación, programas/herramientas, conocimientos específicos
- **Habilidades blandas**

### 3. Assessment de CV
Al terminar el onboarding se corre un análisis con este prompt (adaptado para responder en JSON, no en texto libre):

> Actúa como un reclutador con 15 años de experiencia, analiza mi currículo y dime 1. los primeros 20 puestos para los que soy mejor candidato 2. las palabras clave ATS que tendría que incluir 3. qué debilidades se notan en menos de 10 segundos y 4. qué calificación le das del 1 al 10 y cómo llevarlo a un 10

**Schema de salida (`cv_assessments.response_json`):**
```json
{
  "top_puestos": ["Data Scientist", "..."],       // 20 items
  "palabras_clave_ats": ["A/B Testing", "..."],
  "debilidades": ["...", "..."],
  "calificacion": {
    "score": 7.5,
    "como_llegar_a_10": ["...", "..."]
  }
}
```
El JSON se usa para construir un PDF de reporte. Todo queda persistido: el CV subido, los campos extraídos, el JSON de la respuesta y el PDF generado.

Desde el perfil, el usuario puede volver a subir su CV y **reintentar el assessment**, lo cual reescribe las variables del perfil.

### 4. Shell de la app
Igual que Germina: menú lateral izquierdo + área de trabajo. Tarjetas del menú:
- **Nueva búsqueda**
- **Mis procesos**
- **Mis documentos**

### 5. Nueva búsqueda
Formulario en el área de trabajo:

| Campo | Tipo |
|---|---|
| Cuántos trabajos buscar | número |
| Plataformas | multi-select: LinkedIn, Indeed, Computrabajo |
| Lugar de búsqueda | texto libre |
| Modalidad | presencial / híbrido / virtual |
| Nivel | senior / semi-senior / junior / prácticas / etc. |
| Antigüedad de la publicación | días/horas desde publicado |
| Nº de postulantes | filtro |
| Expectativa salarial | mínimo |

La búsqueda corre **asíncrona**. Al terminar, arma una tabla ordenada de mejor a peor `compatibilidad`: empresa, puesto, link, compatibilidad, palabras clave, fecha/hora de publicación, nº de postulantes. Cada resultado se convierte en una vacante dentro de **Mis procesos**.

> ⚠️ **Riesgo operativo, no técnico:** scraping de LinkedIn e Indeed viola sus Términos de Servicio (LinkedIn litiga activamente contra scrapers — caso hiQ vs. LinkedIn). Computrabajo es más permisivo pero también tiene ToS. Antes de construir el scraper vale la pena decidir conscientemente: ¿scraping directo asumiendo el riesgo a esta escala (uso personal/bajo volumen), o arrancar con una API de agregador de empleos (ej. Adzuna) que cubra parte de las plataformas sin scrapear directamente? No es un bloqueo de diseño — el modelo de datos es el mismo en ambos casos — pero sí una decisión de producto a tomar antes de implementar.

### 6. Mis procesos
Tabla de vacantes con estas columnas:

| Columna | Contenido |
|---|---|
| Plataforma | dónde se encontró (LinkedIn/Indeed/Computrabajo) |
| Posición | nombre del cargo |
| Empresa | nombre |
| Descripción corta | |
| Expectativa salarial | |
| Ubicación | |
| Modalidad | presencial/híbrido/virtual |
| **Acciones** | botón **Aplicar** → lleva a una página de carga donde se elige generar CV, Cover Letter, o Cover Letter + correo; clic en Generar y el LLM produce los Word y los guarda · botón **Eliminar** → quita la vacante de procesos |
| **Mi estado** | pipeline visual del proceso de selección (ver abajo) |

#### Mi estado — pipeline visual
Es una cadena lineal de formas que representa las fases del proceso de selección de esa vacante:

- **Arranca** con un cuadrado gris (aplicación aún no enviada)
- El cuadrado pasa a **verde** (se aplicó y hubo respuesta) o **rojo** (no hubo respuesta)
- A la derecha de cada forma hay una línea que conecta a un círculo con botón **+**
- El **+** permite agregar una nueva forma: **círculo** = entrevista, **triángulo** = prueba técnica
- Cada forma (excepto el cuadrado inicial) tiene: **estado** (rojo = no pasó, verde = pasó, amarillo = aún no se sabe) y **modalidad** (presencial/virtual — si es virtual, la forma muestra un ícono de computador)
- Se pueden encadenar tantas formas como fases tenga el proceso real (ej. 3 pruebas técnicas + 5 entrevistas)
- **Cada cambio de estado queda con fecha** — así al final del proceso se puede reconstruir la línea de tiempo completa (cuándo fue cada entrevista/prueba y cuándo se supo el resultado)
- **Estrella** = selección final, cierra el proceso — una vez creada, no se pueden agregar más formas
- Cualquier forma se puede **eliminar**; si se borra una del medio, las formas restantes se reconectan
- Todo el pipeline de una vacante se guarda como JSON asociado a esa vacante/usuario

### 7. Mis documentos
Tabla con columnas **Proceso** y **Ver documentos** — accede a los CV/Cover Letter/correos generados por vacante.

## Stack (mismo patrón que Germina y ChatPosgrados, para reusar cuentas/infra existentes)

- **Frontend:** React 18 + Vite 5 + React Router 6
- **Backend:** Node.js + Express
- **Auth:** Supabase Auth (dominio `@unisabana.edu.co`, confirmación por correo apagada en pruebas)
- **Base de datos:** PostgreSQL en Railway
- **Archivos (CVs, PDFs de assessment, documentos generados):** Cloudflare R2 (o Supabase Storage si se reusa la cuenta de ChatPosgrados)
- **LLM:** Claude (Anthropic) — cuenta paga de GovLab
- **Generación de documentos:** `docx` (reusar `docx-skill` de Germina)
- **Parseo de PDF:** `unpdf` (ya usado en Germina)
- **Búsqueda de vacantes:** por decidir — scraper propio vs. API de agregador (ver riesgo arriba)

## Estructura del proyecto

```
AlumniCV/
├── frontend/
│   └── src/
│       ├── app/          # Onboarding, Perfil, Nueva Búsqueda, Mis Procesos, Mis Documentos
│       ├── components/    # PipelineTracker (el componente de "Mi estado"), tablas, formularios
│       ├── styles/
│       └── lib/
└── backend/
    └── src/
        ├── routes/        # /profile, /cv-assessment, /job-search, /applications, /documents
        ├── services/       # lógica de negocio por módulo (incluye el scraper/cliente de API)
        ├── db/              # migrations + queries
        ├── llm/             # prompt de assessment ATS, generación de CV/cover letter/correo
        └── config/
```

## Modelo de datos

```
users                  — Supabase Auth (id, email @unisabana.edu.co)

profiles                — user_id FK
  campos base CV: nombre, resumen, experiencia[], educacion_formal[]
  certificaciones: [{nombre, fecha_emision, fecha_vencimiento, entidad_emisora, id_credencial}]
  formacion_no_formal: [{nombre, institucion, fecha}]
  idiomas: [{idioma, nivel}]
  habilidades_tecnicas: [{tipo, nombre, nivel}]
  habilidades_blandas: [texto]

cv_files                — user_id FK, file_url, uploaded_at, is_active

cv_assessments           — user_id FK, cv_file_id FK, response_json (schema arriba), pdf_url, created_at

job_searches              — user_id FK, params jsonb {n_resultados, plataformas[], ubicacion_texto,
                              modalidad, nivel, dias_desde_publicacion, postulantes_max, salario_minimo},
                              status (pending|running|done|error), created_at, completed_at

job_search_results         — search_id FK, plataforma, empresa, puesto, link, compatibilidad,
                              palabras_clave[], fecha_publicacion, postulantes, descripcion_corta,
                              salario_expectativa, ubicacion, modalidad

applications ("Mis procesos") — user_id FK, job_search_result_id FK nullable, empresa, puesto,
                              plataforma, descripcion_corta, salario_expectativa, ubicacion, modalidad,
                              pipeline jsonb, created_at, updated_at
  pipeline = [{ id, tipo: cuadrado|circulo|triangulo|estrella,
                estado: gris|rojo|verde|amarillo,
                modalidad: presencial|virtual|null,
                historial: [{estado, fecha}] }, ...]

documents                  — application_id FK, tipo (cv|cover_letter|correo), file_url, created_at
```

## Preguntas abiertas (no bloquean el diseño, sí la implementación)

- Scraping vs. API de agregador para búsqueda de vacantes (ver riesgo operativo arriba)
- Cuenta de infraestructura: ¿`alumnisabanaservicios@gmail.com` (la de ChatPosgrados) o una cuenta nueva de GovLab?

## Próximos pasos para empezar a desarrollar

1. ✅ `npm init` en frontend/backend con las dependencias de Germina como base
2. ✅ Migration `001_initial_schema.sql`: `usuarios` (perfil extendido), `cv_files`, `cv_assessments`
3. ✅ Flujo de onboarding + parseo de CV + assessment end-to-end, backend y frontend:
   - Backend: `POST /api/cv/upload` (extrae texto → sube a Storage → LLM llena el perfil → corre el assessment de reclutador → genera el PDF con `pdfkit` → guarda todo) y `GET /api/profile`
   - Frontend: `Register`/`Login` (Supabase Auth, dominio `@unisabana.edu.co`), `Onboarding` (dropzone de CV → muestra el assessment), `Profile` (perfil extendido completo + reintentar assessment subiendo un CV nuevo), `Dashboard` con `Sidebar` (Nueva búsqueda / Mis procesos / Mis documentos — paneles "Próximamente", su construcción es el paso 4-5 de abajo)
   - Falta correrlo contra datos reales (pendiente cuenta de infra)
4. Migrations de `job_searches`, `job_search_results`, `applications`, `documents`
5. Componente `PipelineTracker` en frontend (la cadena de formas de "Mi estado") — es la pieza de UI más compleja, vale la pena prototiparla temprano
6. Decidir scraping vs. API antes de construir el módulo de búsqueda

### Notas de implementación
- El parser de CV y el assessment de reclutador usan Claude vía `llm/client.js` (`completeJson`) pidiendo JSON puro y extrayéndolo con regex — mismo patrón que usa Germina con OpenAI en `routes/profile.js`, solo que con Anthropic.
- `POST /api/cv/upload` solo acepta PDF por ahora (usa `unpdf`, igual que Germina). Si más adelante se necesita soportar DOCX, hace falta otra librería de parseo.
- El PDF de assessment usa `pdfkit` (no `docx`) porque el resultado pedido es un PDF, no un Word — es una decisión distinta a la de Germina, que solo genera `.docx`.
- Buckets de Supabase Storage usados: `alumnicv-cvs`, `alumnicv-assessments`, `alumnicv-documentos` (hay que crearlos en el proyecto de Supabase antes de probar en real).
- `vite.config.js` fija `optimizeDeps.include` explícitamente (react, react-dom, react-router-dom, supabase-js, lucide-react). Sin esto, Vite re-optimiza dependencias en cada carga y deja dos copias de React coexistiendo en la página (error "Invalid hook call" + crash en `<BrowserRouter>`) — si se agrega una librería nueva al frontend, agregarla también aquí.
