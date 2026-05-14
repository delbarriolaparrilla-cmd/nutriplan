-- ============================================================
-- NutriPlan — Migración: perfil nutricional completo + auth
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Vincular perfil con el usuario de Supabase Auth
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Datos personales
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS apellido TEXT;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS edad INTEGER;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS sexo TEXT CHECK (sexo IN ('masculino', 'femenino', 'otro'));
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'México';
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS ciudad TEXT;

-- 3. Datos físicos
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS peso_kg DECIMAL;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS estatura_cm DECIMAL;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS imc DECIMAL;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS nivel_actividad TEXT DEFAULT 'moderado';

-- 4. Objetivo
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS objetivo TEXT DEFAULT 'mejorar_salud';

-- 5. Calorías calculadas (calorias_meta ya existe, solo agregamos calorias_base)
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS calorias_base INTEGER;

-- 6. Condiciones y preferencias (JSONB para checkboxes)
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS condiciones_medicas JSONB DEFAULT '{}';
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS preferencias_alimentarias JSONB DEFAULT '{}';

-- 7. Preferencias de comida
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS num_comidas_dia INTEGER DEFAULT 5;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS horario_desayuno TIME DEFAULT '08:00';
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS horario_comida TIME DEFAULT '14:00';
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS horario_cena TIME DEFAULT '20:00';
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS cocina_preferida TEXT;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS otras_restricciones TEXT;

-- 8. Flag para saber si el onboarding fue completado
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS perfil_completo BOOLEAN DEFAULT FALSE;

-- 9. Restricción UNIQUE en user_id (requerida para upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'perfil_user_id_unique'
  ) THEN
    ALTER TABLE perfil ADD CONSTRAINT perfil_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 10. Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_perfil_user_id ON perfil(user_id);

-- ============================================================
-- NOTA: Después de ejecutar esta migración, configura en
-- Supabase → Authentication → Policies las RLS para la tabla
-- perfil, permitiendo a cada usuario leer/escribir solo su fila.
-- ============================================================
