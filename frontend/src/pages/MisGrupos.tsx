import { useEffect, useState } from 'react';
import { Topbar } from '../components/layout/Topbar.js';
import { Badge } from '../components/ui/Badge.js';
import { GrupoNutricional } from '../types/index.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002';

export default function MisGrupos() {
  const [grupos, setGrupos] = useState<GrupoNutricional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/perfil/grupos`)
      .then((r) => r.json())
      .then(({ grupos }) => setGrupos(grupos ?? []))
      .catch(() => setGrupos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Mis Grupos" subtitle="Grupos nutricionales de tu plan" />
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#F8FDFB' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Cargando grupos...
          </div>
        ) : grupos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm mb-1">No hay grupos nutricionales configurados.</p>
            <p className="text-gray-400 text-xs">
              Pide a tu nutriólogo que comparta el plan y extráelo con IA.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {grupos.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-2xl border border-gray-100 p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  {g.emoji && <span className="text-2xl">{g.emoji}</span>}
                  <div>
                    <h3 className="font-semibold text-gray-800">{g.nombre}</h3>
                    {g.descripcion && (
                      <p className="text-xs text-gray-500">{g.descripcion}</p>
                    )}
                  </div>
                  <div className="ml-auto">
                    <Badge
                      label={`${g.cantidad_diaria} ${g.unidad}`}
                      color={g.color ?? '#1D9E75'}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">{g.porciones_dia} porción(es) al día</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
