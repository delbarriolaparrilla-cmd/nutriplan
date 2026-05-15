-- ─────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN OPCIONAL v2 — Columnas adicionales en tabla recetas
-- Ejecutar en Supabase SQL Editor si quieres persistir los campos de Claude.
-- Después de ejecutarla, descomentar las líneas marcadas en recetaUtils.ts
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE recetas
  ADD COLUMN IF NOT EXISTS costo_estimado_mxn  NUMERIC,
  ADD COLUMN IF NOT EXISTS nota_nutricional     TEXT,
  ADD COLUMN IF NOT EXISTS grupo_smae_principal TEXT;
