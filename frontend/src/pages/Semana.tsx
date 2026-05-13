import { useEffect, useState } from 'react';
import { Topbar } from '../components/layout/Topbar.js';
import { WeekGrid } from '../components/semana/WeekGrid.js';
import { getPlanDia } from '../lib/api.js';
import { PlanDiario } from '../types/index.js';

function getSemana(): string[] {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=Dom, 1=Lun, ...
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export default function Semana() {
  const [semana, setSemana] = useState<{ fecha: string; plan: PlanDiario[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const fechas = getSemana();

  useEffect(() => {
    Promise.all(
      fechas.map((fecha) =>
        getPlanDia(fecha)
          .then(({ plan }) => ({ fecha, plan }))
          .catch(() => ({ fecha, plan: [] }))
      )
    )
      .then(setSemana)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Semana" subtitle="Vista semanal de tu plan" />
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#F8FDFB' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Cargando semana...
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 overflow-x-auto">
            <WeekGrid semana={semana} />
          </div>
        )}
      </div>
    </div>
  );
}
