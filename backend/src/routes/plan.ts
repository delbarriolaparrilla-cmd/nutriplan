import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService.js';

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

export default router;
