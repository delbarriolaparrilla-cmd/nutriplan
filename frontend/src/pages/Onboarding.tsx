import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile, calcularIMC, categoriaIMC } from '../hooks/useProfile';
import {
  NivelActividad,
  Objetivo,
  Sexo,
  CondicionesMedicas,
  PreferenciasAlimentarias,
} from '../types/index.js';

// ──────────────────────────────────────────────
// Tipos internos del formulario
// ──────────────────────────────────────────────

interface FormState {
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  sexo: Sexo | '';
  pais: string;
  ciudad: string;
  peso_kg: string;
  estatura_cm: string;
  nivel_actividad: NivelActividad;
  objetivo: Objetivo;
  condiciones_medicas: CondicionesMedicas;
  preferencias_alimentarias: PreferenciasAlimentarias;
  otras_restricciones: string;
}

// ──────────────────────────────────────────────
// Datos de configuración
// ──────────────────────────────────────────────

const STEP_LABELS = ['Datos personales', 'Tu cuerpo', 'Tu objetivo', 'Tu salud'];

const ACTIVIDADES: { value: NivelActividad; label: string; desc: string }[] = [
  { value: 'sedentario', label: 'Sedentario', desc: 'Poco o ningún ejercicio' },
  { value: 'ligero', label: 'Ligero', desc: 'Ejercicio 1–3 días/semana' },
  { value: 'moderado', label: 'Moderado', desc: 'Ejercicio 3–5 días/semana' },
  { value: 'activo', label: 'Activo', desc: 'Ejercicio 6–7 días/semana' },
  { value: 'muy_activo', label: 'Muy activo', desc: 'Trabajo físico intenso + ejercicio' },
];

const OBJETIVOS: { value: Objetivo; emoji: string; label: string; desc: string }[] = [
  { value: 'perder_peso', emoji: '🔥', label: 'Perder peso', desc: 'Déficit calórico controlado' },
  { value: 'mantener_peso', emoji: '⚖️', label: 'Mantener peso', desc: 'Equilibrio calórico' },
  { value: 'ganar_musculo', emoji: '💪', label: 'Ganar músculo', desc: 'Superávit + más proteína' },
  { value: 'mejorar_salud', emoji: '🌿', label: 'Mejorar mi salud', desc: 'Alimentación balanceada' },
  { value: 'control_medico', emoji: '🏥', label: 'Control médico', desc: 'Bajo supervisión de especialista' },
];

const CONDICIONES: { key: keyof CondicionesMedicas; label: string }[] = [
  { key: 'diabetes_tipo1', label: 'Diabetes tipo 1' },
  { key: 'diabetes_tipo2', label: 'Diabetes tipo 2' },
  { key: 'hipertension', label: 'Hipertensión' },
  { key: 'colesterol_alto', label: 'Colesterol alto' },
  { key: 'intolerancia_lactosa', label: 'Intolerancia a la lactosa' },
  { key: 'intolerancia_gluten', label: 'Intolerancia al gluten' },
  { key: 'enfermedad_celiaca', label: 'Enfermedad celiaca' },
  { key: 'hipotiroidismo', label: 'Hipotiroidismo' },
  { key: 'hipertiroidismo', label: 'Hipertiroidismo' },
  { key: 'sindrome_intestino_irritable', label: 'Síndrome de intestino irritable' },
];

const PREFERENCIAS: { key: keyof PreferenciasAlimentarias; label: string }[] = [
  { key: 'vegetariano', label: 'Vegetariano' },
  { key: 'vegano', label: 'Vegano' },
  { key: 'sin_cerdo', label: 'Sin cerdo' },
  { key: 'sin_mariscos', label: 'Sin mariscos' },
  { key: 'sin_nueces', label: 'Sin nueces' },
  { key: 'sin_huevo', label: 'Sin huevo' },
];

// ──────────────────────────────────────────────
// Subcomponente: barra de progreso
// ──────────────────────────────────────────────

function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8">
      {/* Barra */}
      <div className="flex items-center gap-0">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              {/* Círculo */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    backgroundColor: done || active ? '#1D9E75' : '#E5E7EB',
                    color: done || active ? '#fff' : '#9CA3AF',
                  }}
                >
                  {done ? '✓' : num}
                </div>
                <span
                  className="text-xs mt-1 font-medium whitespace-nowrap"
                  style={{ color: active ? '#1D9E75' : done ? '#6B7280' : '#9CA3AF' }}
                >
                  {label}
                </span>
              </div>
              {/* Línea conectora */}
              {i < total - 1 && (
                <div
                  className="flex-1 h-0.5 mb-5 mx-1 transition-all"
                  style={{ backgroundColor: done ? '#1D9E75' : '#E5E7EB' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Paso 1: Datos personales
// ──────────────────────────────────────────────

function Step1({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">Cuéntanos sobre ti</h3>
      <p className="text-sm text-gray-500 mb-6">
        Esta información personaliza tu plan nutricional.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
          <input
            type="text"
            value={form.nombre}
            onChange={set('nombre')}
            required
            placeholder="Tu nombre"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido</label>
          <input
            type="text"
            value={form.apellido}
            onChange={set('apellido')}
            placeholder="Tu apellido"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Fecha de nacimiento *
          </label>
          <input
            type="date"
            value={form.fecha_nacimiento}
            onChange={set('fecha_nacimiento')}
            required
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sexo *</label>
          <select
            value={form.sexo}
            onChange={set('sexo')}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="">Seleccionar…</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">País</label>
          <input
            type="text"
            value={form.pais}
            onChange={set('pais')}
            placeholder="México"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
          <input
            type="text"
            value={form.ciudad}
            onChange={set('ciudad')}
            placeholder="Tu ciudad"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Paso 2: Datos físicos
// ──────────────────────────────────────────────

function Step2({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const peso = parseFloat(form.peso_kg);
  const estatura = parseFloat(form.estatura_cm);
  const imc = !isNaN(peso) && !isNaN(estatura) && estatura > 0
    ? calcularIMC(peso, estatura)
    : null;
  const catIMC = imc ? categoriaIMC(imc) : null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">Tu información física</h3>
      <p className="text-sm text-gray-500 mb-6">
        Estos datos calculan tus necesidades calóricas exactas.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Peso (kg) *
          </label>
          <input
            type="number"
            value={form.peso_kg}
            onChange={set('peso_kg')}
            required
            min="30"
            max="300"
            step="0.1"
            placeholder="70"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Estatura (cm) *
          </label>
          <input
            type="number"
            value={form.estatura_cm}
            onChange={set('estatura_cm')}
            required
            min="100"
            max="250"
            step="0.1"
            placeholder="170"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      {/* IMC en tiempo real */}
      {imc && catIMC && (
        <div
          className="mt-4 px-4 py-3 rounded-xl flex items-center justify-between"
          style={{ backgroundColor: `${catIMC.color}15`, border: `1px solid ${catIMC.color}30` }}
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">Tu IMC calculado</p>
            <p className="text-2xl font-bold" style={{ color: catIMC.color }}>
              {imc}
            </p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: catIMC.color }}
          >
            {catIMC.label}
          </div>
        </div>
      )}

      {/* Nivel de actividad */}
      <div className="mt-5">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Nivel de actividad física *
        </label>
        <div className="flex flex-col gap-2">
          {ACTIVIDADES.map(({ value, label, desc }) => (
            <label
              key={value}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
              style={{
                borderColor: form.nivel_actividad === value ? '#1D9E75' : '#E5E7EB',
                backgroundColor: form.nivel_actividad === value ? '#F0FBF7' : '#fff',
              }}
            >
              <input
                type="radio"
                name="nivel_actividad"
                value={value}
                checked={form.nivel_actividad === value}
                onChange={() => setForm((f) => ({ ...f, nivel_actividad: value }))}
                className="sr-only"
              />
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: form.nivel_actividad === value ? '#1D9E75' : '#D1D5DB' }}
              >
                {form.nivel_actividad === value && (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1D9E75' }} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Paso 3: Objetivo
// ──────────────────────────────────────────────

function Step3({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">¿Cuál es tu objetivo?</h3>
      <p className="text-sm text-gray-500 mb-6">
        Ajustamos tus calorías y macros para alcanzarlo.
      </p>

      <div className="flex flex-col gap-3">
        {OBJETIVOS.map(({ value, emoji, label, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => setForm((f) => ({ ...f, objetivo: value }))}
            className="flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all"
            style={{
              borderColor: form.objetivo === value ? '#1D9E75' : '#E5E7EB',
              backgroundColor: form.objetivo === value ? '#F0FBF7' : '#fff',
            }}
          >
            <span className="text-2xl">{emoji}</span>
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ color: form.objetivo === value ? '#085041' : '#374151' }}
              >
                {label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            {form.objetivo === value && (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shrink-0"
                style={{ backgroundColor: '#1D9E75' }}
              >
                ✓
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Paso 4: Salud y preferencias
// ──────────────────────────────────────────────

function Step4({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const toggleCondicion = (key: keyof CondicionesMedicas) => {
    setForm((f) => ({
      ...f,
      condiciones_medicas: {
        ...f.condiciones_medicas,
        [key]: !f.condiciones_medicas[key],
      },
    }));
  };

  const togglePreferencia = (key: keyof PreferenciasAlimentarias) => {
    setForm((f) => ({
      ...f,
      preferencias_alimentarias: {
        ...f.preferencias_alimentarias,
        [key]: !f.preferencias_alimentarias[key],
      },
    }));
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">Tu salud y preferencias</h3>
      <p className="text-sm text-gray-500 mb-6">
        Adaptamos las recetas a tus necesidades. Selecciona todo lo que aplique.
      </p>

      {/* Condiciones médicas */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Condiciones médicas
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CONDICIONES.map(({ key, label }) => {
            const checked = !!form.condiciones_medicas[key];
            return (
              <label
                key={key}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none"
                style={{
                  borderColor: checked ? '#1D9E75' : '#E5E7EB',
                  backgroundColor: checked ? '#F0FBF7' : '#FAFAFA',
                }}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
                  style={{
                    borderColor: checked ? '#1D9E75' : '#D1D5DB',
                    backgroundColor: checked ? '#1D9E75' : '#fff',
                  }}
                >
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCondicion(key)}
                  className="sr-only"
                />
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Preferencias alimentarias */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Preferencias alimentarias
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PREFERENCIAS.map(({ key, label }) => {
            const checked = !!form.preferencias_alimentarias[key];
            return (
              <label
                key={key}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none"
                style={{
                  borderColor: checked ? '#1D9E75' : '#E5E7EB',
                  backgroundColor: checked ? '#F0FBF7' : '#FAFAFA',
                }}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
                  style={{
                    borderColor: checked ? '#1D9E75' : '#D1D5DB',
                    backgroundColor: checked ? '#1D9E75' : '#fff',
                  }}
                >
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePreferencia(key)}
                  className="sr-only"
                />
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Otras restricciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Otras restricciones o alergias
        </label>
        <input
          type="text"
          value={form.otras_restricciones}
          onChange={(e) => setForm((f) => ({ ...f, otras_restricciones: e.target.value }))}
          placeholder="Ej: alergia al cacahuate, sin soya…"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { perfil, guardarPerfil } = useProfile();

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>({
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    sexo: '',
    pais: 'México',
    ciudad: '',
    peso_kg: '',
    estatura_cm: '',
    nivel_actividad: 'moderado',
    objetivo: 'mejorar_salud',
    condiciones_medicas: {},
    preferencias_alimentarias: {},
    otras_restricciones: '',
  });

  // Pre-llenar desde perfil existente o user_metadata
  useEffect(() => {
    const meta = user?.user_metadata ?? {};
    setForm((f) => ({
      ...f,
      nombre: perfil?.nombre || meta.nombre || meta.full_name?.split(' ')[0] || f.nombre,
      apellido: perfil?.apellido || meta.full_name?.split(' ').slice(1).join(' ') || f.apellido,
      fecha_nacimiento: perfil?.fecha_nacimiento || f.fecha_nacimiento,
      sexo: (perfil?.sexo as Sexo | '') || f.sexo,
      pais: perfil?.pais || f.pais,
      ciudad: perfil?.ciudad || f.ciudad,
      peso_kg: perfil?.peso_kg?.toString() || f.peso_kg,
      estatura_cm: perfil?.estatura_cm?.toString() || f.estatura_cm,
      nivel_actividad: perfil?.nivel_actividad || f.nivel_actividad,
      objetivo: perfil?.objetivo || f.objetivo,
      condiciones_medicas: perfil?.condiciones_medicas || f.condiciones_medicas,
      preferencias_alimentarias: perfil?.preferencias_alimentarias || f.preferencias_alimentarias,
      otras_restricciones: perfil?.otras_restricciones || f.otras_restricciones,
    }));
  }, [perfil, user]);

  const isEditing = !!perfil?.perfil_completo;

  // Validaciones por paso
  const isStepValid = (): boolean => {
    if (step === 1) return !!form.nombre && !!form.fecha_nacimiento && !!form.sexo;
    if (step === 2) return !!form.peso_kg && !!form.estatura_cm;
    return true;
  };

  const handleNext = () => {
    if (!isStepValid()) {
      setError('Por favor completa los campos requeridos (*).');
      return;
    }
    setError('');
    setStep((s) => s + 1);
  };

  const handlePrev = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleFinish = async () => {
    if (!isStepValid()) {
      setError('Por favor completa los campos requeridos.');
      return;
    }
    setGuardando(true);
    setError('');

    try {
      await guardarPerfil({
        nombre: form.nombre,
        apellido: form.apellido || undefined,
        fecha_nacimiento: form.fecha_nacimiento || undefined,
        sexo: (form.sexo as Sexo) || undefined,
        pais: form.pais || 'México',
        ciudad: form.ciudad || undefined,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : undefined,
        estatura_cm: form.estatura_cm ? parseFloat(form.estatura_cm) : undefined,
        nivel_actividad: form.nivel_actividad,
        objetivo: form.objetivo,
        condiciones_medicas: form.condiciones_medicas,
        preferencias_alimentarias: form.preferencias_alimentarias,
        otras_restricciones: form.otras_restricciones || undefined,
        perfil_completo: true,
      });

      // Navegar inmediatamente — el upsert ya está committed en Supabase.
      // replace: true evita que el botón "atrás" regrese al onboarding.
      // fromOnboarding: true le indica a ProfileGuard que acaba de completarse.
      navigate(isEditing ? '/mi-perfil' : '/hoy', {
        replace: true,
        state: { fromOnboarding: true },
      });
    } catch (e) {
      setError('Error al guardar. Intenta de nuevo.');
      setGuardando(false);
    }
  };

  // ── Formulario wizard ──
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: '#F8FDFB' }}
    >
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1D9E75' }}>
            NutriPlan
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditing ? 'Editar perfil' : 'Configura tu plan personalizado'}
          </p>
        </div>

        {/* Progreso */}
        <StepProgress step={step} total={TOTAL_STEPS} />

        {/* Tarjeta del paso */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === 1 && <Step1 form={form} setForm={setForm} />}
          {step === 2 && <Step2 form={form} setForm={setForm} />}
          {step === 3 && <Step3 form={form} setForm={setForm} />}
          {step === 4 && <Step4 form={form} setForm={setForm} />}

          {error && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* Navegación */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>

            <span className="text-xs text-gray-400">
              {step} de {TOTAL_STEPS}
            </span>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#1D9E75' }}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={guardando}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: '#1D9E75' }}
              >
                {guardando ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Finalizar ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
