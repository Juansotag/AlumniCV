-- =====================================================================
-- ALUMNICV — Esquema inicial de base de datos
-- Railway / PostgreSQL
-- Ref: README.md § Modelo de datos
-- =====================================================================

-- Extensión para gen_random_uuid() (disponible por defecto en PG 13+)

-- ─── Función compartida: auto-actualizar updated_at ────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. Perfil de usuario ───────────────────────────────────────────────
-- id = auth.users.id de Supabase (no se genera un id propio)
CREATE TABLE IF NOT EXISTS usuarios (
  id                     UUID        PRIMARY KEY,
  correo                 TEXT        UNIQUE NOT NULL,
  nombre                 TEXT,

  -- Campos base del CV
  resumen                TEXT,
  experiencia            JSONB       NOT NULL DEFAULT '[]',   -- [{empresa, cargo, desde, hasta, descripcion}]
  educacion_formal       JSONB       NOT NULL DEFAULT '[]',   -- [{institucion, titulo, desde, hasta}]

  -- Campos extendidos (ver README § Perfil — campos extendidos)
  certificaciones        JSONB       NOT NULL DEFAULT '[]',   -- [{nombre, fecha_emision, fecha_vencimiento, entidad_emisora, id_credencial}]
  formacion_no_formal     JSONB       NOT NULL DEFAULT '[]',   -- [{nombre, institucion, fecha}]
  idiomas                 JSONB       NOT NULL DEFAULT '[]',   -- [{idioma, nivel}]
  habilidades_tecnicas    JSONB       NOT NULL DEFAULT '[]',   -- [{tipo, nombre, nivel}]  tipo: programacion|programa|conocimiento
  habilidades_blandas     JSONB       NOT NULL DEFAULT '[]',   -- ["texto", ...]

  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 2. Hojas de vida subidas ────────────────────────────────────────────
-- url apunta a Cloudflare R2 / Supabase Storage
-- activa = la versión usada actualmente para llenar el perfil
CREATE TABLE IF NOT EXISTS cv_files (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  url             TEXT        NOT NULL,
  texto_extraido  TEXT,       -- texto plano extraído del PDF (unpdf) — evita re-descargar/re-parsear al reintentar el assessment
  activa          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Assessments de CV ─────────────────────────────────────────────────
-- respuesta_json sigue el schema documentado en README.md § Assessment de CV
CREATE TABLE IF NOT EXISTS cv_assessments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cv_file_id     UUID        NOT NULL REFERENCES cv_files(id) ON DELETE CASCADE,
  respuesta_json JSONB       NOT NULL,
  pdf_url        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices de rendimiento ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cv_files_usuario         ON cv_files (usuario_id);
CREATE INDEX IF NOT EXISTS idx_cv_files_usuario_activa   ON cv_files (usuario_id, activa);
CREATE INDEX IF NOT EXISTS idx_cv_assessments_usuario    ON cv_assessments (usuario_id);
CREATE INDEX IF NOT EXISTS idx_cv_assessments_created    ON cv_assessments (usuario_id, created_at DESC);
