import {
  GenerarRecetaParams,
  HistorialMacros,
  PerfilNutricional,
  PlanDiario,
  Receta,
  RecetaGenerada,
  TipoComida,
} from '../types/index.js';

// En producción se usa VITE_API_URL (debe ser HTTPS, p. ej. https://tudominio.com).
// Si no está definida en producción, se usan rutas relativas (/api/...) que el
// servidor/proxy resuelve en el mismo origen — evita Mixed Content.
// En desarrollo se usa http://localhost:3003 (puerto del backend local).
const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL ?? '')
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:3003');

/** Error enriquecido con el status HTTP y el body de la respuesta */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new ApiError(
      (body.error as string | undefined) ?? `HTTP ${res.status}`,
      res.status,
      body,
    );
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

// --- Despensa ---

export interface ItemDespensa {
  nombre: string;
  cantidad: string;
  grupo: string;
}

export interface DespensaResult {
  lista: ItemDespensa[];
  dias_con_plan: string[];
  dias_sin_plan: string[];
  total_recetas: number;
  total_ingredientes: number;
}

export async function getDespensa(
  dias: string[],
  num_personas: number
): Promise<DespensaResult> {
  return request('/api/despensa/semana', {
    method: 'POST',
    body: JSON.stringify({ dias, num_personas }),
  });
}

// --- Plan múltiple / mover ---

export interface AgregarMultipleParams {
  receta_id?: string;
  tipo_comida: TipoComida;
  fechas: string[];
  modo: 'repetir' | 'variaciones';
  reemplazar?: boolean;
  perfil_info?: {
    objetivo?: string;
    condiciones?: Record<string, boolean>;
    preferencias?: Record<string, boolean>;
  };
  receta_base?: { nombre: string; calorias: number };
}

export async function agregarMultiple(
  params: AgregarMultipleParams
): Promise<{ insertados: number; omitidos: number }> {
  return request('/api/plan/agregar-multiple', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function moverPlan(params: {
  plan_id_origen: string;
  fecha_destino: string;
  tipo_comida_destino: TipoComida;
  plan_id_destino?: string;
}): Promise<{ origen: PlanDiario; destino?: PlanDiario }> {
  return request('/api/plan/mover', {
    method: 'POST',
    body: JSON.stringify(params),
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
