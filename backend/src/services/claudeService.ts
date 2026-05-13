import Anthropic from '@anthropic-ai/sdk';
import { GenerarRecetaParams, GrupoNutricional, RecetaGenerada } from '../types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT_RECETAS =
  'Eres un nutriólogo y chef especializado en cocina mexicana saludable. Genera recetas EXACTAMENTE ajustadas a los grupos nutricionales del paciente. Responde ÚNICAMENTE con JSON válido.';

export async function generarRecetas(params: GenerarRecetaParams): Promise<RecetaGenerada[]> {
  const {
    tipoComida,
    ingredientesDisponibles,
    tiempoMaxMinutos,
    gruposNutricionales,
    caloriasObjetivo,
    recetasRecientes,
  } = params;

  const gruposTexto = gruposNutricionales
    .map(
      (g) =>
        `- ${g.emoji ?? ''} ${g.nombre}: ${g.cantidad_diaria} ${g.unidad} (${g.porciones_dia} porciones/día)`
    )
    .join('\n');

  const userPrompt = `Genera 3 opciones de receta para ${tipoComida} con estas restricciones:

GRUPOS NUTRICIONALES DEL PACIENTE:
${gruposTexto}

CALORÍAS OBJETIVO PARA ESTA COMIDA: ${caloriasObjetivo} kcal

INGREDIENTES DISPONIBLES: ${ingredientesDisponibles.join(', ') || 'ingredientes comunes de cocina mexicana'}

TIEMPO MÁXIMO: ${tiempoMaxMinutos} minutos

RECETAS RECIENTES A EVITAR (no repetir): ${recetasRecientes.join(', ') || 'ninguna'}

Responde ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{
  "recetas": [
    {
      "nombre": "string",
      "descripcion": "string (1-2 oraciones)",
      "tiempo_minutos": number,
      "dificultad": "facil" | "media" | "dificil",
      "calorias": number,
      "proteina_g": number,
      "carbs_g": number,
      "grasa_g": number,
      "ingredientes": [
        { "nombre": "string", "cantidad": "string", "grupo": "string" }
      ],
      "pasos": ["string"],
      "tags": ["string"]
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
  // Remover posibles bloques de código markdown si Claude los incluye
  const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  const parsed = JSON.parse(jsonText) as { recetas: RecetaGenerada[] };
  return parsed.recetas;
}

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
