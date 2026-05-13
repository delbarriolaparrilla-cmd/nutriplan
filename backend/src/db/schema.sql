-- NutriPlan Database Schema
-- Ejecutar en el SQL Editor de Supabase

-- Perfil del usuario
CREATE TABLE IF NOT EXISTS perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  calorias_meta INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grupos nutricionales (definidos por el nutriólogo)
CREATE TABLE IF NOT EXISTS grupos_nutricionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  cantidad_diaria NUMERIC NOT NULL,
  unidad TEXT NOT NULL,
  porciones_dia INTEGER NOT NULL DEFAULT 1,
  emoji TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alimentos pertenecientes a un grupo
CREATE TABLE IF NOT EXISTS alimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos_nutricionales(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  porcion_gramos NUMERIC,
  porcion_descripcion TEXT,
  calorias_porcion NUMERIC NOT NULL DEFAULT 0,
  proteina_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  grasa_g NUMERIC NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recetas (manuales o generadas por IA)
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tiempo_minutos INTEGER,
  tipo_comida TEXT CHECK (tipo_comida IN ('desayuno', 'colacion', 'comida', 'cena')),
  dificultad TEXT CHECK (dificultad IN ('facil', 'media', 'dificil')) DEFAULT 'facil',
  calorias NUMERIC NOT NULL DEFAULT 0,
  proteina_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  grasa_g NUMERIC NOT NULL DEFAULT 0,
  ingredientes JSONB NOT NULL DEFAULT '[]',
  pasos JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  generada_por_ia BOOLEAN NOT NULL DEFAULT FALSE,
  veces_usada INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plan diario de comidas
CREATE TABLE IF NOT EXISTS plan_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  tipo_comida TEXT NOT NULL CHECK (tipo_comida IN ('desayuno', 'colacion', 'comida', 'cena')),
  receta_id UUID REFERENCES recetas(id) ON DELETE SET NULL,
  hora_programada TIME,
  consumido BOOLEAN NOT NULL DEFAULT FALSE,
  consumido_at TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plan_diario_fecha_tipo_unique UNIQUE (fecha, tipo_comida)
);

-- Historial de macros consumidos por día
CREATE TABLE IF NOT EXISTS historial_macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  calorias_consumidas NUMERIC NOT NULL DEFAULT 0,
  proteina_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  grasa_g NUMERIC NOT NULL DEFAULT 0,
  completado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at en perfil
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER perfil_updated_at
  BEFORE UPDATE ON perfil
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_plan_diario_fecha ON plan_diario(fecha);
CREATE INDEX IF NOT EXISTS idx_recetas_tipo_comida ON recetas(tipo_comida);
CREATE INDEX IF NOT EXISTS idx_recetas_veces_usada ON recetas(veces_usada DESC);
CREATE INDEX IF NOT EXISTS idx_historial_macros_fecha ON historial_macros(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_alimentos_grupo_id ON alimentos(grupo_id);
