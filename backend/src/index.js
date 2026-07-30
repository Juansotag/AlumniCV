import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cvRoutes from './routes/cv.js'
import profileRoutes from './routes/profile.js'
import applicationsRoutes from './routes/applications.js'
import documentsRoutes from './routes/documents.js'
import jobSearchRoutes from './routes/jobSearch.js'
import coachRoutes from './routes/coach.js'

const app = express()
const PORT = process.env.PORT || 8000

let cleanFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim() : ''
if (cleanFrontendUrl.endsWith('/')) {
  cleanFrontendUrl = cleanFrontendUrl.slice(0, -1)
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(cleanFrontendUrl ? [cleanFrontendUrl] : []),
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origen no permitido — ${origin}`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/cv', cvRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/job-search', jobSearchRoutes)
app.use('/api/coach', coachRoutes)

// Silenciar sondeador interno de Chrome DevTools
app.get('/.well-known/*', (_req, res) => res.status(204).end())

// Health check (sin auth)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AlumniCV backend corriendo correctamente' })
})

// ── Arranque ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`AlumniCV backend escuchando en http://localhost:${PORT}`)
})
