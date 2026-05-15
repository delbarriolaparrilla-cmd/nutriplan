import type { PlanDiario, Receta, TipoComida } from '../../types/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoComida, string> = {
  desayuno: 'Desayuno',
  colacion: 'Colación',
  comida:   'Comida',
  cena:     'Cena',
};
const TIPO_EMOJI: Record<TipoComida, string> = {
  desayuno: '🌅', colacion: '🍎', comida: '🍽️', cena: '🌙',
};
const DIFICULTAD_LABEL: Record<string, string> = {
  facil: 'Fácil', media: 'Media', dificil: 'Difícil',
};
const DIFICULTAD_COLOR: Record<string, string> = {
  facil: '#22C55E', media: '#F59E0B', dificil: '#EF4444',
};

function MacroBadge({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#F0FAF5', borderRadius: '10px',
    }}>
      <div style={{ fontSize: '15px', fontWeight: 800, color: '#085041' }}>
        {Math.round(value)}<span style={{ fontSize: '10px', fontWeight: 500, color: '#6B7280' }}>{unit}</span>
      </div>
      <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  entrada: PlanDiario;
  onClose: () => void;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function RecetaDetalleModal({ entrada, onClose }: Props) {
  const receta: Receta | undefined = entrada.receta;
  const tipo = entrada.tipo_comida;

  const fecha = new Date(entrada.fecha + 'T12:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 60,
        }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', zIndex: 61,
          bottom: 0, left: 0, right: 0,
          background: 'white',
          borderRadius: '24px 24px 0 0',
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
          // Desktop: centrado
          ...(window.innerWidth >= 640 ? {
            top: '50%', left: '50%', bottom: 'auto', right: 'auto',
            transform: 'translate(-50%, -50%)',
            width: '100%', maxWidth: '480px',
            borderRadius: '20px',
            maxHeight: '90vh',
          } : {}),
        }}
      >
        {/* Handle mobile */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
        </div>

        {/* Header coloreado */}
        <div style={{
          padding: '12px 20px 16px',
          background: 'linear-gradient(135deg, #F0FAF5 0%, #E6F7F0 100%)',
          borderBottom: '1px solid #D1FAE5',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {/* Pill de tipo + fecha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{
                  fontSize: '11px', fontWeight: 600,
                  color: '#1D9E75', background: '#D1FAE5',
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  {TIPO_EMOJI[tipo]} {TIPO_LABEL[tipo]}
                </span>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{fecha}</span>
              </div>

              {/* Nombre */}
              <h2 style={{
                fontSize: '18px', fontWeight: 800,
                color: '#085041', lineHeight: 1.25,
                margin: 0,
              }}>
                {receta?.nombre ?? 'Sin receta'}
              </h2>

              {/* Descripción */}
              {receta?.descripcion && (
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: 4, lineHeight: 1.4 }}>
                  {receta.descripcion}
                </p>
              )}
            </div>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              style={{
                marginLeft: 8, flexShrink: 0,
                width: 30, height: 30, borderRadius: '50%',
                border: 'none', background: '#E5E7EB',
                fontSize: '16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6B7280',
              }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Quick stats */}
          {receta && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {receta.tiempo_minutos && (
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  ⏱ {receta.tiempo_minutos} min
                </span>
              )}
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: DIFICULTAD_COLOR[receta.dificultad] ?? '#6B7280',
                background: '#F9FAFB', padding: '2px 8px', borderRadius: 20,
                border: '1px solid #E5E7EB',
              }}>
                {DIFICULTAD_LABEL[receta.dificultad] ?? receta.dificultad}
              </span>
              {entrada.consumido && (
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: '#059669',
                  background: '#D1FAE5', padding: '2px 8px', borderRadius: 20,
                }}>
                  ✓ Consumido
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          {!receta ? (
            <p style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 24 }}>
              Esta entrada del plan no tiene receta asociada.
            </p>
          ) : (
            <>
              {/* Macros */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                <MacroBadge label="Calorías" value={receta.calorias} unit=" kcal" />
                <MacroBadge label="Proteína" value={receta.proteina_g} unit="g" />
                <MacroBadge label="Carbos" value={receta.carbs_g} unit="g" />
                <MacroBadge label="Grasas" value={receta.grasa_g} unit="g" />
              </div>

              {/* Tags */}
              {receta.tags && receta.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 18 }}>
                  {receta.tags.map((tag) => (
                    <span key={tag} style={{
                      fontSize: '10px', fontWeight: 500,
                      color: '#1D9E75', background: '#F0FAF5',
                      border: '1px solid #A7E3C8',
                      padding: '2px 8px', borderRadius: 20,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Ingredientes */}
              <section style={{ marginBottom: 20 }}>
                <h3 style={{
                  fontSize: '13px', fontWeight: 700,
                  color: '#085041', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  🧾 Ingredientes
                  <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: '11px' }}>
                    ({receta.ingredientes.length})
                  </span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {receta.ingredientes.map((ing, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: i < receta.ingredientes.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}>
                      <div>
                        <span style={{ fontSize: '13px', color: '#1A1A2E' }}>{ing.nombre}</span>
                        {ing.grupo && (
                          <span style={{ fontSize: '10px', color: '#9CA3AF', marginLeft: 5 }}>
                            · {ing.grupo}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: '12px', color: '#6B7280',
                        fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 8,
                      }}>
                        {ing.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pasos */}
              {receta.pasos && receta.pasos.length > 0 && (
                <section style={{ marginBottom: 20 }}>
                  <h3 style={{
                    fontSize: '13px', fontWeight: 700,
                    color: '#085041', marginBottom: 10,
                  }}>
                    👨‍🍳 Preparación
                  </h3>
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {receta.pasos.map((paso, i) => (
                      <li key={i} style={{
                        display: 'flex', gap: 10,
                        marginBottom: 10,
                      }}>
                        <span style={{
                          flexShrink: 0,
                          width: 22, height: 22,
                          borderRadius: '50%',
                          background: '#1D9E75',
                          color: 'white',
                          fontSize: '11px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {i + 1}
                        </span>
                        <p style={{
                          margin: 0, fontSize: '13px',
                          color: '#374151', lineHeight: 1.5,
                          paddingTop: 2,
                        }}>
                          {paso}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
