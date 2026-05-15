/**
 * Utilidades para exportar planes y listas de compras a PDF con jsPDF.
 * Usa coordenadas en mm (A4 = 210×297 portrait, 297×210 landscape).
 */
import jsPDF from 'jspdf';
import type { DespensaResult, ItemDespensa } from '../lib/api.js';
import type { PlanDiario, TipoComida } from '../types/index.js';

// ─── Paleta ─────────────────────────────────────────────────────────────────
const GREEN  = { r: 29,  g: 158, b: 117 };  // #1D9E75
const DGREEN = { r: 8,   g: 80,  b: 65  };  // #085041
const LGREY  = { r: 245, g: 245, b: 245 };
const GREY   = { r: 107, g: 114, b: 128 };
const BLACK  = { r: 30,  g: 30,  b: 30  };

const DIAS_LABEL   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const COMIDAS: TipoComida[] = ['desayuno', 'colacion', 'comida', 'cena'];
const COMIDA_LABEL: Record<TipoComida, string> = {
  desayuno: 'Desayuno',
  colacion: 'Colación',
  comida:   'Comida',
  cena:     'Cena',
};

// ─── Helpers generales ───────────────────────────────────────────────────────

function rgb(c: { r: number; g: number; b: number }) {
  return [c.r, c.g, c.b] as [number, number, number];
}

function formatFecha(iso: string) {
  return new Date(iso + 'T12:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short',
  });
}

function rangoFechas(dias: string[]) {
  if (!dias.length) return '';
  if (dias.length === 1) return formatFecha(dias[0]);
  return `${formatFecha(dias[0])} – ${formatFecha(dias[dias.length - 1])}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEJORA 1 — Lista de compras de Despensa
// ─────────────────────────────────────────────────────────────────────────────

export function exportarDespensaPDF(
  resultado: DespensaResult,
  gruposLista: Map<string, ItemDespensa[]>,
  diasArray: string[],
  numPersonas: number,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PW = 210;   // page width
  const PH = 297;   // page height
  const ML = 15;    // margin left
  const MR = 15;    // margin right
  const MT = 14;    // margin top
  const MB = 14;    // margin bottom
  const CW = PW - ML - MR;  // content width

  let y = MT;

  const checkNextPage = (needed: number) => {
    if (y + needed > PH - MB) {
      doc.addPage();
      y = MT;
    }
  };

  // ── Header verde ────────────────────────────────────────────
  doc.setFillColor(...rgb(GREEN));
  doc.rect(0, 0, PW, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Lista de Compras Semanal', ML, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(rangoFechas(diasArray), ML, 20);
  doc.text(
    `${numPersonas} persona${numPersonas !== 1 ? 's' : ''} · ${resultado.total_ingredientes} ingredientes · ${resultado.total_recetas} recetas`,
    ML, 26,
  );

  // Fecha de generación (esquina superior derecha)
  const hoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFontSize(8);
  doc.setTextColor(220, 255, 240);
  doc.text(`Generado: ${hoy}`, PW - MR, 26, { align: 'right' });

  y = 40;

  // ── Aviso de días sin plan ───────────────────────────────────
  if (resultado.dias_sin_plan.length > 0) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(ML, y, CW, 10, 2, 2, 'FD');
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(
      `⚠ Días sin recetas planificadas: ${resultado.dias_sin_plan.map(formatFecha).join(', ')}`,
      ML + 3, y + 6.5,
    );
    y += 14;
  }

  // ── Items por categoría ─────────────────────────────────────
  for (const [grupo, items] of gruposLista) {
    checkNextPage(12 + items.length * 7);

    // Encabezado de categoría
    doc.setFillColor(...rgb(LGREY));
    doc.rect(ML, y, CW, 8, 'F');
    doc.setTextColor(...rgb(DGREEN));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${grupo.toUpperCase()}  (${items.length})`, ML + 3, y + 5.5);
    y += 10;

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const item of items) {
      checkNextPage(7);

      // Checkbox
      doc.setDrawColor(...rgb(GREY));
      doc.setLineWidth(0.3);
      doc.rect(ML, y + 0.5, 4, 4);

      // Nombre
      doc.setTextColor(...rgb(BLACK));
      const nombre = doc.splitTextToSize(item.nombre, CW - 40)[0] as string;
      doc.text(nombre, ML + 6, y + 4);

      // Cantidad (derecha)
      doc.setTextColor(...rgb(GREY));
      doc.text(item.cantidad, PW - MR, y + 4, { align: 'right' });

      // Línea separadora
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(ML + 6, y + 5.5, PW - MR, y + 5.5);

      y += 6.5;
    }
    y += 4; // espacio entre grupos
  }

  // ── Footer en cada página ────────────────────────────────────
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...rgb(GREY));
    doc.text('NutriBarrio · Tu nutrición de barrio', ML, PH - 5);
    doc.text(`Pág. ${i} / ${totalPages}`, PW - MR, PH - 5, { align: 'right' });
  }

  doc.save(`lista-compras-${diasArray[0] ?? 'semana'}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MEJORA 4 — Plan semanal (grid Lun-Dom)
// ─────────────────────────────────────────────────────────────────────────────

export function exportarSemanaPDF(
  semana: { fecha: string; plan: PlanDiario[] }[],
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PW = 297;  // landscape width
  const PH = 210;  // landscape height
  const ML = 10;
  const MT = 10;
  const MB = 10;

  const LABEL_W = 22;   // columna de tipo comida
  const HDR_H   = 16;   // fila de encabezado de días
  const ROW_H   = (PH - MT - MB - HDR_H) / COMIDAS.length;  // ~43.5mm
  const DAY_W   = (PW - ML * 2 - LABEL_W) / 7;              // ~35mm

  // ── Header página ────────────────────────────────────────────
  doc.setFillColor(...rgb(GREEN));
  doc.rect(0, 0, PW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Plan Semanal — NutriBarrio', ML, 5.5);

  // Rango de fechas
  const fechas = semana.map((d) => d.fecha);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(rangoFechas(fechas), PW - ML, 5.5, { align: 'right' });

  const startY = MT + 8; // debajo del header verde

  // ── Encabezados de días ──────────────────────────────────────
  // Celda vacía esquina superior izquierda
  doc.setFillColor(...rgb(LGREY));
  doc.rect(ML, startY, LABEL_W, HDR_H, 'F');

  semana.forEach(({ fecha }, i) => {
    const x = ML + LABEL_W + i * DAY_W;
    const isHoy = fecha === new Date().toISOString().split('T')[0];

    if (isHoy) {
      doc.setFillColor(...rgb(GREEN));
    } else {
      doc.setFillColor(...rgb(LGREY));
    }
    doc.rect(x, startY, DAY_W, HDR_H, 'F');

    // Borde
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(x, startY, DAY_W, HDR_H);

    // Texto día
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(isHoy ? 255 : DGREEN.r, isHoy ? 255 : DGREEN.g, isHoy ? 255 : DGREEN.b);
    doc.text(DIAS_LABEL[i], x + DAY_W / 2, startY + 6, { align: 'center' });

    // Número día
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(isHoy ? 220 : GREY.r, isHoy ? 255 : GREY.g, isHoy ? 240 : GREY.b);
    doc.text(String(new Date(fecha + 'T12:00').getDate()), x + DAY_W / 2, startY + 12, { align: 'center' });
  });

  // ── Filas de tipos de comida ─────────────────────────────────
  COMIDAS.forEach((tipo, rowIdx) => {
    const rowY = startY + HDR_H + rowIdx * ROW_H;
    const isEven = rowIdx % 2 === 0;

    // Celda etiqueta
    doc.setFillColor(isEven ? 248 : 240, isEven ? 253 : 250, isEven ? 250 : 247);
    doc.rect(ML, rowY, LABEL_W, ROW_H, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(ML, rowY, LABEL_W, ROW_H);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...rgb(DGREEN));
    doc.text(COMIDA_LABEL[tipo], ML + LABEL_W / 2, rowY + ROW_H / 2 + 1, { align: 'center' });

    // Celdas de cada día
    semana.forEach(({ plan }, dayIdx) => {
      const x = ML + LABEL_W + dayIdx * DAY_W;
      const entrada = plan.find((p) => p.tipo_comida === tipo);

      doc.setFillColor(isEven ? 255 : 252, isEven ? 255 : 254, isEven ? 255 : 253);
      doc.rect(x, rowY, DAY_W, ROW_H, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.15);
      doc.rect(x, rowY, DAY_W, ROW_H);

      if (entrada?.receta) {
        const receta = entrada.receta;

        // Nombre (max 2 líneas)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...rgb(BLACK));
        const nombreLines = doc.splitTextToSize(receta.nombre, DAY_W - 4) as string[];
        const visibleLines = nombreLines.slice(0, 2);
        visibleLines.forEach((line, li) => {
          doc.text(line, x + 2, rowY + 6 + li * 5);
        });

        // Macros (kcal · proteína)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...rgb(GREY));
        doc.text(
          `${receta.calorias} kcal · ${receta.proteina_g}g prot`,
          x + 2, rowY + ROW_H - 8,
        );

        // Tiempo
        if (receta.tiempo_minutos) {
          doc.text(`⏱ ${receta.tiempo_minutos} min`, x + 2, rowY + ROW_H - 3.5);
        }

        // Indicador consumido
        if (entrada.consumido) {
          doc.setFillColor(...rgb(GREEN));
          doc.circle(x + DAY_W - 3, rowY + 3, 1.5, 'F');
        }
      } else {
        // Sin receta
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(200, 200, 200);
        doc.text('—', x + DAY_W / 2, rowY + ROW_H / 2 + 1, { align: 'center' });
      }
    });
  });

  // ── Leyenda ──────────────────────────────────────────────────
  const legendY = PH - MB + 2;
  doc.setFillColor(...rgb(GREEN));
  doc.circle(ML + 2, legendY - 1, 1.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...rgb(GREY));
  doc.text('= Consumido', ML + 5, legendY);

  // Fecha export
  const hoyCadena = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`NutriBarrio · Exportado el ${hoyCadena}`, PW - ML, legendY, { align: 'right' });

  doc.save(`plan-semanal-${fechas[0] ?? 'semana'}.pdf`);
}
