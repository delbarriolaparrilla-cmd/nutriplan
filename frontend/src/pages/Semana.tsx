import { useEffect, useState, useCallback } from 'react';
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Topbar } from '../components/layout/Topbar.js';
import { WeekGrid } from '../components/semana/WeekGrid.js';
import { getPlanDia, moverPlan } from '../lib/api.js';
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
        // INTERCAMBIO
        let entradaDest: PlanDiario | undefined;
        for (const dia of prev) {
          entradaDest = dia.plan.find((p) => p.id === planIdDest);
          if (entradaDest) break;
        }
        if (!entradaDest) return prev;

        const origenFecha = entradaOrigen.fecha;
        const origenTipo = entradaOrigen.tipo_comida;

        return prev.map((dia) => ({
          ...dia,
          plan: dia.plan.map((p) => {
            if (p.id === planIdOrigen) return { ...p, fecha: entradaDest!.fecha, tipo_comida: entradaDest!.tipo_comida };
            if (p.id === planIdDest) return { ...p, fecha: origenFecha, tipo_comida: origenTipo };
            return p;
          }),
        }));
      } else {
        // MOVER
        return prev.map((dia) => ({
          ...dia,
          plan: dia.plan.map((p) =>
            p.id === planIdOrigen
              ? { ...p, fecha: fechaDest, tipo_comida: tipoDest }
              : p
          ),
        }));
      }
    });
  };

  // ─── DnD: drag end ───────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const planIdOrigen = String(active.id);
    const overId = String(over.id);

    // over.id puede ser:
    //   "FECHA__TIPO"  → celda vacía (o con entrada)
    // over.data.current puede tener { fecha, tipo } o { entrada }
    const overData = over.data.current as { fecha?: string; tipo?: TipoComida; entrada?: PlanDiario } | undefined;

    let fechaDest: string;
    let tipoDest: TipoComida;
    let planIdDest: string | undefined;

    if (overData?.entrada) {
      // Soltar sobre una tarjeta existente → intercambio
      planIdDest = overData.entrada.id;
      fechaDest  = overData.entrada.fecha;
      tipoDest   = overData.entrada.tipo_comida;
    } else if (overData?.fecha && overData?.tipo) {
      // Soltar sobre celda vacía → mover
      fechaDest = overData.fecha;
      tipoDest  = overData.tipo;
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
      await moverPlan({
        plan_id_origen: planIdOrigen,
        fecha_destino: fechaDest,
        tipo_comida_destino: tipoDest,
        plan_id_destino: planIdDest,
      });
      addToast(planIdDest ? '✓ Recetas intercambiadas' : '✓ Receta movida');
    } catch {
      addToast('Error al mover la receta', 'err');
      // Revertir recargando
      cargarSemana();
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
              <WeekGrid semana={semana} />
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
