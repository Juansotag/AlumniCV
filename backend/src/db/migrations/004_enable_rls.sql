-- =====================================================================
-- ALUMNICV — Migración 004: Habilitar Row Level Security (RLS) en Supabase
-- Protege todas las tablas en el esquema public y define políticas
-- por usuario basadas en auth.uid().
-- =====================================================================

-- ─── 1. Habilitar RLS en todas las tablas de public ─────────────────
ALTER TABLE IF EXISTS usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cv_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schema_migrations ENABLE ROW LEVEL SECURITY;

-- ─── 2. Políticas para usuarios ──────────────────────────────────────
DROP POLICY IF EXISTS "usuarios_user_access" ON usuarios;
CREATE POLICY "usuarios_user_access" ON usuarios
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── 3. Políticas para cv_files ──────────────────────────────────────
DROP POLICY IF EXISTS "cv_files_user_access" ON cv_files;
CREATE POLICY "cv_files_user_access" ON cv_files
  FOR ALL
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ─── 4. Políticas para cv_assessments ────────────────────────────────
DROP POLICY IF EXISTS "cv_assessments_user_access" ON cv_assessments;
CREATE POLICY "cv_assessments_user_access" ON cv_assessments
  FOR ALL
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ─── 5. Políticas para job_searches ──────────────────────────────────
DROP POLICY IF EXISTS "job_searches_user_access" ON job_searches;
CREATE POLICY "job_searches_user_access" ON job_searches
  FOR ALL
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ─── 6. Políticas para job_search_results ────────────────────────────
DROP POLICY IF EXISTS "job_search_results_user_access" ON job_search_results;
CREATE POLICY "job_search_results_user_access" ON job_search_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_searches
      WHERE job_searches.id = job_search_results.search_id
        AND job_searches.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_searches
      WHERE job_searches.id = job_search_results.search_id
        AND job_searches.usuario_id = auth.uid()
    )
  );

-- ─── 7. Políticas para applications ──────────────────────────────────
DROP POLICY IF EXISTS "applications_user_access" ON applications;
CREATE POLICY "applications_user_access" ON applications
  FOR ALL
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ─── 8. Políticas para documents ─────────────────────────────────────
DROP POLICY IF EXISTS "documents_user_access" ON documents;
CREATE POLICY "documents_user_access" ON documents
  FOR ALL
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
