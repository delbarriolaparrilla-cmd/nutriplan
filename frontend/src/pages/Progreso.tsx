import { useEffect, useState } from 'react';
import { Topbar } from '../components/layout/Topbar.js';
import { MacroBar } from '../components/ui/MacroBar.js';
import { getHistorial } from '../lib/api.js';
import { HistorialMacros } from '../types/index.js';

export default function Progreso() {
  const [historial, setHistorial] = useState<HistorialMacros[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistorial(14)
      .then(({ historial }) => setHistorial(historial))
      .catch(() => setHistorial([]))
      .finally(() => setLoading(false));
  }, []);

  const promedio =
    historial.length > 0
      ? historial.reduce(
          (acc, h) => ({
            calorias: acc.calorias + h.calorias_consumidas / historial.length,
            proteina: acc.proteina + h.proteina_g / historial.length,
            carbs: acc.carbs + h.carbs_g / historial.length,
            grasa: acc.grasa + h.grasa_g / historial.length,
          }),
          { calorias: 0, proteina: 0, carbs: 0, grasa: 0 }
        )
      : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Progreso" subtitle="Historial de los últimos 14 días" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: '#F8FDFB' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Cargando historial...
          </div>
        ) : (
          <>
            {promedio && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Promedios diarios</h3>
                <div className="space-y-3">
                  <MacroBar label="Calorías" value={Math.round(promedio.calorias)} max={2000} color="#1D9E75" unit=" kcal" />
                  <MacroBar label="Proteína" value={Math.round(promedio.proteina)} max={120} color="#3B82F6" />
                  <MacroBar label="Carbohidratos" value={Math.round(promedio.carbs)} max={200} color="#F59E0B" />
                  <MacroBar label="Grasas" value={Math.round(promedio.grasa)} max={65} color="#EF4444" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              {historial.map((h) => (
                <div
                  key={h.id}
                  className={`bg-white rounded-xl p-3 border flex items-center justify-between ${
                    h.completado ? 'border-green-100' : 'border-gray-100'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(h.fecha + 'T12:00').toLocaleDateString('es-MX', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      P: {h.proteina_g}g · C: {h.carbs_g}g · G: {h.grasa_g}g
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: '#1D9E75' }}>
                      {h.calorias_consumidas} kcal
                    </p>
                    {h.completado && (
                      <span className="text-xs text-green-600">Completo</span>
                    )}
                  </div>
                </div>
              ))}

              {historial.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <p className="text-gray-500 text-sm">Sin historial registrado aún.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
