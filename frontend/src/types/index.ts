// ============================================================
// Tipos base del dominio NutriPlan
// ============================================================

export type NivelActividad = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo';
export type Objetivo =
  | 'perder_peso'
  | 'mantener_peso'
  | 'ganar_musculo'
  | 'mejorar_salud'
  | 'control_medico';
export type Sexo = 'masculino' | 'femenino' | 'otro';

export interface CondicionesMedicas {
  diabetes_tipo1?: boolean;
  diabetes_tipo2?: boolean;
  hipertension?: boolean;
  colesterol_alto?: boolean;
  intolerancia_lactosa?: boolean;
  intolerancia_gluten?: boolean;
  enfermedad_celiaca?: boolean;
  hipotiroidismo?: boolean;
  hipertiroidismo?: boolean;
  sindrome_intestino_irritable?: boolean;
}

export interface PreferenciasAlimentarias {
  vegetariano?: boolean;
  vegano?: boolean;
  sin_cerdo?: boolean;
  sin_mariscos?: boolean;
  sin_nueces?: boolean;
  sin_huevo?: boolean;
}

export interface PerfilNutricional {
  id: string;
  user_id?: string;
  // Datos personales
  nombre: string;
  apellido?: string;
  fecha_nacimiento?: string;
  edad?: number;
  sexo?: Sexo;
  pais?: string;
  ciudad?: string;
  // Datos físicos
  peso_kg?: number;
  estatura_cm?: number;
  imc?: number;
  nivel_actividad?: NivelActividad;
  // Objetivo
  objetivo?: Objetivo;
  // Calorías
  calorias_base?: number;
  calorias_meta: number;
  // Condiciones y preferencias
  condiciones_medicas?: CondicionesMedicas;
  preferencias_alimentarias?: PreferenciasAlimentarias;
  // Horarios y preferencias de comida
  num_comidas_dia?: number;
  horario_desayuno?: string;
  horario_comida?: string;
  horario_cena?: string;
  cocina_preferida?: string;
  otras_restricciones?: string;
  // Estado del onboarding
  perfil_completo?: boolean;
  // Timestamps
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
  tipo_comida: TipoComida;
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
  tipo_comida: TipoComida;
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

export type TipoComida = 'desayuno' | 'colacion' | 'comida' | 'cena';

export interface GenerarRecetaParams {
  tipoComida: TipoComida;
  ingredientesDisponibles: string[];
  tiempoMaxMinutos: number;
  gruposNutricionales: GrupoNutricional[];
  caloriasObjetivo: number;
  recetasRecientes: string[];
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
}

export interface Macros {
  calorias: number;
  proteina_g: number;
  carbs_g: number;
  grasa_g: number;
}
