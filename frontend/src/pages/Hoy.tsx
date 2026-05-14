import { Topbar } from '../components/layout/Topbar.js';
import { MacrosRow } from '../components/hoy/MacrosRow.js';
import { MealTimeline } from '../components/hoy/MealTimeline.js';
import { usePlanDiario } from '../hooks/usePlanDiario.js';
import { useProfile, getComidas } from '../hooks/useProfile.js';

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

export default function Hoy() {
  const { perfil } = useProfile();
  const comidas = getComidas(perfil);
  const { plan, loading, toggleConsumido, eliminar } = usePlanDiario(hoyISO());

  const macros = plan
    .filter((p) => p.consumido && p.receta)
    .reduce(
      (acc, p) => ({
        calorias: acc.calorias + (p.receta?.calorias ?? 0),
        proteina: acc.proteina + (p.receta?.proteina_g ?? 0),
        carbs: acc.carbs + (p.receta?.carbs_g ?? 0),
        grasa: acc.grasa + (p.receta?.grasa_g ?? 0),
      }),
      { calorias: 0, proteina: 0, carbs: 0, grasa: 0 }
    );

  const fechaLegible = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Hoy" subtitle={fechaLegible} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: '#F8FDFB' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Cargando plan del día...
          </div>
        ) : (
          <>
            <MacrosRow
              calorias={macros.calorias}
              caloriasMax={perfil?.calorias_meta ?? 2000}
              proteina={macros.proteina}
              proteinaMax={120}
              carbs={macros.carbs}
              carbsMax={200}
              grasa={macros.grasa}
              grasaMax={65}
            />
            <MealTimeline
              comidas={comidas}
              plan={plan}
              onToggleConsumido={toggleConsumido}
              onEliminar={eliminar}
            />
          </>
        )}
      </div>
    </div>
  );
}
