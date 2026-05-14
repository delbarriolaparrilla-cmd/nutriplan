import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  PerfilNutricional,
  Macros,
  NivelActividad,
  Objetivo,
  Sexo,
} from '../types/index.js';

// ──────────────────────────────────────────────
// Constantes para cálculos
// ──────────────────────────────────────────────

const ACTIVITY_FACTORS: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
};

const OBJETIVO_ADJUSTMENTS: Record<Objetivo, number> = {
  perder_peso: -500,
  mantener_peso: 0,
  ganar_musculo: 300,
  mejorar_salud: 0,
  control_medico: 0,
};

// ──────────────────────────────────────────────
// Funciones puras de cálculo (exportadas)
// ──────────────────────────────────────────────

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad =
    hoy.getFullYear() -
    nac.getFullYear() -
    (hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
      ? 1
      : 0);
  return edad;
}

export function calcularIMC(peso_kg: number, estatura_cm: number): number {
  const estatura_m = estatura_cm / 100;
  return Math.round((peso_kg / (estatura_m * estatura_m)) * 10) / 10;
}

export function categoriaIMC(imc: number): { label: string; color: string } {
  if (imc < 18.5) return { label: 'Bajo peso', color: '#60A5FA' };
  if (imc < 25) return { label: 'Normal', color: '#1D9E75' };
  if (imc < 30) return { label: 'Sobrepeso', color: '#F59E0B' };
  return { label: 'Obesidad', color: '#EF4444' };
}

export function calcularCaloriasMeta(
  peso_kg: number,
  estatura_cm: number,
  fecha_nacimiento: string,
  sexo: Sexo,
  nivel_actividad: NivelActividad,
  objetivo: Objetivo
): number {
  const edad = calcularEdad(fecha_nacimiento);

  // Mifflin-St Jeor
  const tmb =
    sexo === 'masculino'
      ? 10 * peso_kg + 6.25 * estatura_cm - 5 * edad + 5
      : 10 * peso_kg + 6.25 * estatura_cm - 5 * edad - 161;

  const factor = ACTIVITY_FACTORS[nivel_actividad] ?? 1.55;
  const ajuste = OBJETIVO_ADJUSTMENTS[objetivo] ?? 0;

  return Math.round(tmb * factor) + ajuste;
}

/**
 * Distribuye macros según el objetivo y condiciones médicas.
 * - Diabetes tipo 1 o 2: más proteína, menos carbs
 * - Ganar músculo: más proteína
 * - Resto: distribución estándar
 */
export function calcularMacros(perfil: PerfilNutricional): Macros {
  const calorias = perfil.calorias_meta ?? 2000;

  const esDiabetico =
    perfil.condiciones_medicas?.diabetes_tipo1 ||
    perfil.condiciones_medicas?.diabetes_tipo2;

  let protPct: number;
  let carbsPct: number;
  let grasaPct: number;

  if (esDiabetico) {
    // Reducir carbohidratos en diabetes
    protPct = 0.35;
    carbsPct = 0.35;
    grasaPct = 0.30;
  } else if (perfil.objetivo === 'ganar_musculo') {
    protPct = 0.35;
    carbsPct = 0.40;
    grasaPct = 0.25;
  } else {
    protPct = 0.30;
    carbsPct = 0.45;
    grasaPct = 0.25;
  }

  return {
    calorias,
    proteina_g: Math.round((calorias * protPct) / 4),
    carbs_g: Math.round((calorias * carbsPct) / 4),
    grasa_g: Math.round((calorias * grasaPct) / 9),
  };
}

// ──────────────────────────────────────────────
// Hook principal
// ──────────────────────────────────────────────

export function useProfile() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilNutricional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarPerfil = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: sbError } = await supabase
      .from('perfil')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(); // devuelve null en lugar de error si no existe fila

    if (sbError) {
      setError(sbError.message);
    } else {
      setPerfil(data ?? null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  /**
   * Guarda (upsert) el perfil del usuario en Supabase.
   * Calcula automáticamente: edad, IMC, calorias_base, calorias_meta.
   */
  const guardarPerfil = async (
    datos: Partial<PerfilNutricional>
  ): Promise<PerfilNutricional> => {
    if (!user) throw new Error('No autenticado');

    const updates: Record<string, unknown> = {
      ...datos,
      user_id: user.id,
    };

    // Calcular edad
    if (datos.fecha_nacimiento) {
      updates.edad = calcularEdad(datos.fecha_nacimiento);
    }

    // Calcular IMC
    const pesoFinal = datos.peso_kg ?? perfil?.peso_kg;
    const estaturaFinal = datos.estatura_cm ?? perfil?.estatura_cm;
    if (pesoFinal && estaturaFinal) {
      updates.imc = calcularIMC(pesoFinal, estaturaFinal);
    }

    // Calcular calorías meta
    const fechaNac = datos.fecha_nacimiento ?? perfil?.fecha_nacimiento;
    const sexoFinal = (datos.sexo ?? perfil?.sexo) as Sexo | undefined;
    const actividadFinal = (datos.nivel_actividad ?? perfil?.nivel_actividad ?? 'moderado') as NivelActividad;
    const objetivoFinal = (datos.objetivo ?? perfil?.objetivo ?? 'mejorar_salud') as Objetivo;

    if (pesoFinal && estaturaFinal && fechaNac && sexoFinal) {
      const calorias = calcularCaloriasMeta(
        pesoFinal,
        estaturaFinal,
        fechaNac,
        sexoFinal,
        actividadFinal,
        objetivoFinal
      );
      updates.calorias_base = calorias;
      updates.calorias_meta = calorias;
    }

    const { data, error: sbError } = await supabase
      .from('perfil')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (sbError) throw new Error(sbError.message);

    setPerfil(data);
    return data;
  };

  return {
    perfil,
    loading,
    error,
    setPerfil,
    guardarPerfil,
    recargarPerfil: cargarPerfil,
  };
}
