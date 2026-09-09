-- =====================================================================
-- ALUMNICV — Migración 006: Corregir valor por defecto de links a '[]'::jsonb
-- y normalizar registros existentes con '{}'::jsonb a '[]'::jsonb.
-- =====================================================================

ALTER TABLE usuarios ALTER COLUMN links SET DEFAULT '[]'::jsonb;

UPDATE usuarios 
SET links = '[]'::jsonb 
WHERE links IS NULL 
   OR links = '{}'::jsonb 
   OR jsonb_typeof(links) != 'array';
