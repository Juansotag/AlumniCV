# Handoff — para el siguiente agente/sesión

Guía de arranque rápido para retomar este proyecto sin tener que releer todo el historial de chat. Lee esto primero; el detalle completo de producto y arquitectura está en [README.md](./README.md) — este archivo es sobre **estado actual** y **qué hacer después**.

## Qué es esto

AlumniCV — herramienta pedida por Luis Miguel Manjarrez Motta (Dirección de Alumni, UniSabana) para que un usuario suba su CV, reciba un análisis tipo reclutador, busque vacantes públicas en tiempo real en LinkedIn, aplique con documentos generados por IA (.docx) e haga seguimiento visual a sus procesos de selección. Es un proyecto hermano de `Downloads/Germina` (mismo dueño, mismo stack, mismas convenciones de código y misma identidad gráfica oficial de GovLab / UniSabana).

**Fuera de alcance, explícitamente:** selección de maestría. Vive en otro servicio, no es parte de esta herramienta.

## Estado actual (2026-07-29)

✅ **Construido y verificado al 100% con base de datos real en Supabase (Puerto 8000):**
- **Identidad Gráfica Institucional:** Basada e idéntica a Germina. Títulos Display en `Publico Banner` (woff2), subtítulos en `Cabinet Grotesk`, cuerpo en `Libre Franklin`, paleta de colores oficial (`#00135B`), Header con logo de GovLab (`GovLab_blanco.png`) + título `AlumniCV` + botón de cerrar sesión único.
- **Backend (Node.js/Express en puerto 8000):** 
  - Routes: 
    - `/api/cv` (upload & parse PDF + assessment LLM Claude + PDFkit)
    - `/api/profile` (datos de usuario)
    - `/api/applications` (CRUD de procesos y pipeline JSONB)
    - `/api/documents` (generación de CV/Cover Letter/Correo en `.docx` con Claude LLM + `docx`)
    - `/api/job-search` (búsqueda en tiempo real de vacantes públicas en LinkedIn vía Guest API sin credenciales + cálculo de compatibilidad % + conversión directa a procesos).
- **Frontend (React/Vite):** 
  - Login/Register (`@unisabana.edu.co`), Onboarding (carga de CV y resultados de assessment), Perfil.
  - **`NuevaBusqueda.jsx`:** Formulario de búsqueda en tiempo real en LinkedIn, tabla de vacantes con porcentaje de afinidad/compatibilidad, número de postulantes, link directo y botón `+ Mis Procesos`.
  - **`PipelineTracker.jsx`:** Cadena visual de formas (cuadrado, círculo, triángulo, estrella), estados de color (verde, rojo, amarillo, gris), modalidad (presencial/virtual), historial de fechas y reconexión automática sobre el diseño institucional limpio de Germina.
  - **`MisProcesos.jsx`:** Gestión de vacantes registradas, búsqueda/filtrado, modal de registro manual, integración interactiva de `PipelineTracker` y modal para redactar y generar documentos Word (.docx) con IA.
  - **`MisDocumentos.jsx`:** Tabla institucional de gestión y descarga de archivos `.docx` adaptados (CV, Cover Letter, Correo).
- **Compilaciones & Servidor:** `npm run build` en frontend pasa 100% limpio (1859 módulos transformados). El backend corre en puerto `8000`.

## Cómo correrlo localmente

```bash
# Backend (corre en puerto 8000)
cd backend
npm install
npm run dev             # http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev             # http://localhost:5173
```
