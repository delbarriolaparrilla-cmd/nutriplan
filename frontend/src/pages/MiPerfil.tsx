import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile, calcularMacros, categoriaIMC, recomendarComidas } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Topbar } from '../components/layout/Topbar.js';
import {
  CondicionesMedicas,
  PreferenciasAlimentarias,
  Objetivo,
  NivelActividad,
} from '../types/index.js';

// ──────────────────────────────────────────────
// Labels legibles
// ──────────────────────────────────────────────

const OBJETIVO_LABELS: Record<Objetivo, { label: string; emoji: string; desc: string }> = {
  perder_peso: { label: 'Perder peso', emoji: '🔥', desc: 'Déficit calórico de 500 kcal/día' },
  mantener_peso: { label: 'Mantener peso', emoji: '⚖️', desc: 'Equilibrio calórico' },
  ganar_musculo: { label: 'Ganar músculo', emoji: '💪', desc: 'Superávit de 300 kcal/día + más proteína' },
  mejorar_salud: { label: 'Mejorar mi salud', emoji: '🌿', desc: 'Alimentación balanceada y sostenible' },
  control_medico: { label: 'Control médico', emoji: '🏥', desc: 'Bajo supervisión de especialista' },
};

const ACTIVIDAD_LABELS: Record<NivelActividad, string> = {
  sedentario: 'Sedentario',
  ligero: 'Ligero (1–3 días/semana)',
  moderado: 'Moderado (3–5 días/semana)',
  activo: 'Activo (6–7 días/semana)',
  muy_activo: 'Muy activo',
};

const CONDICION_LABELS: Record<keyof CondicionesMedicas, string> = {
  diabetes_tipo1: 'Diabetes tipo 1',
  diabetes_tipo2: 'Diabetes tipo 2',
  hipertension: 'Hipertensión',
  colesterol_alto: 'Colesterol alto',
  intolerancia_lactosa: 'Intolerancia a la lactosa',
  intolerancia_gluten: 'Intolerancia al gluten',
  enfermedad_celiaca: 'Enfermedad celiaca',
  hipotiroidismo: 'Hipotiroidismo',
  hipertiroidismo: 'Hipertiroidismo',
  sindrome_intestino_irritable: 'Sínd. intestino irritable',
};

const PREFERENCIA_LABELS: Record<keyof PreferenciasAlimentarias, string> = {
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  sin_cerdo: 'Sin cerdo',
  sin_mariscos: 'Sin mariscos',
  sin_nueces: 'Sin nueces',
  sin_huevo: 'Sin huevo',
};

// ──────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function MacroBar({
  label,
  grams,
  pct,
  color,
}: {
  label: string;
  grams: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs text-gray-500">
          {grams}g <span className="text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────

// Inputs de hora por número de comidas (mismo mapa que Onboarding)
type CampoHorario =
  | 'horario_desayuno' | 'horario_colacion_manana' | 'horario_comida'
  | 'horario_merienda' | 'horario_colacion_tarde'  | 'horario_cena';

interface InputHora { campo: CampoHorario; label: string; emoji: string }

const HORARIOS_POR_COMIDAS: Record<3 | 4 | 5, InputHora[]> = {
  3: [
    { campo: 'horario_desayuno', label: 'Desayuno', emoji: '🌅' },
    { campo: 'horario_comida',   label: 'Comida',   emoji: '🍽️' },
    { campo: 'horario_cena',     label: 'Cena',     emoji: '🌙' },
  ],
  4: [
    { campo: 'horario_desayuno', label: 'Desayuno', emoji: '🌅' },
    { campo: 'horario_comida',   label: 'Comida',   emoji: '🍽️' },
    { campo: 'horario_merienda', label: 'Merienda', emoji: '🍎' },
    { campo: 'horario_cena',     label: 'Cena',     emoji: '🌙' },
  ],
  5: [
    { campo: 'horario_desayuno',        label: 'Desayuno',        emoji: '🌅' },
    { campo: 'horario_colacion_manana', label: 'Colación mañana', emoji: '🍎' },
    { campo: 'horario_comida',          label: 'Comida',          emoji: '🍽️' },
    { campo: 'horario_colacion_tarde',  label: 'Colación tarde',  emoji: '🫐' },
    { campo: 'horario_cena',            label: 'Cena',            emoji: '🌙' },
  ],
};

interface HorariosState {
  num_comidas_dia: number;
  horario_desayuno: string;
  horario_colacion_manana: string;
  horario_comida: string;
  horario_merienda: string;
  horario_colacion_tarde: string;
  horario_cena: string;
}

/**
 * Asegura que el valor de un <input type="time"> se envíe como "HH:MM:SS"
 * (formato que aceptan las columnas TIME de PostgreSQL/Supabase).
 * Los inputs de hora devuelven "HH:MM"; si ya tiene segundos los conserva.
 */
function formatTime(value: string): string {
  if (!value) return '00:00:00';
  const parts = value.split(':');
  const hh = parts[0]?.padStart(2, '0') ?? '00';
  const mm = parts[1]?.padStart(2, '0') ?? '00';
  const ss = parts[2]?.padStart(2, '0') ?? '00';
  return `${hh}:${mm}:${ss}`;
}

export default function MiPerfil() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { perfil, loading, recargarPerfil } = useProfile();

  // ── Estado local para la sección de horarios ──
  const [horarios, setHorarios] = useState<HorariosState>({
    num_comidas_dia: 5,
    horario_desayuno: '08:00',
    horario_colacion_manana: '11:00',
    horario_comida: '14:00',
    horario_merienda: '17:00',
    horario_colacion_tarde: '17:00',
    horario_cena: '20:00',
  });
  const [guardandoHorarios, setGuardandoHorarios] = useState(false);
  const [toast, setToast] = useState('');

  // Sincronizar con el perfil cuando carga
  useEffect(() => {
    if (!perfil) return;
    setHorarios({
      num_comidas_dia:         perfil.num_comidas_dia          ?? 5,
      horario_desayuno:        perfil.horario_desayuno         ?? '08:00',
      horario_colacion_manana: perfil.horario_colacion_manana  ?? '11:00',
      horario_comida:          perfil.horario_comida           ?? '14:00',
      horario_merienda:        perfil.horario_merienda         ?? '17:00',
      horario_colacion_tarde:  perfil.horario_colacion_tarde   ?? '17:00',
      horario_cena:            perfil.horario_cena             ?? '20:00',
    });
  }, [perfil]);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleGuardarHorarios = async () => {
    if (!user) return;
    setGuardandoHorarios(true);
    try {
      // Upsert directo: solo los campos de horarios + id.
      // No pasamos por guardarPerfil() para evitar que recalcule y agregue
      // campos extra (imc, calorias_meta…) que causarían un 400 en Supabase.
      // UPDATE (no upsert) porque la fila ya existe — el perfil se crea
      // en el Onboarding. Un upsert sin todos los campos NOT NULL (nombre, etc.)
      // intentaría INSERT y fallaría con violación de constraint.
      const { error: sbError } = await supabase
        .from('perfil')
        .update({
          num_comidas_dia:          horarios.num_comidas_dia,
          horario_desayuno:         formatTime(horarios.horario_desayuno),
          horario_colacion_manana:  formatTime(horarios.horario_colacion_manana),
          horario_comida:           formatTime(horarios.horario_comida),
          horario_colacion_tarde:   formatTime(horarios.horario_colacion_tarde),
          horario_cena:             formatTime(horarios.horario_cena),
        })
        .eq('id', user.id);

      if (sbError) throw new Error(sbError.message);

      // Refrescar el perfil en memoria para que MealTimeline y Hoy.tsx
      // reflejen los nuevos horarios sin recargar la página.
      await recargarPerfil();
      mostrarToast('✓ Horarios guardados correctamente');
    } catch (err) {
      console.error('Error al guardar horarios:', err);
      mostrarToast('Error al guardar. Intenta de nuevo.');
    }
    setGuardandoHorarios(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Topbar title="Mi Perfil" />
        <div
          className="flex-1 flex items-center justify-center"
          style={{ backgroundColor: '#F8FDFB' }}
        >
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Topbar title="Mi Perfil" />
        <div
          className="flex-1 flex items-center justify-center"
          style={{ backgroundColor: '#F8FDFB' }}
        >
          <p className="text-gray-500 text-sm">No se encontró tu perfil.</p>
        </div>
      </div>
    );
  }

  const macros = calcularMacros(perfil);
  const catIMC = perfil.imc ? categoriaIMC(perfil.imc) : null;
  const objetivo = perfil.objetivo ? OBJETIVO_LABELS[perfil.objetivo] : null;

  // Badges de condiciones activas
  const condicionesActivas = Object.entries(perfil.condiciones_medicas ?? {})
    .filter(([, v]) => v)
    .map(([k]) => CONDICION_LABELS[k as keyof CondicionesMedicas] ?? k);

  const preferenciasActivas = Object.entries(perfil.preferencias_alimentarias ?? {})
    .filter(([, v]) => v)
    .map(([k]) => PREFERENCIA_LABELS[k as keyof PreferenciasAlimentarias] ?? k);

  // Porcentajes de macros para las barras
  const totalKcal = macros.calorias || 1;
  const protPct = Math.round(((macros.proteina_g * 4) / totalKcal) * 100);
  const carbsPct = Math.round(((macros.carbs_g * 4) / totalKcal) * 100);
  const grasaPct = Math.round(((macros.grasa_g * 9) / totalKcal) * 100);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Mi Perfil" />

      <div
        className="flex-1 overflow-y-auto p-6"
        style={{ backgroundColor: '#F8FDFB' }}
      >
        {/* Header con nombre y botón editar */}
        <div
          className="rounded-2xl p-6 mb-5 flex items-center justify-between"
          style={{ backgroundColor: '#E1F5EE' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: '#1D9E75' }}
            >
              {perfil.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#085041' }}>
                {perfil.nombre} {perfil.apellido}
              </h2>
              {perfil.ciudad && (
                <p className="text-sm" style={{ color: '#1D9E75' }}>
                  📍 {perfil.ciudad}{perfil.pais ? `, ${perfil.pais}` : ''}
                </p>
              )}
              {objetivo && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {objetivo.emoji} {objetivo.label}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1D9E75' }}
          >
            ✏️ Editar perfil
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── Mis métricas ── */}
          <SectionCard title="Mis métricas">
            {/* IMC visual */}
            {perfil.imc && catIMC && (
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
                style={{ backgroundColor: `${catIMC.color}12` }}
              >
                <div>
                  <p className="text-xs text-gray-500">Índice de Masa Corporal</p>
                  <p className="text-3xl font-bold mt-0.5" style={{ color: catIMC.color }}>
                    {perfil.imc}
                  </p>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: catIMC.color }}
                >
                  {catIMC.label}
                </span>
              </div>
            )}

            <DataRow label="Peso" value={perfil.peso_kg ? `${perfil.peso_kg} kg` : undefined} />
            <DataRow label="Estatura" value={perfil.estatura_cm ? `${perfil.estatura_cm} cm` : undefined} />
            <DataRow label="Edad" value={perfil.edad ? `${perfil.edad} años` : undefined} />
            <DataRow
              label="Nivel de actividad"
              value={perfil.nivel_actividad ? ACTIVIDAD_LABELS[perfil.nivel_actividad] : undefined}
            />
          </SectionCard>

          {/* ── Calorías y macros ── */}
          <SectionCard title="Calorías y macros diarios">
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
              style={{ backgroundColor: '#F0FBF7' }}
            >
              <div>
                <p className="text-xs text-gray-500">Meta calórica diaria</p>
                <p className="text-3xl font-bold" style={{ color: '#1D9E75' }}>
                  {macros.calorias}
                </p>
              </div>
              <span className="text-sm text-gray-500">kcal</span>
            </div>

            <div className="flex flex-col gap-3">
              <MacroBar label="Proteína" grams={macros.proteina_g} pct={protPct} color="#1D9E75" />
              <MacroBar label="Carbohidratos" grams={macros.carbs_g} pct={carbsPct} color="#60A5FA" />
              <MacroBar label="Grasas" grams={macros.grasa_g} pct={grasaPct} color="#F59E0B" />
            </div>
          </SectionCard>

          {/* ── Mi objetivo ── */}
          {objetivo && (
            <SectionCard title="Mi objetivo">
              <div
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ backgroundColor: '#F0FBF7' }}
              >
                <span className="text-3xl">{objetivo.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-800">{objetivo.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{objetivo.desc}</p>
                  {perfil.calorias_base && perfil.calorias_meta !== perfil.calorias_base && (
                    <p className="text-xs text-gray-400 mt-2">
                      Calorías base: {perfil.calorias_base} kcal →{' '}
                      <span style={{ color: '#1D9E75' }}>Meta: {perfil.calorias_meta} kcal</span>
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── Datos personales ── */}
          <SectionCard title="Datos personales">
            <DataRow label="Nombre completo" value={`${perfil.nombre}${perfil.apellido ? ' ' + perfil.apellido : ''}`} />
            <DataRow label="Fecha de nacimiento" value={perfil.fecha_nacimiento} />
            <DataRow label="Sexo" value={
              perfil.sexo === 'masculino' ? 'Masculino' :
              perfil.sexo === 'femenino' ? 'Femenino' :
              perfil.sexo === 'otro' ? 'Otro' : undefined
            } />
            <DataRow label="País" value={perfil.pais} />
            <DataRow label="Ciudad" value={perfil.ciudad} />
          </SectionCard>

          {/* ── Condiciones y restricciones ── */}
          {(condicionesActivas.length > 0 ||
            preferenciasActivas.length > 0 ||
            perfil.otras_restricciones) && (
            <SectionCard title="Condiciones y restricciones">
              {condicionesActivas.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Condiciones médicas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {condicionesActivas.map((c) => (
                      <span
                        key={c}
                        className="px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: '#EF4444' }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {preferenciasActivas.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Preferencias alimentarias
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preferenciasActivas.map((p) => (
                      <span
                        key={p}
                        className="px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: '#1D9E75' }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {perfil.otras_restricciones && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Otras restricciones
                  </p>
                  <p className="text-sm text-gray-700">{perfil.otras_restricciones}</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Horarios de comida (editables) ── */}
          <SectionCard title="Horarios de comida">
            {/* Chip de recomendación */}
            {perfil.objetivo && perfil.nivel_actividad && (() => {
              const rec = recomendarComidas(perfil.objetivo, perfil.nivel_actividad);
              return (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 w-fit"
                  style={{ backgroundColor: '#E1F5EE', border: '1px solid #A7E3C8' }}>
                  <span>✨</span>
                  <span className="text-xs font-medium" style={{ color: '#085041' }}>
                    Recomendado para tu perfil: <strong>{rec} comidas</strong>
                  </span>
                </div>
              );
            })()}

            {/* Selector número de comidas */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Comidas al día
              </p>
              <div className="flex gap-2">
                {([3, 4, 5] as const).map((n) => (
                  <button key={n} type="button"
                    onClick={() => setHorarios(h => ({ ...h, num_comidas_dia: n }))}
                    className="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all"
                    style={{
                      borderColor:     horarios.num_comidas_dia === n ? '#1D9E75' : '#E5E7EB',
                      backgroundColor: horarios.num_comidas_dia === n ? '#F0FBF7' : '#fff',
                      color:           horarios.num_comidas_dia === n ? '#085041' : '#6B7280',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs de hora */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {(HORARIOS_POR_COMIDAS[horarios.num_comidas_dia as 3 | 4 | 5] ?? HORARIOS_POR_COMIDAS[5])
                .map(({ campo, label, emoji }) => (
                  <div key={campo}>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                      <span>{emoji}</span> {label}
                    </label>
                    <input
                      type="time"
                      value={horarios[campo] as string}
                      onChange={e => setHorarios(h => ({ ...h, [campo]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                ))}
            </div>

            {/* Botón guardar */}
            <button
              onClick={handleGuardarHorarios}
              disabled={guardandoHorarios}
              className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#1D9E75' }}
            >
              {guardandoHorarios ? 'Guardando…' : 'Guardar horarios'}
            </button>
          </SectionCard>
        </div>
      </div>

      {/* Toast de confirmación */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg z-50 transition-all"
          style={{ backgroundColor: toast.startsWith('✓') ? '#1D9E75' : '#EF4444' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
