import { ComidaDia, PlanDiario } from '../../types/index.js';

interface MealTimelineProps {
  /** Franjas de comida del día según la configuración del perfil */
  comidas: ComidaDia[];
  plan: PlanDiario[];
  onToggleConsumido: (id: string, consumido: boolean) => void;
  onEliminar: (id: string) => void;
}

export function MealTimeline({ comidas, plan, onToggleConsumido, onEliminar }: MealTimelineProps) {
  return (
    <div className="flex flex-col gap-3">
      {comidas.map(({ key, tipo, label, hora, emoji }) => {
        // Para cada franja buscamos la entrada del plan por tipo de comida.
        // Nota: cuando hay dos colaciones (5 comidas), ambas muestran la misma
        // entrada de plan (limitación del modelo de datos actual — 4 tipos únicos).
        const entrada = plan.find((p) => p.tipo_comida === tipo);

        return (
          <div
            key={key}
            className={`bg-white rounded-2xl p-4 border transition-all ${
              entrada?.consumido ? 'border-green-200 bg-green-50' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{hora}</p>
                </div>
              </div>

              {entrada ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleConsumido(entrada.id, !entrada.consumido)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                      entrada.consumido
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                    }`}
                  >
                    {entrada.consumido ? 'Consumido' : 'Marcar'}
                  </button>
                  <button
                    onClick={() => onEliminar(entrada.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic">Sin planificar</span>
              )}
            </div>

            {entrada?.receta && (
              <div className="mt-3 pl-9">
                <p className="text-sm font-medium text-gray-800">{entrada.receta.nombre}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>{entrada.receta.calorias} kcal</span>
                  <span>P: {entrada.receta.proteina_g}g</span>
                  <span>C: {entrada.receta.carbs_g}g</span>
                  <span>G: {entrada.receta.grasa_g}g</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
