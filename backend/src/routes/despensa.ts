import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// ─── Helpers de cantidad ──────────────────────────────────────

/**
 * Parsea strings como "1/2 taza", "2 piezas", "3 cdas", "1" en { num, unit }.
 * Devuelve null si no se puede parsear.
 */
function parseCantidad(s: string): { num: number; unit: string } | null {
  const m = s.trim().match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(.*)$/);
  if (!m) return null;
  const raw = m[1];
  const unit = (m[2] ?? '').trim().toLowerCase();
  let num: number;
  if (raw.includes('/')) {
    const [a, b] = raw.split('/').map(Number);
    num = a / b;
  } else {
    num = parseFloat(raw);
  }
  return isNaN(num) ? null : { num, unit };
}

/** Formatea un número como fracción o decimal corto */
function formatNum(n: number): string {
  if (n === Math.floor(n)) return String(n);
  const common: [number, string][] = [
    [0.25, '¼'], [0.5, '½'], [0.75, '¾'],
    [0.33, '⅓'], [0.67, '⅔'],
  ];
  for (const [v, frac] of common) {
    if (Math.abs(n - v) < 0.06) return frac;
  }
  const whole = Math.floor(n);
  const rem = n - whole;
  if (whole > 0) {
    for (const [v, frac] of common) {
      if (Math.abs(rem - v) < 0.06) return `${whole} ${frac}`;
    }
  }
  return n.toFixed(1);
}

// ─── POST /api/despensa/semana ────────────────────────────────
/**
 * Body: { dias: string[], num_personas: number }
 * Devuelve la lista de compras agrupada por categoría SMAE,
 * con cantidades multiplicadas por num_personas.
 */
router.post('/semana', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dias, num_personas = 1 } = req.body as {
      dias: string[];
      num_personas: number;
    };

    if (!Array.isArray(dias) || dias.length === 0) {
      res.status(400).json({ error: 'El campo dias es requerido y debe ser un arreglo de fechas.' });
      return;
    }

    const personas = Math.max(1, Math.min(20, Number(num_personas) || 1));

    // Buscar plan_diario con recetas para las fechas solicitadas
    const { data: planRows, error: sbError } = await supabase
      .from('plan_diario')
      .select('fecha, tipo_comida, receta:recetas(nombre, ingredientes)')
      .in('fecha', dias)
      .order('fecha');

    if (sbError) {
      throw Object.assign(new Error(sbError.message), { statusCode: 400 });
    }

    // Detectar días con y sin plan
    const diasConPlan = new Set<string>();
    for (const row of planRows ?? []) {
      if (row.receta) diasConPlan.add(row.fecha as string);
    }
    const diasSinPlan = dias.filter((d) => !diasConPlan.has(d));

    // Agregar ingredientes
    // Clave de agrupación: nombre normalizado + unidad
    type IngItem = { nombre: string; cantidad: string; grupo: string; _num: number; _unit: string };
    const mapaIng = new Map<string, IngItem>();

    for (const row of planRows ?? []) {
      type RecetaShape = { nombre: string; ingredientes?: { nombre: string; cantidad: string; grupo?: string }[] };
      const receta = (row.receta as unknown) as RecetaShape | null;
      if (!receta?.ingredientes) continue;

      for (const ing of receta.ingredientes) {
        const nombreNorm = ing.nombre.trim().toLowerCase();
        const parsed = parseCantidad(ing.cantidad ?? '');

        if (parsed) {
          const clave = `${nombreNorm}||${parsed.unit}`;
          const existing = mapaIng.get(clave);
          if (existing) {
            existing._num += parsed.num * personas;
          } else {
            mapaIng.set(clave, {
              nombre:   ing.nombre.trim(),
              cantidad: '', // se calcula al final
              grupo:    ing.grupo ?? 'Otros',
              _num:     parsed.num * personas,
              _unit:    parsed.unit,
            });
          }
        } else {
          // No parseable: incluir tal cual con multiplicador visible
          const clave = `${nombreNorm}||raw||${Math.random()}`;
          mapaIng.set(clave, {
            nombre:   ing.nombre.trim(),
            cantidad: personas > 1 ? `×${personas} ${ing.cantidad}` : ing.cantidad,
            grupo:    ing.grupo ?? 'Otros',
            _num:     0,
            _unit:    '',
          });
        }
      }
    }

    // Convertir el mapa a lista final con cantidades formateadas
    const lista = Array.from(mapaIng.values()).map(({ nombre, cantidad, grupo, _num, _unit }) => ({
      nombre,
      cantidad: _num > 0 ? `${formatNum(_num)} ${_unit}`.trim() : cantidad,
      grupo,
    }));

    // Ordenar: por grupo SMAE primero, luego por nombre
    const ORDEN_GRUPOS = [
      'Verduras', 'Frutas', 'Cereales', 'Leguminosas',
      'AOA', 'Lácteos', 'Aceites', 'Azúcares', 'Otros',
    ];
    lista.sort((a, b) => {
      const ia = ORDEN_GRUPOS.findIndex((g) => a.grupo.toLowerCase().includes(g.toLowerCase()));
      const ib = ORDEN_GRUPOS.findIndex((g) => b.grupo.toLowerCase().includes(g.toLowerCase()));
      const ga = ia === -1 ? 99 : ia;
      const gb = ib === -1 ? 99 : ib;
      if (ga !== gb) return ga - gb;
      return a.nombre.localeCompare(b.nombre, 'es');
    });

    res.json({
      lista,
      dias_con_plan: Array.from(diasConPlan).sort(),
      dias_sin_plan: diasSinPlan.sort(),
      total_recetas: (planRows ?? []).filter((r) => r.receta).length,
      total_ingredientes: lista.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
