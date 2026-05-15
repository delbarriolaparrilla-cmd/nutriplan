import { Router, Request, Response, NextFunction } from 'express';
import { generarRecetas } from '../services/claudeService.js';
import { supabase } from '../services/supabaseService.js';
import { extractUser } from '../middleware/adminAuth.js';
import { GenerarRecetaParams } from '../types/index.js';

const router = Router();

// POST /api/recetas/generar — Genera recetas con IA
router.post('/generar', extractUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: GenerarRecetaParams = req.body;

    if (!params.tipoComida || !params.caloriasObjetivo) {
      res.status(400).json({ error: 'tipoComida y caloriasObjetivo son requeridos' });
      return;
    }

    const userId = (req as Request & { userId?: string }).userId;
    const recetas = await generarRecetas(params, userId);
    res.json({ recetas });
  } catch (err) {
    next(err);
  }
});

// POST /api/recetas/guardar — Guarda una receta en la base de datos
router.post('/guardar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const receta = req.body;

    const { data, error } = await supabase
      .from('recetas')
      .insert([receta])
      .select()
      .single();

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.status(201).json({ receta: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/recetas — Lista recetas, con filtro opcional ?tipo=comida
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tipo } = req.query;

    let query = supabase
      .from('recetas')
      .select('*')
      .order('created_at', { ascending: false });

    if (tipo) {
      query = query.eq('tipo_comida', tipo as string);
    }

    const { data, error } = await query;

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ recetas: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/recetas/recientes — Últimas 7 recetas usadas
router.get('/recientes', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .gt('veces_usada', 0)
      .order('veces_usada', { ascending: false })
      .limit(7);

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ recetas: data });
  } catch (err) {
    next(err);
  }
});

export default router;
