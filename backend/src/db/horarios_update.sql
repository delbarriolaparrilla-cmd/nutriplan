-- ============================================================
-- NutriPlan — Migración: horarios de comida adicionales
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Colación de la mañana (para plan de 5 comidas)
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS horario_colacion_manana TIME DEFAULT '11:00';

-- Merienda (para plan de 4 comidas)
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS horario_merienda TIME DEFAULT '17:00';

-- Colación de la tarde (para plan de 5 comidas)
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS horario_colacion_tarde TIME DEFAULT '17:00';

-- num_comidas_dia ya existe desde la migración anterior (perfil_update.sql)
