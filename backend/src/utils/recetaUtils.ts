/**
 * Extrae únicamente las columnas que existen en la tabla `recetas`.
 * Cualquier campo extra que venga de Claude (costo_estimado_mxn,
 * nota_nutricional, grupo_smae_principal, etc.) es ignorado
 * para no romper el insert en Supabase.
 *
 * Si en el futuro ejecutas migration_v2_optional.sql, agrega esos
 * campos aquí para que también se persistan.
 */
export function pickRecetaColumns(data: Record<string, unknown>): Record<string, unknown> {
  return {
    // ── Columnas actuales en schema.sql ────────────────────────
    ...(data.nombre           !== undefined && { nombre:          data.nombre }),
    ...(data.descripcion      !== undefined && { descripcion:     data.descripcion }),
    ...(data.tiempo_minutos   !== undefined && { tiempo_minutos:  data.tiempo_minutos }),
    ...(data.tipo_comida      !== undefined && { tipo_comida:     data.tipo_comida }),
    ...(data.dificultad       !== undefined && { dificultad:      data.dificultad }),
    ...(data.calorias         !== undefined && { calorias:        data.calorias }),
    ...(data.proteina_g       !== undefined && { proteina_g:      data.proteina_g }),
    ...(data.carbs_g          !== undefined && { carbs_g:         data.carbs_g }),
    ...(data.grasa_g          !== undefined && { grasa_g:         data.grasa_g }),
    ...(data.ingredientes     !== undefined && { ingredientes:    data.ingredientes }),
    ...(data.pasos            !== undefined && { pasos:           data.pasos }),
    ...(data.tags             !== undefined && { tags:            data.tags }),
    ...(data.generada_por_ia  !== undefined && { generada_por_ia: data.generada_por_ia }),
    ...(data.veces_usada      !== undefined && { veces_usada:     data.veces_usada }),
    // ── Agregar estas líneas DESPUÉS de ejecutar migration_v2_optional.sql ──
    // ...(data.costo_estimado_mxn  !== undefined && { costo_estimado_mxn:  data.costo_estimado_mxn }),
    // ...(data.nota_nutricional    !== undefined && { nota_nutricional:    data.nota_nutricional }),
    // ...(data.grupo_smae_principal !== undefined && { grupo_smae_principal: data.grupo_smae_principal }),
  };
}
