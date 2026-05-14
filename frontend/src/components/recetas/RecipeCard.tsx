import { RecetaGenerada } from '../../types/index.js';
import { Badge } from '../ui/Badge.js';

interface RecipeCardProps {
  receta: RecetaGenerada;
  seleccionada: boolean;
  onSeleccionar: () => void;
}

export function RecipeCard({ receta, seleccionada, onSeleccionar }: RecipeCardProps) {
  return (
    <button
      onClick={onSeleccionar}
      className={`w-full text-left rounded-2xl p-4 border-2 transition-all hover:shadow-md ${
        seleccionada
          ? 'border-green-500 bg-green-50 shadow-md'
          : 'border-gray-100 bg-white hover:border-green-200'
      }`}
    >
      {/* Nombre + dificultad */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight pr-2">{receta.nombre}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
            receta.dificultad === 'facil'
              ? 'bg-green-100 text-green-700'
              : receta.dificultad === 'media'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {receta.dificultad}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{receta.descripcion}</p>

      {/* Macros */}
      <div className="flex gap-3 text-xs font-medium mb-3">
        <span style={{ color: '#1D9E75' }}>{receta.calorias} kcal</span>
        <span className="text-blue-600">P: {receta.proteina_g}g</span>
        <span className="text-amber-600">C: {receta.carbs_g}g</span>
        <span className="text-red-500">G: {receta.grasa_g}g</span>
      </div>

      {/* Tags + tiempo + costo */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-wrap gap-1">
          {receta.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} label={tag} color="#1D9E75" />
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {receta.costo_estimado_mxn != null && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              💰 ${receta.costo_estimado_mxn} MXN
            </span>
          )}
          <span className="text-xs text-gray-400">{receta.tiempo_minutos} min</span>
        </div>
      </div>

      {/* Badge SMAE */}
      {receta.grupo_smae_principal && (
        <div className="mb-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#E1F5EE', color: '#085041' }}
          >
            🌿 {receta.grupo_smae_principal}
          </span>
        </div>
      )}

      {/* Nota nutricional */}
      {receta.nota_nutricional && (
        <div
          className="mt-2 px-3 py-2 rounded-xl text-xs text-left leading-relaxed"
          style={{ backgroundColor: '#F0FBF7', color: '#1D6B50' }}
        >
          💡 {receta.nota_nutricional}
        </div>
      )}
    </button>
  );
}
