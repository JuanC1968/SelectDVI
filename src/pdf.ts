import { jsPDF } from "jspdf";
import type { BtUnit, Condition, MtUnit, OptionalItem } from "./types";
import { getMtPower } from "./selection";

type PdfInput = {
  mtLoadKw: number;
  btLoadKw: number;
  btCompressors: number;
  condition: Condition;
  selectedMt: MtUnit | null;
  selectedBt: BtUnit | null;
  selectedOptions: OptionalItem[];
  vatRate: number;
};

type Rgb = [number, number, number];

const navy: Rgb = [9, 64, 107];
const blue: Rgb = [0, 86, 159];
const ink: Rgb = [25, 32, 41];
const muted: Rgb = [92, 101, 112];
const border: Rgb = [214, 221, 229];
const soft: Rgb = [244, 247, 250];
const paleBlue: Rgb = [232, 241, 249];
const white: Rgb = [255, 255, 255];

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function money(value: number): string {
  return euro.format(value);
}

function kw(value: number): string {
  return `${value.toFixed(1)} kW`;
}

function setColor(doc: jsPDF, color: Rgb): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

function fill(doc: jsPDF, color: Rgb): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

function stroke(doc: jsPDF, color: Rgb): void {
  doc.setDrawColor(color[0], color[1], color[2]);
}

async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sectionTitle(doc: jsPDF, title: string, y: number): void {
  fill(doc, navy);
  doc.roundedRect(18, y - 4, 3, 3, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, ink);
  doc.text(title, 24, y);
}

function metricCard(doc: jsPDF, x: number, y: number, w: number, label: string, value: string): void {
  fill(doc, soft);
  stroke(doc, border);
  doc.roundedRect(x, y, w, 19, 2.5, 2.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  setColor(doc, muted);
  doc.text(label.toUpperCase(), x + 4, y + 7);
  doc.setFontSize(12);
  setColor(doc, ink);
  doc.text(value, x + 4, y + 15);
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number, w: number): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  setColor(doc, muted);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  setColor(doc, ink);
  doc.text(value || "-", x, y + 5.6, { maxWidth: w });
}

function wrappedPriceRow(doc: jsPDF, y: number, label: string, value: number): number {
  const text = doc.splitTextToSize(label, 122);
  const h = Math.max(8.2, text.length * 4.2 + 3.5);
  stroke(doc, border);
  doc.line(18, y + h - 5.1, 192, y + h - 5.1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  setColor(doc, ink);
  doc.text(text, 21, y);
  doc.setFont("helvetica", "bold");
  doc.text(money(value), 188, y, { align: "right" });
  return y + h;
}

function equipmentBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  unit: MtUnit | BtUnit | null,
  condition: Condition,
): void {
  fill(doc, white);
  stroke(doc, border);
  doc.roundedRect(x, y, w, 58, 2.5, 2.5, "FD");
  fill(doc, paleBlue);
  doc.roundedRect(x, y, w, 12, 2.5, 2.5, "F");
  doc.rect(x, y + 8, w, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColor(doc, navy);
  doc.text(title, x + 5, y + 8);

  if (!unit) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setColor(doc, muted);
    doc.text("No seleccionada", x + 5, y + 28);
    return;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setColor(doc, ink);
  doc.text(unit.central, x + 5, y + 22);

  const maxPower = "maxPowerKw" in unit ? unit.maxPowerKw : getMtPower(unit, condition);
  labelValue(doc, "Compresor", `${unit.quantity} x ${unit.compressor}`, x + 5, y + 32, w - 10);
  labelValue(doc, "Potencia max.", kw(maxPower), x + 5, y + 45, 28);
  labelValue(doc, "Disipar", kw(unit.rejectPowerKw), x + 38, y + 45, 28);
  labelValue(doc, "Peso", `${unit.weightKg} kg`, x + 68, y + 45, 24);

  if ("dimensions" in unit) {
    labelValue(doc, "Envolvente", `${unit.enclosureType} · ${unit.dimensions} m`, x + 96, y + 32, w - 102);
    labelValue(doc, "Aspiracion", unit.aspConnection, x + 96, y + 45, 22);
    labelValue(doc, "Descarga", unit.descConnection, x + 121, y + 45, 22);
    labelValue(doc, "Liquido", unit.liqConnection, x + 146, y + 45, 22);
  } else {
    labelValue(doc, "Aspiracion", unit.aspConnection, x + 96, y + 45, 32);
  }
}

export async function generateQuotePdf(input: PdfInput): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const subtotal =
    (input.selectedMt?.pvp ?? 0) +
    (input.selectedBt?.pvp ?? 0) +
    input.selectedOptions.reduce((sum, item) => sum + item.price, 0);
  const vat = subtotal * input.vatRate;
  const total = subtotal + vat;
  const btReject = input.selectedBt?.rejectPowerKw ?? 0;
  const equivalentMtLoad = input.mtLoadKw + btReject;
  const mtPower = input.selectedMt ? getMtPower(input.selectedMt, input.condition) : 0;
  const mtNet = input.selectedMt ? mtPower - btReject : 0;
  const logo = await imageToDataUrl("/brand/grupo-disco-logo.jpg");

  fill(doc, navy);
  doc.rect(0, 0, 210, 36, "F");
  fill(doc, blue);
  doc.rect(0, 36, 210, 3, "F");

  if (logo) {
    fill(doc, white);
    doc.roundedRect(18, 9, 54, 20, 2, 2, "F");
    doc.addImage(logo, "JPEG", 21, 11, 48, 16);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    setColor(doc, white);
    doc.text("Grupo DISCO", 18, 22);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setColor(doc, white);
  doc.text("Presupuesto CO2 transcritico", 82, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Seleccion tecnica y valoracion PVP", 82, 25);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 192, 11, { align: "right" });
  doc.text("Sin descuentos comerciales", 192, 25, { align: "right" });

  sectionTitle(doc, "Datos de diseno", 51);
  metricCard(doc, 18, 57, 40, "Carga MT", kw(input.mtLoadKw));
  metricCard(doc, 63, 57, 40, "Carga BT", input.btCompressors === 0 ? "Sin BT" : kw(input.btLoadKw));
  metricCard(doc, 108, 57, 40, "Compresores BT", String(input.btCompressors));
  metricCard(doc, 153, 57, 39, "Condicion MT", `${input.condition} C`);

  sectionTitle(doc, "Resultado de seleccion", 89);
  metricCard(doc, 18, 95, 40, "Disipacion BT", kw(btReject));
  metricCard(doc, 63, 95, 40, "Carga equiv. MT", kw(equivalentMtLoad));
  metricCard(doc, 108, 95, 40, `Potencia MT ${input.condition} C`, input.selectedMt ? kw(mtPower) : "-");
  metricCard(doc, 153, 95, 39, "MT neta", input.selectedMt ? kw(mtNet) : "-");

  equipmentBlock(doc, 18, 126, 174, "Central MT seleccionada", input.selectedMt, input.condition);
  equipmentBlock(doc, 18, 190, 174, "Modulo BT seleccionado", input.selectedBt, input.condition);

  doc.addPage();
  fill(doc, navy);
  doc.rect(0, 0, 210, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, white);
  doc.text("Resumen economico", 18, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Precios PVP. Descuentos comerciales a aplicar posteriormente en CRM.", 192, 13, { align: "right" });

  sectionTitle(doc, "Desglose PVP", 34);
  let y = 47;
  if (input.selectedMt) y = wrappedPriceRow(doc, y, `Central MT ${input.selectedMt.central}`, input.selectedMt.pvp);
  if (input.selectedBt) y = wrappedPriceRow(doc, y, `Modulo BT ${input.selectedBt.central}`, input.selectedBt.pvp);
  input.selectedOptions.forEach((item) => {
    y = wrappedPriceRow(doc, y, item.description, item.price);
  });
  if (input.selectedOptions.length === 0) {
    y = wrappedPriceRow(doc, y, "Sin opcionales seleccionados", 0);
  }

  y += 9;
  const totalBoxX = 104;
  const totalBoxW = 88;
  fill(doc, paleBlue);
  stroke(doc, border);
  doc.roundedRect(totalBoxX, y - 6, totalBoxW, 44, 2.5, 2.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  setColor(doc, ink);
  doc.text("Total sin IVA", totalBoxX + 6, y);
  doc.text(money(subtotal), totalBoxX + totalBoxW - 6, y, { align: "right" });
  stroke(doc, border);
  doc.line(totalBoxX + 6, y + 7, totalBoxX + totalBoxW - 6, y + 7);
  doc.setFont("helvetica", "normal");
  doc.text(`IVA ${(input.vatRate * 100).toFixed(0)}%`, totalBoxX + 6, y + 14);
  doc.setFont("helvetica", "bold");
  doc.text(money(vat), totalBoxX + totalBoxW - 6, y + 14, { align: "right" });
  fill(doc, navy);
  doc.roundedRect(totalBoxX + 6, y + 22, totalBoxW - 12, 14, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColor(doc, white);
  doc.text("Total con IVA", totalBoxX + 12, y + 31);
  doc.setFontSize(13);
  doc.text(money(total), totalBoxX + totalBoxW - 12, y + 31, { align: "right" });

  sectionTitle(doc, "Notas", 128);
  fill(doc, soft);
  stroke(doc, border);
  doc.roundedRect(18, 136, 174, 34, 2.5, 2.5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, muted);
  doc.text(
    [
      "Seleccion realizada segun catalogo y condiciones indicadas.",
      "La seleccion final debe ser contrastada y ratificada por el departamento tecnico.",
      "El presente documento no incluye descuentos comerciales ni condiciones particulares de oferta.",
    ],
    24,
    146,
    { maxWidth: 158, lineHeightFactor: 1.35 },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, muted);
  doc.text("Grupo DISCO · Refrigeracion comercial e industrial", 18, 284);
  doc.text("Pagina 2 / 2", 192, 284, { align: "right" });

  doc.setPage(1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, muted);
  doc.text("Grupo DISCO · Refrigeracion comercial e industrial", 18, 284);
  doc.text("Pagina 1 / 2", 192, 284, { align: "right" });

  doc.save("presupuesto-selectdvi.pdf");
}
