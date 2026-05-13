import { useState } from 'react';
import { Topbar } from '../components/layout/Topbar.js';
import { IngredientSelector } from '../components/recetas/IngredientSelector.js';
import { RecipeCard } from '../components/recetas/RecipeCard.js';
import { RecipeDetail } from '../components/recetas/RecipeDetail.js';
import { useGenerarRecetas } from '../hooks/useRecetas.js';
import { useProfile } from '../hooks/useProfile.js';
import { usePlanDiario } from '../hooks/usePlanDiario.js';
import { RecetaGenerada, TipoComida } from '../types/index.js';

const TIPOS: { value: TipoComida; label: string; emoji: string }[] = [
  { value: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { value: 'colacion', label: 'Colación', emoji: '🍎' },
  { value: 'comida', label: 'Comida', emoji: '🍽️' },
  { value: 'cena', label: 'Cena', emoji: '🌙' },
];

const TIEMPOS = [15, 20, 30, 45];

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

export default function Recetas() {
  useProfile();
  const { agregar } = usePlanDiario(hoyISO());
  const { sugerencias, generando, error, generar, guardar } = useGenerarRecetas();

  const [tipoComida, setTipoComida] = useState<TipoComida>('comida');
  const [ingredientes, setIngredientes] = useState<string[]>([]);
  const [tiempoMax, setTiempoMax] = useState(30);
  const [seleccionada, setSeleccionada] = useState<RecetaGenerada | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  const calorias = {
    desayuno: 400,
    colacion: 200,
    comida: 700,
    cena: 500,
  };

  const handleGenerar = () => {
    setSeleccionada(null);
    setExito(false);
    generar({
      tipoComida,
      ingredientesDisponibles: ingredientes,
      tiempoMaxMinutos: tiempoMax,
      gruposNutricionales: [],
      caloriasObjetivo: calorias[tipoComida],
      recetasRecientes: [],
    });
  };

  const handleAgregarAlPlan = async () => {
    if (!seleccionada) return;
    setGuardando(true);
    try {
      const guardada = await guardar(seleccionada, tipoComida);
      await agregar({ tipo_comida: tipoComida, receta_id: guardada.id });
      setExito(true);
      setSeleccionada(null);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Recetas" subtitle="Genera tu próxima comida con IA" />

      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F8FDFB' }}>
        <div className="max-w-2xl mx-auto p-6 space-y-5">

          {/* Tipo de comida */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Tipo de comida</p>
            <div className="grid grid-cols-4 gap-2">
              {TIPOS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => setTipoComida(value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                    tipoComida === value
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-100 hover:border-green-200'
                  }`}
                  style={tipoComida === value ? { backgroundColor: '#1D9E75', borderColor: '#1D9E75' } : {}}
                >
                  <span className="text-lg">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ingredientes */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <IngredientSelector seleccionados={ingredientes} onChange={setIngredientes} />
          </div>

          {/* Tiempo máximo */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Tiempo máximo: <span style={{ color: '#1D9E75' }}>{tiempoMax} min</span>
            </p>
            <div className="flex gap-2">
              {TIEMPOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTiempoMax(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                    tiempoMax === t
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-100'
                  }`}
                  style={tiempoMax === t ? { backgroundColor: '#1D9E75' } : {}}
                >
                  {t}'
                </button>
              ))}
            </div>
          </div>

          {/* Botón generar */}
          <button
            onClick={handleGenerar}
            disabled={generando}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: '#1D9E75' }}
          >
            {generando ? 'Claude está cocinando...' : 'Generar recetas con IA'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {exito && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
              Receta agregada al plan de hoy.
            </div>
          )}

          {/* Skeleton loading */}
          {generando && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sugerencias */}
          {!generando && sugerencias.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Elige una opción:</p>
              {sugerencias.map((r, i) => (
                <RecipeCard
                  key={i}
                  receta={r}
                  seleccionada={seleccionada === r}
                  onSeleccionar={() => setSeleccionada(seleccionada === r ? null : r)}
                />
              ))}
            </div>
          )}

          {/* Detalle */}
          {seleccionada && (
            <RecipeDetail
              receta={seleccionada}
              tipoComida={tipoComida}
              onAgregarAlPlan={handleAgregarAlPlan}
              guardando={guardando}
            />
          )}
        </div>
      </div>
    </div>
  );
}
