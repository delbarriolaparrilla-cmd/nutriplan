import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { PlanDiario, TipoComida } from '../../types/index.js';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const COMIDAS: TipoComida[] = ['desayuno', 'colacion', 'comida', 'cena'];
const COMIDA_EMOJI: Record<TipoComida, string> = {
  desayuno: '🌅',
  colacion: '🍎',
  comida: '🍽️',
  cena: '🌙',
};

// ─── DraggableCell ─────────────────────────────────────────────────────────

interface DraggableCellProps {
  entrada: PlanDiario;
  onEliminar: (planId: string) => void;
}

function DraggableCell({ entrada, onEliminar }: DraggableCellProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entrada.id,
    data: { entrada },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none', // needed for mobile drag
  };

  return (
    <div className="relative group mx-auto" style={{ maxWidth: 80 }}>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        title={entrada.receta?.nombre ?? ''}
        className={`text-xs px-2 py-1.5 rounded-lg truncate select-none ${
          entrada.consumido
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {entrada.receta
          ? entrada.receta.nombre.split(' ').slice(0, 2).join(' ')
          : '—'}
      </div>
      {/* Delete button — outside drag listeners so it doesn't trigger drag */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onEliminar(entrada.id); }}
        title="Eliminar del plan"
        aria-label="Eliminar del plan"
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-400 text-white text-[10px] leading-none items-center justify-center hidden group-hover:flex"
      >
        ×
      </button>
    </div>
  );
}

// ─── DroppableCell ─────────────────────────────────────────────────────────

interface DroppableCellProps {
  fecha: string;
  tipo: TipoComida;
  entrada: PlanDiario | undefined;
  isToday: boolean;
  onEliminar: (planId: string) => void;
}

function DroppableCell({ fecha, tipo, entrada, isToday, onEliminar }: DroppableCellProps) {
  const id = `${fecha}__${tipo}`;
  // Pass planIdDest so handleDragEnd can detect occupied cells for swap
  const { setNodeRef, isOver } = useDroppable({ id, data: { fecha, tipo, planIdDest: entrada?.id } });

  return (
    <td
      ref={setNodeRef}
      className={`p-1.5 text-center align-middle transition-colors ${
        isToday ? 'bg-green-50' : ''
      } ${isOver ? 'bg-emerald-100 ring-2 ring-inset ring-emerald-300 rounded-lg' : ''}`}
      style={{ minWidth: 84 }}
    >
      {entrada ? (
        <DraggableCell entrada={entrada} onEliminar={onEliminar} />
      ) : (
        <span
          className={`text-gray-200 text-base leading-none ${isOver ? 'opacity-0' : ''}`}
          aria-hidden="true"
        >
          ·
        </span>
      )}
    </td>
  );
}

// ─── WeekGrid ──────────────────────────────────────────────────────────────

interface WeekGridProps {
  semana: { fecha: string; plan: PlanDiario[] }[];
  onEliminar: (planId: string) => void;
}

export function WeekGrid({ semana, onEliminar }: WeekGridProps) {
  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full border-collapse" style={{ minWidth: 520 }}>
        <thead>
          <tr>
            {/* comida label column */}
            <th className="w-20 p-2 text-xs text-gray-400 font-medium text-left" />
            {semana.map(({ fecha }, i) => (
              <th
                key={fecha}
                className={`p-2 text-xs font-semibold text-center ${
                  fecha === hoy ? 'text-white rounded-t-xl' : 'text-gray-600'
                }`}
                style={fecha === hoy ? { backgroundColor: '#1D9E75' } : {}}
              >
                <div>{DIAS[i]}</div>
                <div className="font-normal opacity-70">
                  {new Date(fecha + 'T12:00').getDate()}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMIDAS.map((tipo) => (
            <tr key={tipo} className="border-t border-gray-100">
              <td className="p-2 text-xs font-medium text-gray-400 whitespace-nowrap">
                <span className="mr-1">{COMIDA_EMOJI[tipo]}</span>
                <span className="capitalize">{tipo}</span>
              </td>
              {semana.map(({ fecha, plan }) => {
                const entrada = plan.find((p) => p.tipo_comida === tipo);
                return (
                  <DroppableCell
                    key={fecha}
                    fecha={fecha}
                    tipo={tipo}
                    entrada={entrada}
                    isToday={fecha === hoy}
                    onEliminar={onEliminar}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
