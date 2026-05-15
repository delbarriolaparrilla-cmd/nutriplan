import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type EstadoSuscripcion = 'prueba' | 'activa' | 'gracia' | 'suspendida' | 'cancelada';

export interface Suscripcion {
  id: string;
  user_id: string;
  estado: EstadoSuscripcion;
  plan: 'mensual' | 'trimestral' | 'anual' | 'prueba';
  precio_pagado: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  fecha_ultimo_pago: string | null;
  tokens_consumidos_mes: number;
  tokens_limite_mes: number;
  notas_admin: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseSuscripcionResult {
  suscripcion: Suscripcion | null;
  loading: boolean;
  /** Días completos hasta el vencimiento (puede ser negativo) */
  diasRestantes: number;
  /** Porcentaje de tokens consumidos (0–100) */
  porcentajeTokens: number;
  /** Si el usuario puede generar recetas (tokens disponibles + no suspendido) */
  puedeGenerar: boolean;
  /** Si el acceso está completamente bloqueado */
  accesoBloqueado: boolean;
}

export function useSuscripcion(): UseSuscripcionResult {
  const { user, loading: authLoading } = useAuth();
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Calcular días restantes desde ahora ──────────────────
  function calcDias(fechaVenc: string): number {
    const diff = new Date(fechaVenc).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // ─── Transición automática de estado si venció ────────────
  const verificarVencimiento = useCallback(async (s: Suscripcion) => {
    const dias = calcDias(s.fecha_vencimiento);

    if (s.estado === 'activa' && dias < 0) {
      // Venció → gracia
      const { data } = await supabase
        .from('suscripciones')
        .update({ estado: 'gracia', updated_at: new Date().toISOString() })
        .eq('id', s.id)
        .select()
        .single();
      if (data) setSuscripcion(data as Suscripcion);
      return data as Suscripcion ?? s;
    }

    if (s.estado === 'gracia' && dias < -2) {
      // Más de 2 días de gracia → suspendida
      const { data } = await supabase
        .from('suscripciones')
        .update({ estado: 'suspendida', updated_at: new Date().toISOString() })
        .eq('id', s.id)
        .select()
        .single();
      if (data) setSuscripcion(data as Suscripcion);
      return data as Suscripcion ?? s;
    }

    return s;
  }, []);

  // ─── Cargar suscripción ────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    supabase
      .from('suscripciones')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(async ({ data, error: _err }) => {
        if (data) {
          const actualizada = await verificarVencimiento(data as Suscripcion);
          setSuscripcion(actualizada);
        } else {
          setSuscripcion(null);
        }
        setLoading(false);
      }, () => setLoading(false));
  }, [user, authLoading, verificarVencimiento]);

  // ─── Derivados ────────────────────────────────────────────
  const diasRestantes = suscripcion
    ? calcDias(suscripcion.fecha_vencimiento)
    : 0;

  const porcentajeTokens = suscripcion && suscripcion.tokens_limite_mes > 0
    ? Math.min(100, Math.round((suscripcion.tokens_consumidos_mes / suscripcion.tokens_limite_mes) * 100))
    : 0;

  const accesoBloqueado = suscripcion?.estado === 'suspendida' || suscripcion?.estado === 'cancelada';

  const puedeGenerar =
    !accesoBloqueado &&
    (suscripcion?.tokens_consumidos_mes ?? 0) < (suscripcion?.tokens_limite_mes ?? 1);

  return { suscripcion, loading, diasRestantes, porcentajeTokens, puedeGenerar, accesoBloqueado };
}
