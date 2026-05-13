import { PlanDiario, TipoComida } from '../../types/index.js';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const COMIDAS: TipoComida[] = ['desayuno', 'colacion', 'comida', 'cena'];

interface WeekGridProps {
  semana: { fecha: string; plan: PlanDiario[] }[];
}

export function WeekGrid({ semana }: WeekGridProps) {
  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-24 p-2 text-xs text-gray-400 font-medium text-left">Comida</th>
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
              <td className="p-2 text-xs font-medium text-gray-500 capitalize">{tipo}</td>
              {semana.map(({ fecha, plan }) => {
                const entrada = plan.find((p) => p.tipo_comida === tipo);
                return (
                  <td
                    key={fecha}
                    className={`p-2 text-center align-middle ${
                      fecha === hoy ? 'bg-green-50' : ''
                    }`}
                  >
                    {entrada?.receta ? (
                      <div
                        title={entrada.receta.nombre}
                        className={`text-xs px-2 py-1 rounded-lg truncate max-w-[80px] mx-auto ${
                          entrada.consumido
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {entrada.receta.nombre.split(' ').slice(0, 2).join(' ')}
                      </div>
                    ) : (
                      <span className="text-gray-200 text-lg">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
