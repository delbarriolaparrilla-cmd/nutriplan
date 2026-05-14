import { Topbar } from '../components/layout/Topbar.js';
import { MacrosRow } from '../components/hoy/MacrosRow.js';
import { MealTimeline } from '../components/hoy/MealTimeline.js';
import { usePlanDiario } from '../hooks/usePlanDiario.js';
import { useProfile, getComidas } from '../hooks/useProfile.js';

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

function getSaludo(nombre?: string): string {
  const h = new Date().getHours();
  const greeting =
    h < 12 ? 'Buenos días' :
    h < 19 ? 'Buenas tardes' :
             'Buenas noches';
  return nombre ? `${greeting}, ${nombre.split(' ')[0]} 👋` : `${greeting} 👋`;
}

/** Barra de progreso calórico del día */
function CalorieBar({ consumidas, meta }: { consumidas: number; meta: number }) {
  const pct = Math.min((consumidas / Math.max(meta, 1)) * 100, 100);
  const over = consumidas > meta;
  return (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '16px 18px',
      border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>Calorías del día</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: over ? '#F59E0B' : '#1D9E75' }}>
          {consumidas} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>/ {meta} kcal</span>
        </span>
      </div>
      <div className="calorie-bar-track">
        <div
          className={`calorie-bar-fill${over ? ' over' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>0 kcal</span>
        <span style={{ fontSize: '11px', color: over ? '#F59E0B' : '#9CA3AF' }}>
          {over
            ? `+${consumidas - meta} kcal sobre la meta`
            : `${meta - consumidas} kcal restantes`}
        </span>
      </div>
    </div>
  );
}

export default function Hoy() {
  const { perfil } = useProfile();
  const comidas = getComidas(perfil);
  const { plan, loading, toggleConsumido, eliminar } = usePlanDiario(hoyISO());

  const macros = plan
    .filter((p) => p.consumido && p.receta)
    .reduce(
      (acc, p) => ({
        calorias:  acc.calorias  + (p.receta?.calorias    ?? 0),
        proteina:  acc.proteina  + (p.receta?.proteina_g  ?? 0),
        carbs:     acc.carbs     + (p.receta?.carbs_g     ?? 0),
        grasa:     acc.grasa     + (p.receta?.grasa_g     ?? 0),
      }),
      { calorias: 0, proteina: 0, carbs: 0, grasa: 0 }
    );

  const fechaLegible = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const calMeta = perfil?.calorias_meta ?? 2000;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Hoy" subtitle={fechaLegible} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#F8FDFB' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Cargando plan del día...
          </div>
        ) : (
          <>
            {/* Saludo personalizado */}
            <div style={{
              background: 'var(--color-primary-light)',
              borderRadius: '16px',
              padding: '16px 18px',
              border: '1px solid #A7E3C8',
            }}>
              <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                {getSaludo(perfil?.nombre)}
              </p>
              <p style={{ fontSize: '13px', color: '#2D7A5E', marginTop: '3px' }}>
                {macros.calorias > 0
                  ? `Llevas ${macros.calorias} kcal consumidas hoy`
                  : 'Aún no has marcado ninguna comida hoy'}
              </p>
            </div>

            {/* Barra de progreso calórico */}
            <CalorieBar consumidas={macros.calorias} meta={calMeta} />

            {/* Macros detallados */}
            <MacrosRow
              calorias={macros.calorias}
              caloriasMax={calMeta}
              proteina={macros.proteina}
              proteinaMax={120}
              carbs={macros.carbs}
              carbsMax={200}
              grasa={macros.grasa}
              grasaMax={65}
            />

            {/* Timeline de comidas */}
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
