import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// GET /api/historial — Historial de macros (últimos 30 días por defecto)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dias = '30' } = req.query;
    const diasNum = parseInt(dias as string, 10);

    const desde = new Date();
    desde.setDate(desde.getDate() - diasNum);

    const { data, error } = await supabase
      .from('historial_macros')
      .select('*')
      .gte('fecha', desde.toISOString().split('T')[0])
      .order('fecha', { ascending: false });

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ historial: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/historial/:fecha — Macros de un día específico
router.get('/:fecha', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fecha } = req.params;

    const { data, error } = await supabase
      .from('historial_macros')
      .select('*')
      .eq('fecha', fecha)
      .single();

    if (error && error.code === 'PGRST116') {
      res.json({ historial: null });
      return;
    }
    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ historial: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/historial — Crear o actualizar registro de macros del día
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fecha, calorias_consumidas, proteina_g, carbs_g, grasa_g, completado } = req.body;

    if (!fecha) {
      res.status(400).json({ error: 'fecha es requerida' });
      return;
    }

    const { data, error } = await supabase
      .from('historial_macros')
      .upsert(
        [{ fecha, calorias_consumidas, proteina_g, carbs_g, grasa_g, completado }],
        { onConflict: 'fecha' }
      )
      .select()
      .single();

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.status(201).json({ historial: data });
  } catch (err) {
    next(err);
  }
});

export default router;
