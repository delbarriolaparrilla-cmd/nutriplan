import Anthropic from '@anthropic-ai/sdk';
import { GenerarRecetaParams, GenerarVariacionesParams, GrupoNutricional, RecetaGenerada } from '../types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────────────────────────
// System prompt SMAE — nutrición comunitaria mexicana
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT_RECETAS = `Eres un nutriólogo mexicano especializado en nutrición comunitaria y cocina tradicional mexicana accesible.

Tu base científica es el Sistema Mexicano de Alimentos Equivalentes (SMAE) del INCMNSZ, que define los siguientes grupos y porciones:

GRUPOS SMAE Y PORCIONES ESTÁNDAR:
1. VERDURAS: 1 porción = 1 taza cruda o 1/2 taza cocida = ~25 kcal
   Ejemplos accesibles: jitomate, cebolla, chile, nopales, calabaza, chayote, zanahoria, espinaca, quelites, verdolagas, epazote

2. FRUTAS: 1 porción = 1 pieza mediana o 1 taza = ~60 kcal
   Ejemplos accesibles: plátano, mango, naranja, papaya, guayaba, sandía, melón, lima, tejocote, zapote

3. CEREALES Y TUBÉRCULOS SIN GRASA: 1 porción = ~70 kcal
   - Tortilla de maíz: 1 pieza (30g)
   - Arroz cocido: 1/3 taza
   - Frijoles cocidos: 1/2 taza (también cuenta como leguminosa)
   - Papa cocida: 1/2 pieza mediana
   - Avena: 1/4 taza seca
   - Pan de caja: 1 rebanada
   - Bolillo: 1/2 pieza

4. LEGUMINOSAS: 1 porción = 1/2 taza cocida = ~120 kcal, 8g proteína
   Ejemplos: frijoles negros/bayos/peruanos, lentejas, habas, garbanzos, soya

5. ALIMENTOS DE ORIGEN ANIMAL (AOA) BAJO EN GRASA: 1 porción = 30g = ~55 kcal, 7g proteína
   - Pollo sin piel: 1 pieza chica o 30g
   - Huevo: 1 pieza = 2 porciones (clara) + 1 porción grasa
   - Atún en agua: 1/4 lata
   - Pescado blanco: 30g
   - Queso fresco: 30g
   - Requesón: 60g

6. AOA MODERADO EN GRASA: 1 porción = 30g = ~75 kcal
   - Res magra, cerdo magro, carnitas ocasionales
   - Queso Oaxaca, manchego: 30g

7. LECHE Y YOGURT:
   - Leche descremada: 1 taza = ~95 kcal
   - Leche entera: 1 taza = ~150 kcal
   - Yogurt natural: 3/4 taza = ~110 kcal

8. ACEITES Y GRASAS: 1 porción = 5g grasa = ~45 kcal
   - Aceite vegetal: 1 cdta
   - Aguacate: 1/8 pieza
   - Cacahuate: 10 piezas

9. AZÚCARES: limitar a 0-2 porciones/día
   - Azúcar: 1 cdta
   - Miel: 1 cdta

REGLAS CRÍTICAS PARA GENERAR RECETAS:
1. USA SOLO ingredientes que se consiguen en tianguis, mercado municipal o tienda de abarrotes de pueblo en México
2. PRECIO ESTIMADO máximo por porción: $25-40 MXN — calcula un costo_estimado_mxn realista
3. TÉCNICAS SIMPLES: hervir, freír, asar en comal, guisar. NO uses: horno convencional, licuadora (a menos que sea opcional), técnicas gourmet
4. PORCIONES según SMAE: siempre en medidas caseras (tazas, cucharadas, piezas). NO en gramos
5. SABOR MEXICANO: usa hierbas y especias tradicionales gratuitas (epazote, cilantro, orégano, comino, chile seco)
6. RENDIMIENTO ECONÓMICO: prioriza ingredientes que rinden mucho (frijoles, huevo, tortillas, arroz, verduras de temporada)
7. NOTA NUTRICIONAL: al final de cada receta incluye una nota_nutricional corta y simple explicando POR QUÉ es buena para el objetivo del usuario, en lenguaje NO técnico (máx 2 oraciones)
8. GRUPO SMAE: incluye grupo_smae_principal (ej: "Rico en proteína vegetal y fibra", "Energía de cereales integrales", "Fuente de calcio y proteína")

NUNCA uses: quinoa, chía, espirulina, proteína en polvo, productos "light" o "diet", ingredientes importados, superfoods costosos.
SIEMPRE incluye al menos UNA receta vegetariana o de huevo/frijoles como opción económica.

Responde ÚNICAMENTE con JSON válido, sin texto adicional.`;

// ─────────────────────────────────────────────────────────────
// Helpers para construir el contexto del usuario
// ─────────────────────────────────────────────────────────────

function buildAdaptaciones(
  condicionesMedicas?: Record<string, boolean>,
  preferenciasAlimentarias?: Record<string, boolean>,
  objetivo?: string
): string {
  const lineas: string[] = [];

  if (condicionesMedicas) {
    if (condicionesMedicas.diabetes_tipo1 || condicionesMedicas.diabetes_tipo2) {
      lineas.push('⚠️ DIABETES: reduce azúcares y cereales refinados, aumenta fibra y leguminosas, prefiere cereales integrales y verduras de bajo índice glucémico');
    }
    if (condicionesMedicas.hipertension) {
      lineas.push('⚠️ HIPERTENSIÓN: reduce sal, usa hierbas para sazonar, evita embutidos y conservas');
    }
    if (condicionesMedicas.colesterol_alto) {
      lineas.push('⚠️ COLESTEROL ALTO: prefiere AOA bajo en grasa, usa aceite vegetal con moderación, aumenta fibra soluble (avena, frijoles)');
    }
    if (condicionesMedicas.intolerancia_lactosa) {
      lineas.push('⚠️ INTOLERANCIA A LACTOSA: sustituye leche por agua de masa, caldo o leche de soya; evita queso en recetas donde no sea esencial');
    }
    if (condicionesMedicas.intolerancia_gluten || condicionesMedicas.enfermedad_celiaca) {
      lineas.push('⚠️ SIN GLUTEN: usa solo tortilla de maíz, arroz y frijoles como cereal/almidón; NO uses trigo, pan, bolillo ni avena');
    }
    if (condicionesMedicas.sindrome_intestino_irritable) {
      lineas.push('⚠️ INTESTINO IRRITABLE: evita alimentos muy grasosos, picantes fuertes y frijoles en exceso; prefiere verduras cocidas');
    }
  }

  if (preferenciasAlimentarias) {
    if (preferenciasAlimentarias.vegano) {
      lineas.push('🌱 VEGANO: solo AOA de origen vegetal (leguminosas, tofu si disponible); sin huevo, leche ni queso');
    } else if (preferenciasAlimentarias.vegetariano) {
      lineas.push('🌱 VEGETARIANO: solo AOA de origen vegetal + huevo, queso fresco y leche; sin carne ni pescado');
    }
    if (preferenciasAlimentarias.sin_cerdo) {
      lineas.push('🚫 SIN CERDO: no uses carnitas, chicharrón, tocino ni manteca de cerdo');
    }
    if (preferenciasAlimentarias.sin_mariscos) {
      lineas.push('🚫 SIN MARISCOS: no uses camarón, jaiba ni pescados de mar');
    }
    if (preferenciasAlimentarias.sin_nueces) {
      lineas.push('🚫 SIN NUECES/CACAHUATE: evita todas las nueces y semillas por alergias');
    }
    if (preferenciasAlimentarias.sin_huevo) {
      lineas.push('🚫 SIN HUEVO: no uses huevo en ninguna forma');
    }
  }

  if (objetivo) {
    const objetivoMap: Record<string, string> = {
      perder_peso:    '🎯 OBJETIVO PERDER PESO: recetas con déficit calórico, alta saciedad (fibra y proteína), poca grasa',
      ganar_musculo:  '🎯 OBJETIVO GANAR MÚSCULO: mayor aporte de proteína (AOA + leguminosas), carbohidratos suficientes para energía',
      mantener_peso:  '🎯 OBJETIVO MANTENER PESO: balance calórico, variedad de grupos SMAE',
      mejorar_salud:  '🎯 OBJETIVO MEJORAR SALUD: alimentos integrales, verduras variadas, poca azúcar y grasa saturada',
      control_medico: '🎯 OBJETIVO CONTROL MÉDICO: recetas conservadoras, ingredientes simples, fáciles de medir',
    };
    const desc = objetivoMap[objetivo];
    if (desc) lineas.push(desc);
  }

  return lineas.length > 0
    ? `\nADAPTACIONES REQUERIDAS PARA ESTE USUARIO:\n${lineas.join('\n')}`
    : '';
}

// ─────────────────────────────────────────────────────────────
// generarRecetas
// ─────────────────────────────────────────────────────────────

export async function generarRecetas(params: GenerarRecetaParams): Promise<RecetaGenerada[]> {
  const {
    tipoComida,
    ingredientesDisponibles,
    tiempoMaxMinutos,
    gruposNutricionales,
    caloriasObjetivo,
    recetasRecientes,
    objetivo,
    condicionesMedicas,
    preferenciasAlimentarias,
  } = params;

  const gruposTexto = gruposNutricionales.length > 0
    ? gruposNutricionales
        .map(
          (g) =>
            `- ${g.emoji ?? ''} ${g.nombre}: ${g.cantidad_diaria} ${g.unidad} (${g.porciones_dia} porciones/día)`
        )
        .join('\n')
    : '- Sin plan nutricional específico — usa distribución SMAE balanceada para la población general';

  const adaptaciones = buildAdaptaciones(condicionesMedicas, preferenciasAlimentarias, objetivo);

  const userPrompt = `Genera 3 opciones de receta para ${tipoComida} con estas restricciones:

GRUPOS NUTRICIONALES DEL PACIENTE:
${gruposTexto}
${adaptaciones}

CALORÍAS OBJETIVO PARA ESTA COMIDA: ${caloriasObjetivo} kcal

INGREDIENTES DISPONIBLES: ${ingredientesDisponibles.join(', ') || 'ingredientes comunes de cocina mexicana (tianguis/mercado de pueblo)'}

TIEMPO MÁXIMO: ${tiempoMaxMinutos} minutos

RECETAS RECIENTES A EVITAR (no repetir): ${recetasRecientes.join(', ') || 'ninguna'}

IMPORTANTE: Las cantidades de ingredientes deben expresarse en medidas caseras mexicanas (tazas, cucharadas, piezas, puños), NO en gramos ni mililitros.

Responde ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{
  "recetas": [
    {
      "nombre": "string",
      "descripcion": "string (1-2 oraciones apetitosas y sencillas)",
      "tiempo_minutos": number,
      "dificultad": "facil" | "media" | "dificil",
      "calorias": number,
      "proteina_g": number,
      "carbs_g": number,
      "grasa_g": number,
      "ingredientes": [
        { "nombre": "string", "cantidad": "string (medidas caseras)", "grupo": "string (grupo SMAE)" }
      ],
      "pasos": ["string"],
      "tags": ["string"],
      "costo_estimado_mxn": number,
      "nota_nutricional": "string (explicación simple, max 2 oraciones, sin tecnicismos)",
      "grupo_smae_principal": "string (ej: 'Rico en proteína vegetal y fibra')"
    }
  ]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT_RECETAS,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Respuesta inesperada de Claude');
  }

  const text = content.text.trim();
  const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  const parsed = JSON.parse(jsonText) as { recetas: RecetaGenerada[] };
  return parsed.recetas;
}

// ─────────────────────────────────────────────────────────────
// generarVariaciones
// Genera N recetas DIFERENTES para el mismo tipo de comida,
// nutricionalmente equivalentes y accesibles en mercado local.
// ─────────────────────────────────────────────────────────────

export async function generarVariaciones(params: GenerarVariacionesParams): Promise<RecetaGenerada[]> {
  const {
    tipoComida,
    numDias,
    caloriasObjetivo,
    objetivo,
    condicionesMedicas,
    preferenciasAlimentarias,
    recetaBaseNombre,
  } = params;

  const adaptaciones = buildAdaptaciones(condicionesMedicas, preferenciasAlimentarias, objetivo);

  const referenciaTexto = recetaBaseNombre
    ? `Inspírate en la receta base "${recetaBaseNombre}" pero genera variaciones DISTINTAS — misma categoría nutricional, diferente preparación o ingrediente principal.`
    : `Genera recetas variadas para ${tipoComida}, todas nutricionalmente equivalentes.`;

  const userPrompt = `Eres nutriólogo mexicano especializado en SMAE. Genera ${numDias} recetas DIFERENTES para ${tipoComida}.

${referenciaTexto}

Cada receta debe:
- Ser nutricionalmente equivalente (${caloriasObjetivo} kcal ±50kcal por porción)
- Usar ingredientes accesibles en mercado, tianguis o abarrotes de Michoacán
- Ser DIFERENTE a las demás: varía el ingrediente principal, la técnica de cocción o la combinación
- Expresar cantidades en medidas caseras (tazas, cucharadas, piezas), NO en gramos
- Tener un costo_estimado_mxn realista para 1 porción (máx $40 MXN)
${adaptaciones}

Responde ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{
  "recetas": [
    {
      "nombre": "string",
      "descripcion": "string (1-2 oraciones apetitosas y sencillas)",
      "tiempo_minutos": number,
      "dificultad": "facil" | "media" | "dificil",
      "calorias": number,
      "proteina_g": number,
      "carbs_g": number,
      "grasa_g": number,
      "ingredientes": [
        { "nombre": "string", "cantidad": "string (medidas caseras)", "grupo": "string (grupo SMAE)" }
      ],
      "pasos": ["string"],
      "tags": ["string"],
      "costo_estimado_mxn": number,
      "nota_nutricional": "string (max 2 oraciones, sin tecnicismos)",
      "grupo_smae_principal": "string"
    }
  ]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT_RECETAS,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Respuesta inesperada de Claude');
  }

  const text = content.text.trim();
  const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(jsonText) as { recetas: RecetaGenerada[] };

  // Garantizar que devolvemos exactamente numDias recetas
  // (Claude puede devolver más o menos — repetimos o truncamos según sea necesario)
  const recetas = parsed.recetas;
  if (recetas.length === 0) throw new Error('Claude no generó ninguna variación');

  const resultado: RecetaGenerada[] = [];
  for (let i = 0; i < numDias; i++) {
    resultado.push(recetas[i % recetas.length]);
  }
  return resultado;
}

// ─────────────────────────────────────────────────────────────
// extraerGruposDeTexto
// ─────────────────────────────────────────────────────────────

export async function extraerGruposDeTexto(textoPDF: string): Promise<GrupoNutricional[]> {
  const userPrompt = `Analiza el siguiente texto extraído de un plan nutricional de nutriólogo y extrae los grupos nutricionales con sus cantidades diarias.

TEXTO DEL PDF:
${textoPDF}

Responde ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{
  "grupos": [
    {
      "nombre": "string (ej: Cereales, Proteínas, Verduras, Frutas, Lácteos, Grasas)",
      "descripcion": "string",
      "cantidad_diaria": number,
      "unidad": "string (ej: porciones, gramos, tazas)",
      "porciones_dia": number,
      "emoji": "string (emoji representativo)",
      "color": "string (color hex, ej: #4CAF50)"
    }
  ]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system:
      'Eres un experto en nutrición. Extrae información estructurada de planes nutricionales. Responde ÚNICAMENTE con JSON válido.',
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Respuesta inesperada de Claude');
  }

  const text = content.text.trim();
  const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  const parsed = JSON.parse(jsonText) as { grupos: GrupoNutricional[] };
  return parsed.grupos;
}
