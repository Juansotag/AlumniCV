-- =====================================================================
-- ALUMNICV — Migración 005: Optimización de RLS y Función set_updated_at
-- Resuelve advertencias del Supabase Security & Performance Advisor:
-- 1. Corrige Function Search Path Mutable en set_updated_at.
-- 2. Optimiza políticas RLS con (select auth.uid()) para evitar InitPlan por fila.
-- =====================================================================

-- ─── 1. Asegurar search_path inmutable en set_updated_at ────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── 2. Optimizar políticas RLS con (select auth.uid()) ──────────────
DROP POLICY IF EXISTS "usuarios_user_access" ON usuarios;
CREATE POLICY "usuarios_user_access" ON usuarios
  FOR ALL
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "cv_files_user_access" ON cv_files;
CREATE POLICY "cv_files_user_access" ON cv_files
  FOR ALL
  TO authenticated
  USING (usuario_id = (select auth.uid()))
  WITH CHECK (usuario_id = (select auth.uid()));

DROP POLICY IF EXISTS "cv_assessments_user_access" ON cv_assessments;
CREATE POLICY "cv_assessments_user_access" ON cv_assessments
  FOR ALL
  TO authenticated
  USING (usuario_id = (select auth.uid()))
  WITH CHECK (usuario_id = (select auth.uid()));

DROP POLICY IF EXISTS "job_searches_user_access" ON job_searches;
CREATE POLICY "job_searches_user_access" ON job_searches
  FOR ALL
  TO authenticated
  USING (usuario_id = (select auth.uid()))
  WITH CHECK (usuario_id = (select auth.uid()));

DROP POLICY IF EXISTS "job_search_results_user_access" ON job_search_results;
CREATE POLICY "job_search_results_user_access" ON job_search_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_searches
      WHERE job_searches.id = job_search_results.search_id
        AND job_searches.usuario_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_searches
      WHERE job_searches.id = job_search_results.search_id
        AND job_searches.usuario_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "applications_user_access" ON applications;
CREATE POLICY "applications_user_access" ON applications
  FOR ALL
  TO authenticated
  USING (usuario_id = (select auth.uid()))
  WITH CHECK (usuario_id = (select auth.uid()));

DROP POLICY IF EXISTS "documents_user_access" ON documents;
CREATE POLICY "documents_user_access" ON documents
  FOR ALL
  TO authenticated
  USING (usuario_id = (select auth.uid()))
  WITH CHECK (usuario_id = (select auth.uid()));
