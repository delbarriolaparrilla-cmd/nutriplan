import {
  GenerarRecetaParams,
  HistorialMacros,
  PerfilNutricional,
  PlanDiario,
  Receta,
  RecetaGenerada,
  TipoComida,
} from '../types/index.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// --- Recetas ---

export async function generarRecetas(
  params: GenerarRecetaParams
): Promise<{ recetas: RecetaGenerada[] }> {
  return request('/api/recetas/generar', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function guardarReceta(
  receta: Omit<Receta, 'id' | 'created_at' | 'veces_usada'>
): Promise<{ receta: Receta }> {
  return request('/api/recetas/guardar', {
    method: 'POST',
    body: JSON.stringify(receta),
  });
}

export async function listarRecetas(tipo?: TipoComida): Promise<{ recetas: Receta[] }> {
  const query = tipo ? `?tipo=${tipo}` : '';
  return request(`/api/recetas${query}`);
}

export async function recetasRecientes(): Promise<{ recetas: Receta[] }> {
  return request('/api/recetas/recientes');
}

// --- Plan diario ---

export async function getPlanDia(fecha: string): Promise<{ plan: PlanDiario[] }> {
  return request(`/api/plan/${fecha}`);
}

export async function agregarAlPlan(data: {
  fecha: string;
  tipo_comida: TipoComida;
  receta_id?: string;
  hora_programada?: string;
  notas?: string;
}): Promise<{ plan: PlanDiario }> {
  return request('/api/plan', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function marcarConsumido(
  id: string,
  consumido: boolean
): Promise<{ plan: PlanDiario }> {
  return request(`/api/plan/${id}/consumido`, {
    method: 'PATCH',
    body: JSON.stringify({ consumido }),
  });
}

export async function eliminarDePlan(id: string): Promise<void> {
  return request(`/api/plan/${id}`, { method: 'DELETE' });
}

// --- Perfil ---

export async function getPerfil(): Promise<{ perfil: PerfilNutricional | null }> {
  return request('/api/perfil');
}

export async function crearPerfil(data: {
  nombre: string;
  calorias_meta?: number;
}): Promise<{ perfil: PerfilNutricional }> {
  return request('/api/perfil', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Historial ---

export async function getHistorial(dias?: number): Promise<{ historial: HistorialMacros[] }> {
  const query = dias ? `?dias=${dias}` : '';
  return request(`/api/historial${query}`);
}

export async function getHistorialDia(
  fecha: string
): Promise<{ historial: HistorialMacros | null }> {
  return request(`/api/historial/${fecha}`);
}
