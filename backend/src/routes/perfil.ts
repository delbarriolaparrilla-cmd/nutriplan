import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService.js';
import { extraerGruposDeTexto } from '../services/claudeService.js';

const router = Router();

// GET /api/perfil — Obtener perfil (asume un solo perfil)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('perfil')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      res.json({ perfil: null });
      return;
    }
    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ perfil: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/perfil — Crear perfil
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, calorias_meta } = req.body;

    if (!nombre) {
      res.status(400).json({ error: 'nombre es requerido' });
      return;
    }

    const { data, error } = await supabase
      .from('perfil')
      .insert([{ nombre, calorias_meta: calorias_meta ?? 2000 }])
      .select()
      .single();

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.status(201).json({ perfil: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/perfil/:id — Actualizar perfil
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('perfil')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ perfil: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/perfil/grupos — Listar grupos nutricionales
router.get('/grupos', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('grupos_nutricionales')
      .select('*, alimentos(*)')
      .order('nombre');

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });

    res.json({ grupos: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/perfil/grupos/extraer — Extrae grupos de texto PDF con IA
router.post('/grupos/extraer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { textoPDF } = req.body;

    if (!textoPDF) {
      res.status(400).json({ error: 'textoPDF es requerido' });
      return;
    }

    const grupos = await extraerGruposDeTexto(textoPDF);
    res.json({ grupos });
  } catch (err) {
    next(err);
  }
});

export default router;
