import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService.js';
import { generarVariaciones } from '../services/claudeService.js';
import { extractUser } from '../middleware/adminAuth.js';
import { pickRecetaColumns } from '../utils/recetaUtils.js';

const router = Router();

// GET /api/plan/:fecha — Plan del día con recetas
router.get('/:fecha', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fecha } = req.params;

    const { data, error } = await supabase
      .from('plan_diario')
      .select('*, receta:recetas(*)')
      .eq('fecha', fecha)
      .order('hora_programada', { ascending: true });

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ plan: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/plan — Agregar comida al plan del día
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fecha, tipo_comida, receta_id, hora_programada, notas } = req.body;

    if (!fecha || !tipo_comida) {
      res.status(400).json({ error: 'fecha y tipo_comida son requeridos' });
      return;
    }

    const { data, error } = await supabase
      .from('plan_diario')
      .upsert([{ fecha, tipo_comida, receta_id, hora_programada, notas }], {
        onConflict: 'fecha,tipo_comida',
      })
      .select()
      .single();

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    // Incrementar veces_usada de la receta
    if (receta_id) {
      await supabase.rpc('increment_veces_usada', { receta_id_param: receta_id });
    }

    res.status(201).json({ plan: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/plan/:id/consumido — Marcar como consumido
router.patch('/:id/consumido', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { consumido } = req.body;

    const { data, error } = await supabase
      .from('plan_diario')
      .update({
        consumido,
        consumido_at: consumido ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ plan: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/plan/:id — Eliminar entrada del plan
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('plan_diario').delete().eq('id', id);

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/plan/agregar-multiple
// Body: { receta_id?, tipo_comida, fechas[], modo, reemplazar,
//         perfil_info?, receta_base? }
// ─────────────────────────────────────────────────────────────
router.post('/agregar-multiple', extractUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      receta_id,
      tipo_comida,
      fechas,
      modo,
      reemplazar = false,
      perfil_info,
      receta_base,
    } = req.body as {
      receta_id?: string;
      tipo_comida: string;
      fechas: string[];
      modo: 'repetir' | 'variaciones';
      reemplazar: boolean;
      perfil_info?: { objetivo?: string; condiciones?: Record<string, boolean>; preferencias?: Record<string, boolean> };
      receta_base?: { nombre: string; calorias: number };
    };

    if (!tipo_comida || !Array.isArray(fechas) || fechas.length === 0) {
      res.status(400).json({ error: 'tipo_comida y fechas son requeridos.' });
      return;
    }

    let insertados = 0;
    let omitidos   = 0;

    const userId = (req as Request & { userId?: string }).userId;

    if (modo === 'variaciones') {
      // 1. Generar N recetas distintas con Claude
      const variaciones = await generarVariaciones({
        tipoComida: tipo_comida as 'desayuno' | 'colacion' | 'comida' | 'cena',
        numDias:     fechas.length,
        caloriasObjetivo: receta_base?.calorias ?? 500,
        objetivo:    perfil_info?.objetivo,
        condicionesMedicas:    perfil_info?.condiciones,
        preferenciasAlimentarias: perfil_info?.preferencias,
        recetaBaseNombre: receta_base?.nombre,
      }, userId);

      // 2. Guardar cada variación en recetas y agregar al plan
      for (let i = 0; i < fechas.length; i++) {
        const fecha    = fechas[i];
        const variacion = variaciones[i % variaciones.length];

        // Verificar conflicto
        if (!reemplazar) {
          const { data: existing } = await supabase
            .from('plan_diario')
            .select('id')
            .eq('fecha', fecha)
            .eq('tipo_comida', tipo_comida)
            .maybeSingle();
          if (existing) { omitidos++; continue; }
        }

        // Guardar la receta generada (solo columnas existentes en el schema)
        const recetaData = pickRecetaColumns({
          ...(variacion as unknown as Record<string, unknown>),
          tipo_comida,
          generada_por_ia: true,
          veces_usada: 0,
        });
        const { data: recetaGuardada, error: rErr } = await supabase
          .from('recetas')
          .insert(recetaData)
          .select('id')
          .single();

        if (rErr) { omitidos++; continue; }

        // Agregar al plan
        await supabase
          .from('plan_diario')
          .upsert([{ fecha, tipo_comida, receta_id: recetaGuardada.id }], {
            onConflict: 'fecha,tipo_comida',
          });
        insertados++;
      }
    } else {
      // modo === 'repetir' — misma receta en todas las fechas
      if (!receta_id) {
        res.status(400).json({ error: 'receta_id es requerido en modo repetir.' });
        return;
      }

      for (const fecha of fechas) {
        // Verificar conflicto
        if (!reemplazar) {
          const { data: existing } = await supabase
            .from('plan_diario')
            .select('id')
            .eq('fecha', fecha)
            .eq('tipo_comida', tipo_comida)
            .maybeSingle();
          if (existing) { omitidos++; continue; }
        }

        const { error: insertErr } = await supabase
          .from('plan_diario')
          .upsert([{ fecha, tipo_comida, receta_id }], {
            onConflict: 'fecha,tipo_comida',
          });
        if (insertErr) { omitidos++; } else { insertados++; }
      }
    }

    res.json({ insertados, omitidos });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/plan/mover — Mueve o intercambia entradas del plan
// Body: { plan_id_origen, fecha_destino, tipo_comida_destino,
//         plan_id_destino? }
// ─────────────────────────────────────────────────────────────
router.post('/mover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { plan_id_origen, fecha_destino, tipo_comida_destino, plan_id_destino } = req.body as {
      plan_id_origen: string;
      fecha_destino: string;
      tipo_comida_destino: string;
      plan_id_destino?: string;
    };

    if (!plan_id_origen || !fecha_destino || !tipo_comida_destino) {
      res.status(400).json({ error: 'plan_id_origen, fecha_destino y tipo_comida_destino son requeridos.' });
      return;
    }

    // Leer origen para saber su fecha/tipo actuales (necesario para el intercambio)
    const { data: origen, error: origenErr } = await supabase
      .from('plan_diario')
      .select('*')
      .eq('id', plan_id_origen)
      .single();

    if (origenErr || !origen) {
      res.status(404).json({ error: 'Entrada de plan no encontrada.' });
      return;
    }

    if (plan_id_destino) {
      // INTERCAMBIO: intercambiar receta_id entre las dos entradas.
      // Mantenemos fecha + tipo_comida de cada fila y solo swapeamos el receta_id,
      // así NO tocamos la restricción UNIQUE (fecha, tipo_comida).
      const { data: destino, error: destErr } = await supabase
        .from('plan_diario')
        .select('*')
        .eq('id', plan_id_destino)
        .single();

      if (destErr || !destino) {
        res.status(404).json({ error: 'Entrada destino no encontrada.' });
        return;
      }

      // Swap paralelo de receta_ids — no hay riesgo de colisión UNIQUE
      const [{ data: origenActualizado, error: e1 }, { data: destinoActualizado, error: e2 }] =
        await Promise.all([
          supabase
            .from('plan_diario')
            .update({ receta_id: destino.receta_id })
            .eq('id', plan_id_origen)
            .select()
            .single(),
          supabase
            .from('plan_diario')
            .update({ receta_id: origen.receta_id })
            .eq('id', plan_id_destino)
            .select()
            .single(),
        ]);

      if (e1) throw Object.assign(new Error(e1.message), { statusCode: 400 });
      if (e2) throw Object.assign(new Error(e2.message), { statusCode: 400 });

      res.json({ origen: origenActualizado, destino: destinoActualizado });
    } else {
      // MOVER a celda — verificar que el destino esté vacío para no romper UNIQUE
      const { data: ocupado } = await supabase
        .from('plan_diario')
        .select('id')
        .eq('fecha', fecha_destino)
        .eq('tipo_comida', tipo_comida_destino)
        .maybeSingle();

      if (ocupado) {
        res.status(409).json({
          error: 'La celda destino ya tiene una receta. Envía plan_id_destino para intercambiar.',
          plan_id_ocupado: ocupado.id,
        });
        return;
      }

      const { data: origenActualizado, error: moveErr } = await supabase
        .from('plan_diario')
        .update({ fecha: fecha_destino, tipo_comida: tipo_comida_destino })
        .eq('id', plan_id_origen)
        .select()
        .single();

      if (moveErr) throw Object.assign(new Error(moveErr.message), { statusCode: 400 });

      res.json({ origen: origenActualizado });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
