import { RecetaGenerada, TipoComida } from '../../types/index.js';
import { Badge } from '../ui/Badge.js';

interface RecipeDetailProps {
  receta: RecetaGenerada;
  tipoComida: TipoComida;
  onAgregarAlPlan: () => void;
  guardando: boolean;
}

export function RecipeDetail({ receta, tipoComida, onAgregarAlPlan, guardando }: RecipeDetailProps) {
  const tipoLabel: Record<TipoComida, string> = {
    desayuno: 'Desayuno',
    colacion: 'Colación',
    comida: 'Comida',
    cena: 'Cena',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100" style={{ backgroundColor: '#E1F5EE' }}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold" style={{ color: '#085041' }}>{receta.nombre}</h2>
          <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-500">{receta.tiempo_minutos} min</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{receta.descripcion}</p>
        <div className="flex gap-4 text-sm font-semibold">
          <span style={{ color: '#1D9E75' }}>{receta.calorias} kcal</span>
          <span className="text-blue-600">P: {receta.proteina_g}g</span>
          <span className="text-amber-600">C: {receta.carbs_g}g</span>
          <span className="text-red-500">G: {receta.grasa_g}g</span>
        </div>
      </div>

      <div className="p-5">
        {/* Ingredientes */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Ingredientes</h3>
          <ul className="space-y-2">
            {receta.ingredientes.map((ing, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{ing.nombre}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{ing.cantidad}</span>
                  {ing.grupo && <Badge label={ing.grupo} color="#1D9E75" />}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Pasos */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Preparación</h3>
          <ol className="space-y-3">
            {receta.pasos.map((paso, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span
                  className="shrink-0 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold mt-0.5"
                  style={{ backgroundColor: '#1D9E75' }}
                >
                  {i + 1}
                </span>
                <span className="text-gray-600">{paso}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tags */}
        {receta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-5">
            {receta.tags.map((tag) => (
              <Badge key={tag} label={tag} color="#1D9E75" />
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onAgregarAlPlan}
          disabled={guardando}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#1D9E75' }}
        >
          {guardando ? 'Guardando...' : `Agregar al plan → ${tipoLabel[tipoComida]}`}
        </button>
      </div>
    </div>
  );
}
