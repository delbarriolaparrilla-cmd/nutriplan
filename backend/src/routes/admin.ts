import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

// Todos los endpoints requieren ser admin
router.use(requireAdmin);

// ─────────────────────────────────────────────────────────────
// GET /api/admin/usuarios — Lista todos los usuarios con
// su perfil, suscripción y uso de tokens del mes actual
// ─────────────────────────────────────────────────────────────
router.get('/usuarios', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener lista de usuarios de auth
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) throw Object.assign(new Error(authErr.message), { statusCode: 500 });

    // Obtener perfiles
    const { data: perfiles } = await supabase.from('perfil').select('id, nombre, apellido');

    // Obtener suscripciones
    const { data: suscripciones } = await supabase.from('suscripciones').select('*');

    // Obtener uso de tokens del mes actual
    const primeroDeMes = new Date();
    primeroDeMes.setDate(1);
    primeroDeMes.setHours(0, 0, 0, 0);

    const { data: tokens } = await supabase
      .from('uso_tokens')
      .select('user_id, tokens_total, num_generaciones, costo_estimado_usd')
      .gte('fecha', primeroDeMes.toISOString().split('T')[0]);

    // Consolidar tokens por usuario del mes
    const tokensMap: Record<string, { total: number; generaciones: number; costoUSD: number }> = {};
    for (const t of tokens ?? []) {
      if (!tokensMap[t.user_id]) tokensMap[t.user_id] = { total: 0, generaciones: 0, costoUSD: 0 };
      tokensMap[t.user_id].total       += t.tokens_total;
      tokensMap[t.user_id].generaciones += t.num_generaciones;
      tokensMap[t.user_id].costoUSD    += Number(t.costo_estimado_usd ?? 0);
    }

    // Combinar todo
    const perfilMap: Record<string, { nombre?: string; apellido?: string }> = {};
    for (const p of perfiles ?? []) perfilMap[p.id] = p;

    type SuscRow = NonNullable<typeof suscripciones>[number];
    const suscMap: Record<string, SuscRow> = {};
    for (const s of suscripciones ?? []) if (s.user_id) suscMap[s.user_id] = s;

    const resultado = users.map((u) => ({
      id:        u.id,
      email:     u.email,
      nombre:    perfilMap[u.id]?.nombre ?? null,
      apellido:  perfilMap[u.id]?.apellido ?? null,
      creado_en: u.created_at,
      suscripcion: suscMap[u.id] ?? null,
      tokens_mes: tokensMap[u.id] ?? { total: 0, generaciones: 0, costoUSD: 0 },
    }));

    res.json({ usuarios: resultado });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/suscripcion/:id — Actualizar estado/plan
// ─────────────────────────────────────────────────────────────
router.patch('/suscripcion/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { estado, plan, notas_admin } = req.body as {
      estado?: string;
      plan?: string;
      notas_admin?: string;
    };

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (estado)      updates.estado      = estado;
    if (plan)        updates.plan        = plan;
    if (notas_admin !== undefined) updates.notas_admin = notas_admin;

    const { data, error } = await supabase
      .from('suscripciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });
    res.json({ suscripcion: data });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/pago — Registrar pago y activar suscripción
// ─────────────────────────────────────────────────────────────
router.post('/pago', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      user_id,
      suscripcion_id,
      monto,
      plan,
      metodo_pago,
      referencia,
      fecha_pago,
      notas,
    } = req.body as {
      user_id: string;
      suscripcion_id: string;
      monto: number;
      plan: 'mensual' | 'trimestral' | 'anual';
      metodo_pago: 'efectivo' | 'transferencia' | 'otro';
      referencia?: string;
      fecha_pago?: string;
      notas?: string;
    };

    if (!user_id || !suscripcion_id || !monto || !plan || !metodo_pago) {
      res.status(400).json({ error: 'Campos requeridos: user_id, suscripcion_id, monto, plan, metodo_pago' });
      return;
    }

    // Calcular nueva fecha de vencimiento
    const DIAS_POR_PLAN: Record<string, number> = {
      mensual: 30, trimestral: 90, anual: 365,
    };
    const dias = DIAS_POR_PLAN[plan] ?? 30;
    const nuevaFecha = new Date();
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    // Insertar pago
    const { data: pagoData, error: pagoErr } = await supabase
      .from('pagos')
      .insert({
        user_id,
        suscripcion_id,
        monto,
        plan,
        metodo_pago,
        referencia: referencia ?? null,
        fecha_pago: fecha_pago ?? new Date().toISOString(),
        notas: notas ?? null,
      })
      .select()
      .single();

    if (pagoErr) throw Object.assign(new Error(pagoErr.message), { statusCode: 400 });

    // Actualizar suscripción: estado activa + nueva fecha + reset tokens
    const { data: suscData, error: suscErr } = await supabase
      .from('suscripciones')
      .update({
        estado:               'activa',
        plan,
        precio_pagado:        monto,
        fecha_vencimiento:    nuevaFecha.toISOString(),
        fecha_ultimo_pago:    fecha_pago ?? new Date().toISOString(),
        tokens_consumidos_mes: 0,
        tokens_limite_mes:    200000,
        updated_at:           new Date().toISOString(),
      })
      .eq('id', suscripcion_id)
      .select()
      .single();

    if (suscErr) throw Object.assign(new Error(suscErr.message), { statusCode: 400 });

    res.json({ pago: pagoData, suscripcion: suscData });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/tokens — Estadísticas de uso últimos 30 días
// ─────────────────────────────────────────────────────────────
router.get('/tokens', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);

    const { data: uso, error } = await supabase
      .from('uso_tokens')
      .select('user_id, fecha, tokens_total, num_generaciones, costo_estimado_usd')
      .gte('fecha', hace30.toISOString().split('T')[0])
      .order('fecha');

    if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

    // Tokens por día (para gráfica)
    const porDia: Record<string, { tokens: number; generaciones: number; costoUSD: number }> = {};
    for (const r of uso ?? []) {
      if (!porDia[r.fecha]) porDia[r.fecha] = { tokens: 0, generaciones: 0, costoUSD: 0 };
      porDia[r.fecha].tokens      += r.tokens_total;
      porDia[r.fecha].generaciones += r.num_generaciones;
      porDia[r.fecha].costoUSD    += Number(r.costo_estimado_usd ?? 0);
    }

    // Top 5 usuarios por tokens del mes actual
    const hoy = new Date();
    const primeroDeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const usoMes = (uso ?? []).filter((r) => new Date(r.fecha) >= primeroDeMes);

    const usuariosMap: Record<string, { tokens: number; generaciones: number; costoUSD: number }> = {};
    for (const r of usoMes) {
      if (!usuariosMap[r.user_id]) usuariosMap[r.user_id] = { tokens: 0, generaciones: 0, costoUSD: 0 };
      usuariosMap[r.user_id].tokens      += r.tokens_total;
      usuariosMap[r.user_id].generaciones += r.num_generaciones;
      usuariosMap[r.user_id].costoUSD    += Number(r.costo_estimado_usd ?? 0);
    }

    const top5 = Object.entries(usuariosMap)
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .slice(0, 5)
      .map(([userId, stats]) => ({ userId, ...stats }));

    // Totales del mes
    const totalMes = usoMes.reduce((acc, r) => ({
      tokens: acc.tokens + r.tokens_total,
      generaciones: acc.generaciones + r.num_generaciones,
      costoUSD: acc.costoUSD + Number(r.costo_estimado_usd ?? 0),
    }), { tokens: 0, generaciones: 0, costoUSD: 0 });

    // Proyección al fin de mes
    const diasTranscurridos = hoy.getDate();
    const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const factorProyeccion = diasTranscurridos > 0 ? diasEnMes / diasTranscurridos : 1;
    const proyeccion = {
      tokens:  Math.round(totalMes.tokens * factorProyeccion),
      costoUSD: totalMes.costoUSD * factorProyeccion,
    };

    res.json({
      por_dia: porDia,
      top5_usuarios: top5,
      total_mes: totalMes,
      proyeccion,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/resetear-tokens — Resetear tokens del mes
// ─────────────────────────────────────────────────────────────
router.post('/resetear-tokens', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, count } = await supabase
      .from('suscripciones')
      .update({ tokens_consumidos_mes: 0, updated_at: new Date().toISOString() })
      .neq('estado', 'cancelada');

    if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

    res.json({ ok: true, actualizados: count ?? 0 });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/por-vencer — Usuarios que vencen en ≤3 días
// ─────────────────────────────────────────────────────────────
router.get('/por-vencer', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const en3Dias = new Date();
    en3Dias.setDate(en3Dias.getDate() + 3);

    const { data: suscripciones, error } = await supabase
      .from('suscripciones')
      .select('user_id, estado, plan, fecha_vencimiento')
      .in('estado', ['activa', 'prueba'])
      .lte('fecha_vencimiento', en3Dias.toISOString())
      .order('fecha_vencimiento');

    if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

    if (!suscripciones?.length) {
      res.json({ usuarios: [] });
      return;
    }

    const userIds = suscripciones.map((s) => s.user_id).filter(Boolean);
    const { data: perfiles } = await supabase
      .from('perfil')
      .select('id, nombre')
      .in('id', userIds);

    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap: Record<string, string> = {};
    for (const u of users) emailMap[u.id] = u.email ?? '';

    const perfilMap: Record<string, string> = {};
    for (const p of perfiles ?? []) perfilMap[p.id] = p.nombre;

    const resultado = suscripciones.map((s) => ({
      user_id:           s.user_id,
      nombre:            perfilMap[s.user_id ?? ''] ?? '—',
      email:             emailMap[s.user_id ?? ''] ?? '—',
      plan:              s.plan,
      estado:            s.estado,
      fecha_vencimiento: s.fecha_vencimiento,
    }));

    res.json({ usuarios: resultado });
  } catch (err) {
    next(err);
  }
});

export default router;
