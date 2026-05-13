import { useCallback, useEffect, useState } from 'react';
import { PlanDiario, TipoComida } from '../types/index.js';
import { agregarAlPlan, eliminarDePlan, getPlanDia, marcarConsumido } from '../lib/api.js';

export function usePlanDiario(fecha: string) {
  const [plan, setPlan] = useState<PlanDiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    getPlanDia(fecha)
      .then(({ plan }) => setPlan(plan))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async (data: {
    tipo_comida: TipoComida;
    receta_id?: string;
    hora_programada?: string;
    notas?: string;
  }) => {
    const { plan: nuevaEntrada } = await agregarAlPlan({ fecha, ...data });
    setPlan((prev) => {
      const idx = prev.findIndex((p) => p.tipo_comida === nuevaEntrada.tipo_comida);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = nuevaEntrada;
        return next;
      }
      return [...prev, nuevaEntrada];
    });
  };

  const toggleConsumido = async (id: string, consumido: boolean) => {
    const { plan: actualizado } = await marcarConsumido(id, consumido);
    setPlan((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
  };

  const eliminar = async (id: string) => {
    await eliminarDePlan(id);
    setPlan((prev) => prev.filter((p) => p.id !== id));
  };

  return { plan, loading, error, agregar, toggleConsumido, eliminar, recargar: cargar };
}
