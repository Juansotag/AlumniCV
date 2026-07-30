-- =====================================================================
-- ALUMNICV — Migration 002: Búsquedas, Vacantes, Procesos y Documentos
-- Railway / PostgreSQL / Supabase
-- Ref: README.md § Modelo de datos
-- =====================================================================

-- ─── 1. Búsquedas de empleo (historial de parámetros) ────────────────
CREATE TABLE IF NOT EXISTS job_searches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  params          JSONB       NOT NULL DEFAULT '{}',
  -- params: { n_resultados, plataformas: [], ubicacion_texto, modalidad, nivel, dias_desde_publicacion, postulantes_max, salario_minimo }
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending | running | done | error
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ─── 2. Resultados de búsqueda de empleo (vacantes encontradas) ───────
CREATE TABLE IF NOT EXISTS job_search_results (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id           UUID        NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
  plataforma          TEXT        NOT NULL, -- LinkedIn | Indeed | Computrabajo
  empresa             TEXT        NOT NULL,
  puesto              TEXT        NOT NULL,
  link                TEXT,
  compatibilidad      NUMERIC(5,2),         -- porcentaje / score
  palabras_clave      JSONB       DEFAULT '[]',
  fecha_publicacion   TIMESTAMPTZ,
  postulantes         INT,
  descripcion_corta   TEXT,
  salario_expectativa TEXT,
  ubicacion           TEXT,
  modalidad           TEXT,                 -- presencial | hibrido | virtual
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Procesos de selección ("Mis procesos") ─────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  job_search_result_id  UUID        REFERENCES job_search_results(id) ON DELETE SET NULL,
  empresa               TEXT        NOT NULL,
  puesto                TEXT        NOT NULL,
  plataforma            TEXT,
  descripcion_corta     TEXT,
  salario_expectativa   TEXT,
  ubicacion             TEXT,
  modalidad             TEXT,
  
  -- pipeline visual ("Mi estado"): array de nodos/formas
  -- [{ id, tipo: 'cuadrado'|'circulo'|'triangulo'|'estrella', estado: 'gris'|'rojo'|'verde'|'amarillo', modalidad: 'presencial'|'virtual'|null, historial: [{estado, fecha}] }]
  pipeline              JSONB       NOT NULL DEFAULT '[{"id": "init", "tipo": "cuadrado", "estado": "gris", "modalidad": null, "historial": []}]',
  
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. Documentos generados por postulación ───────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  usuario_id      UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            TEXT        NOT NULL, -- cv | cover_letter | correo
  nombre_archivo  TEXT,
  file_url        TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices de rendimiento ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_searches_usuario       ON job_searches (usuario_id);
CREATE INDEX IF NOT EXISTS idx_job_search_results_search   ON job_search_results (search_id);
CREATE INDEX IF NOT EXISTS idx_applications_usuario       ON applications (usuario_id);
CREATE INDEX IF NOT EXISTS idx_documents_application       ON documents (application_id);
CREATE INDEX IF NOT EXISTS idx_documents_usuario           ON documents (usuario_id);
