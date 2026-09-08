-- =====================================================================
-- ALUMNICV — Migración 003: Unificación de Perfil, Enlaces y Referencias
-- Agrega columnas de contacto personal, enlaces web/redes sociales y
-- referencias personales y laborales a la tabla usuarios.
-- =====================================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_personal TEXT DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono TEXT DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ubicacion TEXT DEFAULT 'Bogota, Colombia';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS titular TEXT DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referencias_laborales JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referencias_personales JSONB NOT NULL DEFAULT '[]'::jsonb;
