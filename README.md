# AlumniCV

Herramienta institucional desarrollada por la Dirección de Alumni de la Universidad de La Sabana y el GovLab. Permite a los egresados optimizar sus perfiles profesionales mediante la adaptación inteligente de sus hojas de vida (CV), realizar búsquedas asíncronas de empleo acumulativas, gestionar dinámicamente sus procesos de postulación, generar cartas de presentación, y contar con un Coach Laboral inteligente personalizado.

---

## Módulos y Flujos de la Aplicación

### 1. Onboarding y Carga de Perfil
- **Acceso Restringido**: Registro exclusivo para correos con dominio `@unisabana.edu.co`.
- **Parseo Inteligente**: Al cargar la hoja de vida (PDF/DOCX), el sistema extrae automáticamente la información del perfil del egresado: experiencia, educación formal, certificaciones, formación no formal, idiomas y habilidades (técnicas/blandas).

### 2. Assessment ATS (Calificación de CV)
- Evalúa el currículo contra 20 perfiles sugeridos, identifica debilidades en menos de 10 segundos y genera una puntuación de afinidad (ATS Score) de 1 a 10 con recomendaciones detalladas para optimizar el CV.
- El egresado puede regenerar este assessment subiendo una nueva versión de su hoja de vida desde su perfil.

### 3. Anuncios de Empleo (Nueva Búsqueda)
- **Scraping Acumulativo**: Realiza búsquedas de empleo asíncronas de LinkedIn basándose en cargo, ubicación y modalidad (Remoto/Híbrido/Presencial).
- **Inventario Acumulado**: Todos los anuncios encontrados se almacenan acumulativamente en la base de datos para que el egresado no los pierda entre búsquedas.
- **Prevención de Duplicados**: El backend valida que no se inserten vacantes duplicadas en el inventario basándose en el enlace único de LinkedIn.
- **Filtrado y Ordenación**: Permite ordenar la tabla por afinidad %, vacante, empresa, fecha de publicación y capturado.
- **Acción de Conversión**: El egresado decide qué anuncios del inventario se convierten a sus procesos activos de postulación (`+`), o los descarta del inventario (``).

### 4. Mis Procesos
- **Seguimiento del Pipeline**: Un tracker de flujo lineal interactivo para documentar las fases de cada postulación:
 - **Fases Personalizables**: Cuadrado (inicio), círculo (entrevista), triángulo (prueba técnica) y estrella (oferta / selección final).
 - **Historial Editable**: Cada transición de estado (Aprobado, Rechazado, En proceso, Cancelado) guarda su fecha, hora y notas. Las fechas e historial de cambios se pueden editar o eliminar de forma independiente.
 - **Modalidades e Iconos**: Configuración de modalidades (presencial, virtual, teléfono) mostrando iconos representativos ( / ) dentro de la forma.
 - **Alertas Dinámicas**: Mensajes automáticos de felicitación al ser seleccionado (estrella en verde) o de consolación en caso de rechazo o cancelación.
 - **Cancelación en Cascada**: Marcar un hito como cancelado cancela automáticamente todas las fases subsecuentes del pipeline.

### 5. Generación de Documentos y Mis Documentos
- **Generador con IA**: Diseña y descarga hojas de vida personalizadas, cartas de presentación y correos de postulación formales adaptados al puesto y empresa en formato de Word (`.docx`).
- **Nomenclatura Estandarizada**: Guarda los archivos con el formato de nombre `Apellido_TipoDocumento_Empresa_shortId.docx` para mayor profesionalismo.
- **Vista de Documentos**: Tabla ordenada por fecha donde se puede descargar cada archivo, acceder directamente al proceso de postulación ("Ver proceso") o ver la vacante original en la web ("Ver anuncio").

### 6. Coach Laboral (Asesoría Especializada)
- Un chatbot conversacional inteligente con acceso completo a todo el contexto del usuario (perfil, procesos activos/fracasados, anuncios en inventario y documentos generados).
- **Persistencia**: Conserva todo el historial de la conversación localmente en el navegador (`localStorage`) por si cierras la herramienta.
- **Renderizado de Markdown**: Interpreta negritas y listas con viñetas nativas para una lectura sumamente ejecutiva.

---

## Variables de Entorno (Environment Variables)

Para desplegar la aplicación en producción (Railway u otro entorno de nube) se deben configurar las siguientes variables de entorno:

### Backend (`backend/`)
Configurar estas variables en el servicio del servidor del backend:
```env
PORT=8000
DATABASE_URL=postgresql://<usuario>:<contraseña>@<host>:<puerto>/postgres
SUPABASE_URL=https://<proyecto-supabase>.supabase.co
SUPABASE_ANON_KEY=<anon-key-publica>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-privada>
ANTHROPIC_API_KEY=sk-ant-api03-... # API Key para Claude (Anthropic)
FRONTEND_URL=https://<tu-frontend>.railway.app
```

### Frontend (`frontend/`)
Configurar estas variables en el servicio del cliente frontend:
```env
VITE_API_URL=https://<tu-backend-api>.railway.app
VITE_SUPABASE_URL=https://<proyecto-supabase>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-publica>
```

---

## Estructura del Monorepositorio

```
AlumniCV/
├── backend/ # API Servidor Node.js / Express
│ ├── src/
│ │ ├── routes/ # Endpoints (cv, profile, applications, documents, jobSearch, coach)
│ │ ├── services/ # Lógica de negocio (scrapers, documentGenerator, cvService)
│ │ ├── db/ # Migraciones SQL e inicialización PostgreSQL
│ │ └── llm/ # Clientes e integraciones con Claude
│ ├── package.json
│ └── railway.toml # Despliegue en Railway del backend
│
├── frontend/ # Aplicación Cliente React / Vite
│ ├── src/
│ │ ├── app/ # Vistas principales (NuevaBusqueda, MisProcesos, CoachLaboral, etc.)
│ │ ├── components/ # Componentes (PipelineTracker, AssessmentResult, etc.)
│ │ └── lib/ # Configuración de clientes (Supabase, AuthContext, API)
│ ├── index.html
│ ├── package.json
│ └── railway.toml # Despliegue en Railway del frontend
│
└── railway.toml # Explicativo raíz para monorrepisitorio
```
