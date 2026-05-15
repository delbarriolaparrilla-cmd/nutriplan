-- ═══════════════════════════════════════════════════════════════
-- NutriBarrio — Esquema de administración y suscripciones
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Tabla de suscripciones
CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  estado TEXT CHECK (estado IN (
    'prueba',      -- 7 días gratis
    'activa',      -- pagó y está al corriente
    'gracia',      -- venció, tiene 2 días de gracia
    'suspendida',  -- no pagó, acceso bloqueado
    'cancelada'    -- canceló voluntariamente
  )) DEFAULT 'prueba',
  plan TEXT CHECK (plan IN (
    'mensual', 'trimestral', 'anual', 'prueba'
  )) DEFAULT 'prueba',
  precio_pagado DECIMAL DEFAULT 0,
  fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  fecha_vencimiento TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  fecha_ultimo_pago TIMESTAMPTZ,
  tokens_consumidos_mes INTEGER DEFAULT 0,
  tokens_limite_mes INTEGER DEFAULT 28000,
  -- prueba: 28000 tokens (~14 generaciones)
  -- mensual/trimestral/anual: 200000 tokens (~100 generaciones)
  notas_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabla de pagos registrados manualmente
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  suscripcion_id UUID REFERENCES suscripciones(id),
  monto DECIMAL NOT NULL,
  plan TEXT NOT NULL,
  metodo_pago TEXT CHECK (metodo_pago IN (
    'efectivo', 'transferencia', 'otro'
  )),
  referencia TEXT,
  fecha_pago TIMESTAMPTZ DEFAULT NOW(),
  registrado_por UUID, -- siempre el admin
  notas TEXT
);

-- Tabla de uso de tokens por día
CREATE TABLE IF NOT EXISTS uso_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  fecha DATE DEFAULT CURRENT_DATE,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  num_generaciones INTEGER DEFAULT 0,
  costo_estimado_usd DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fecha)
);

-- Tabla de configuración admin
CREATE TABLE IF NOT EXISTS admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  precio_mensual DECIMAL DEFAULT 79,
  precio_trimestral DECIMAL DEFAULT 199,
  precio_anual DECIMAL DEFAULT 699,
  dias_prueba INTEGER DEFAULT 7,
  dias_gracia INTEGER DEFAULT 2,
  tokens_prueba INTEGER DEFAULT 28000,
  tokens_mensuales INTEGER DEFAULT 200000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ RLS ════════════════════════════════════════════════════════

ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_tokens ENABLE ROW LEVEL SECURITY;

-- Suscripciones: el usuario ve la suya, admin ve todas
CREATE POLICY "suscripcion_propio_o_admin" ON suscripciones
  FOR ALL USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'email' = 'oscar.rodrigo.chavez@gmail.com'
  );

-- Pagos: solo admin
CREATE POLICY "pagos_solo_admin" ON pagos
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'oscar.rodrigo.chavez@gmail.com'
  );

-- Tokens: el usuario ve el suyo, admin ve todos
CREATE POLICY "tokens_propio_o_admin" ON uso_tokens
  FOR ALL USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'email' = 'oscar.rodrigo.chavez@gmail.com'
  );

-- ═══ FUNCIONES ══════════════════════════════════════════════════

-- Incrementar tokens consumidos del mes
CREATE OR REPLACE FUNCTION incrementar_tokens(
  p_user_id UUID,
  p_tokens INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE suscripciones
  SET tokens_consumidos_mes = tokens_consumidos_mes + p_tokens,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registrar uso de tokens por día (upsert acumulativo)
CREATE OR REPLACE FUNCTION registrar_uso_tokens(
  p_user_id UUID,
  p_fecha DATE,
  p_tokens_input INTEGER,
  p_tokens_output INTEGER,
  p_costo_usd DECIMAL
)
RETURNS void AS $$
BEGIN
  INSERT INTO uso_tokens (
    user_id, fecha, tokens_input, tokens_output,
    tokens_total, num_generaciones, costo_estimado_usd
  ) VALUES (
    p_user_id, p_fecha, p_tokens_input, p_tokens_output,
    p_tokens_input + p_tokens_output, 1, p_costo_usd
  )
  ON CONFLICT (user_id, fecha) DO UPDATE SET
    tokens_input       = uso_tokens.tokens_input + EXCLUDED.tokens_input,
    tokens_output      = uso_tokens.tokens_output + EXCLUDED.tokens_output,
    tokens_total       = uso_tokens.tokens_total + EXCLUDED.tokens_total,
    num_generaciones   = uso_tokens.num_generaciones + 1,
    costo_estimado_usd = uso_tokens.costo_estimado_usd + EXCLUDED.costo_estimado_usd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: crear suscripción prueba automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION crear_suscripcion_prueba()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.suscripciones (user_id, estado, plan, tokens_limite_mes)
  VALUES (NEW.id, 'prueba', 'prueba', 28000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asociar trigger a auth.users (ejecutar como superusuario)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION crear_suscripcion_prueba();

-- ═══ DATOS INICIALES ════════════════════════════════════════════

-- Insertar config admin (ejecutar después de crear el admin en Supabase)
-- INSERT INTO admin_config (admin_user_id, ...)
-- VALUES ((SELECT id FROM auth.users WHERE email = 'oscar.rodrigo.chavez@gmail.com'), ...);

-- Para usuarios ya existentes sin suscripción, crear registros de prueba:
-- INSERT INTO suscripciones (user_id, estado, plan, tokens_limite_mes)
-- SELECT id, 'activa', 'mensual', 200000
-- FROM auth.users
-- WHERE id NOT IN (SELECT user_id FROM suscripciones WHERE user_id IS NOT NULL)
-- ON CONFLICT DO NOTHING;
