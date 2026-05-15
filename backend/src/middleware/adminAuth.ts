import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService.js';

const ADMIN_EMAIL = 'oscar.rodrigo.chavez@gmail.com';

/** Extrae el userId del JWT de Supabase en el header Authorization */
export async function extractUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) (req as Request & { userId?: string }).userId = user.id;
    }
  } catch {
    // Silencioso — userId queda undefined
  }
  next();
}

/** Solo permite acceso si el JWT pertenece al admin */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'No autorizado. Token requerido.' });
      return;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Token inválido.' });
      return;
    }

    if (user.email !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Acceso denegado.' });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: 'Error de autenticación.' });
  }
}
