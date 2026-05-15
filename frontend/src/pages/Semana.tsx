import { useEffect, useState, useCallback } from 'react';
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Topbar } from '../components/layout/Topbar.js';
import { WeekGrid } from '../components/semana/WeekGrid.js';
import { getPlanDia, moverPlan, eliminarDePlan, ApiError } from '../lib/api.js';
import { PlanDiario, TipoComida } from '../types/index.js';

function getSemana(): string[] {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=Dom
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

interface Toast {
  id: number;
  msg: string;
  tipo: 'ok' | 'err';
}

export default function Semana() {
  const [semana, setSemana] = useState<{ fecha: string; plan: PlanDiario[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastId, setToastId] = useState(0);

  const fechas = getSemana();

  // ─── Sensores DnD ────────────────────────────────────────────
  // PointerSensor para mouse, TouchSensor con delay 500ms para long-press en mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
  );

  // ─── Cargar semana ───────────────────────────────────────────
  const cargarSemana = useCallback(() => {
    setLoading(true);
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

  useEffect(() => { cargarSemana(); }, [cargarSemana]);

  // ─── Toast helpers ───────────────────────────────────────────
  const addToast = (msg: string, tipo: 'ok' | 'err' = 'ok') => {
    const id = toastId + 1;
    setToastId(id);
    setToasts((prev) => [...prev, { id, msg, tipo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // ─── DnD: actualización optimista del estado ─────────────────
  const moverEnEstado = (
    planIdOrigen: string,
    fechaDest: string,
    tipoDest: TipoComida,
    planIdDest?: string,
  ) => {
    setSemana((prev) => {
      // Localizar la entrada origen
      let entradaOrigen: PlanDiario | undefined;
      for (const dia of prev) {
        entradaOrigen = dia.plan.find((p) => p.id === planIdOrigen);
        if (entradaOrigen) break;
      }
      if (!entradaOrigen) return prev;

      if (planIdDest) {
        // INTERCAMBIO — el backend swapea receta_id; reflejamos lo mismo en estado:
        // mantenemos fecha/tipo_comida de cada fila, solo intercambiamos receta y receta_id
        let entradaDest: PlanDiario | undefined;
        for (const dia of prev) {
          entradaDest = dia.plan.find((p) => p.id === planIdDest);
          if (entradaDest) break;
        }
        if (!entradaDest) return prev;

        const origenRecetaId = entradaOrigen.receta_id;
        const origenReceta   = entradaOrigen.receta;

        return prev.map((dia) => ({
          ...dia,
          plan: dia.plan.map((p) => {
            if (p.id === planIdOrigen) return { ...p, receta_id: entradaDest!.receta_id, receta: entradaDest!.receta };
            if (p.id === planIdDest)   return { ...p, receta_id: origenRecetaId,          receta: origenReceta };
            return p;
          }),
        }));
      } else {
        // MOVER — la entrada se reubica en otro día/tipo_comida.
        // No basta cambiar los campos: hay que SACAR la entrada del array del día
        // origen e INSERTARLA en el array del día destino, o el grid no la muestra.
        const entradaMovida: PlanDiario = { ...entradaOrigen, fecha: fechaDest, tipo_comida: tipoDest };
        const origenFecha = entradaOrigen.fecha;

        if (origenFecha === fechaDest) {
          // Mismo día, cambio de tipo de comida (columna diferente)
          return prev.map((dia) =>
            dia.fecha === origenFecha
              ? { ...dia, plan: dia.plan.map((p) => p.id === planIdOrigen ? entradaMovida : p) }
              : dia
          );
        }

        return prev.map((dia) => {
          if (dia.fecha === origenFecha) {
            // Quitar del día origen
            return { ...dia, plan: dia.plan.filter((p) => p.id !== planIdOrigen) };
          }
          if (dia.fecha === fechaDest) {
            // Insertar en el día destino
            return { ...dia, plan: [...dia.plan, entradaMovida] };
          }
          return dia;
        });
      }
    });
  };

  // ─── Eliminar entrada del plan ────────────────────────────────
  const handleEliminar = async (planId: string) => {
    // Optimistic: quitar del estado de inmediato
    setSemana((prev) =>
      prev.map((dia) => ({ ...dia, plan: dia.plan.filter((p) => p.id !== planId) }))
    );
    try {
      await eliminarDePlan(planId);
      addToast('✓ Receta eliminada del plan');
      cargarSemana(); // re-fetch para confirmar estado real
    } catch {
      addToast('Error al eliminar la receta', 'err');
      cargarSemana(); // revertir al estado del servidor
    }
  };

  // ─── DnD: drag end ───────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const planIdOrigen = String(active.id);
    const overId = String(over.id);

    // DroppableCell pasa: { fecha, tipo, planIdDest? }
    // planIdDest está presente cuando la celda ya tiene una entrada → intercambio
    const overData = over.data.current as {
      fecha?: string;
      tipo?: TipoComida;
      planIdDest?: string;
    } | undefined;

    let fechaDest: string;
    let tipoDest: TipoComida;
    let planIdDest: string | undefined;

    if (overData?.fecha && overData?.tipo) {
      fechaDest  = overData.fecha;
      tipoDest   = overData.tipo;
      // Si la celda destino tiene entrada y es distinta a la que estamos moviendo
      if (overData.planIdDest && overData.planIdDest !== planIdOrigen) {
        planIdDest = overData.planIdDest;
      }
    } else {
      // Fallback: parsear el id "FECHA__TIPO"
      const [f, t] = overId.split('__');
      if (!f || !t) return;
      fechaDest = f;
      tipoDest  = t as TipoComida;
    }

    // Actualización optimista
    moverEnEstado(planIdOrigen, fechaDest, tipoDest, planIdDest);

    // Vibración haptic en mobile (si está disponible)
    if (navigator.vibrate) navigator.vibrate(30);

    try {
      const result = await moverPlan({
        plan_id_origen: planIdOrigen,
        fecha_destino: fechaDest,
        tipo_comida_destino: tipoDest,
        plan_id_destino: planIdDest,
      });
      addToast(result.destino ? '✓ Recetas intercambiadas' : '✓ Receta movida');
      cargarSemana(); // re-fetch para confirmar estado real del servidor
    } catch (err: unknown) {
      // El backend devuelve 409 cuando la celda destino está ocupada
      // y no se envió plan_id_destino. Reintentar como intercambio automáticamente.
      if (err instanceof ApiError && err.status === 409 && !planIdDest) {
        const planIdOcupado = err.data.plan_id_ocupado as string | undefined;
        if (planIdOcupado) {
          // Actualización optimista para el intercambio
          moverEnEstado(planIdOrigen, fechaDest, tipoDest, planIdOcupado);
          try {
            await moverPlan({
              plan_id_origen: planIdOrigen,
              fecha_destino: fechaDest,
              tipo_comida_destino: tipoDest,
              plan_id_destino: planIdOcupado,
            });
            addToast('✓ Recetas intercambiadas');
            cargarSemana();
            return;
          } catch {
            // Fall through to generic error below
          }
        }
      }
      addToast('Error al mover la receta', 'err');
      cargarSemana(); // revertir al estado del servidor
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <Topbar title="Semana" subtitle="Arrastra para reorganizar tu plan" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ backgroundColor: '#F8FDFB' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Cargando semana...
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 overflow-x-auto">
              <WeekGrid semana={semana} onEliminar={handleEliminar} />
            </div>

            {/* Hint */}
            <p className="text-center text-xs text-gray-400 mt-3">
              Arrastra una receta a otro día para moverla · Suelta sobre otra receta para intercambiar
            </p>
          </DndContext>
        )}
      </div>

      {/* Toasts */}
      <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(({ id, msg, tipo }) => (
          <div
            key={id}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg ${
              tipo === 'ok' ? '' : 'bg-red-500'
            }`}
            style={tipo === 'ok' ? { backgroundColor: '#1D9E75' } : {}}
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
