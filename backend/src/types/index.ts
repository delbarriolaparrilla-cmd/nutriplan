export interface PerfilNutricional {
  id: string;
  nombre: string;
  calorias_meta: number;
  created_at: string;
  updated_at: string;
}

export interface GrupoNutricional {
  id: string;
  nombre: string;
  descripcion?: string;
  cantidad_diaria: number;
  unidad: string;
  porciones_dia: number;
  emoji?: string;
  color?: string;
  created_at: string;
}

export interface Alimento {
  id: string;
  grupo_id: string;
  nombre: string;
  porcion_gramos?: number;
  porcion_descripcion?: string;
  calorias_porcion: number;
  proteina_g: number;
  carbs_g: number;
  grasa_g: number;
  activo: boolean;
  created_at: string;
}

export interface Ingrediente {
  nombre: string;
  cantidad: string;
  grupo?: string;
}

export interface Receta {
  id: string;
  nombre: string;
  descripcion?: string;
  tiempo_minutos?: number;
  tipo_comida: 'desayuno' | 'colacion' | 'comida' | 'cena';
  dificultad: 'facil' | 'media' | 'dificil';
  calorias: number;
  proteina_g: number;
  carbs_g: number;
  grasa_g: number;
  ingredientes: Ingrediente[];
  pasos: string[];
  tags: string[];
  generada_por_ia: boolean;
  veces_usada: number;
  created_at: string;
}

export interface PlanDiario {
  id: string;
  fecha: string;
  tipo_comida: 'desayuno' | 'colacion' | 'comida' | 'cena';
  receta_id?: string;
  receta?: Receta;
  hora_programada?: string;
  consumido: boolean;
  consumido_at?: string;
  notas?: string;
  created_at: string;
}

export interface HistorialMacros {
  id: string;
  fecha: string;
  calorias_consumidas: number;
  proteina_g: number;
  carbs_g: number;
  grasa_g: number;
  completado: boolean;
  created_at: string;
}

export interface GenerarRecetaParams {
  tipoComida: 'desayuno' | 'colacion' | 'comida' | 'cena';
  ingredientesDisponibles: string[];
  tiempoMaxMinutos: number;
  gruposNutricionales: GrupoNutricional[];
  caloriasObjetivo: number;
  recetasRecientes: string[];
  // Datos del perfil para personalizar las recetas según SMAE
  objetivo?: string;
  condicionesMedicas?: Record<string, boolean>;
  preferenciasAlimentarias?: Record<string, boolean>;
}

export interface GenerarVariacionesParams {
  tipoComida: 'desayuno' | 'colacion' | 'comida' | 'cena';
  numDias: number;
  caloriasObjetivo: number;
  objetivo?: string;
  condicionesMedicas?: Record<string, boolean>;
  preferenciasAlimentarias?: Record<string, boolean>;
  recetaBaseNombre?: string;
}

export interface RecetaGenerada {
  nombre: string;
  descripcion: string;
  tiempo_minutos: number;
  dificultad: 'facil' | 'media' | 'dificil';
  calorias: number;
  proteina_g: number;
  carbs_g: number;
  grasa_g: number;
  ingredientes: Ingrediente[];
  pasos: string[];
  tags: string[];
  nota_nutricional?: string;
  grupo_smae_principal?: string;
}
