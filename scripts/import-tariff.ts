import readXlsxFile from "read-excel-file/node";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Catalog } from "../src/types";

const sourcePath = resolve("data/tarifa-maestra.xlsx");
const publicPath = resolve("public/data/tarifa-maestra.xlsx");
const outputPath = resolve("src/data/catalog.generated.ts");

type RawValue = string | number | boolean | Date | null;
type Row = Record<string, RawValue>;

async function sheetRows(name: string): Promise<Row[]> {
  const workbook = (await readXlsxFile(sourcePath, { getSheets: true })) as Array<{
    sheet: string;
    data: RawValue[][];
  }>;
  const sheet = workbook.find((item) => item.sheet === name);
  if (!sheet) throw new Error(`Falta la hoja ${name}`);
  const rows = sheet.data;
  if (rows.length === 0) throw new Error(`La hoja ${name} esta vacia`);
  const headers = rows[0].map((value) => String(value ?? "").trim());
  return rows
    .slice(1)
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null])))
    .filter((record) => Object.values(record).some((value) => value !== null && value !== ""));
}

function text(row: Row, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function number(row: Row, key: string): number {
  const raw = row[key];
  if (typeof raw === "number") return raw;
  const parsed = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error(`Valor numerico invalido en ${key}: ${raw}`);
  return parsed;
}

function active(row: Row): boolean {
  const value = text(row, "activo").toUpperCase();
  return value === "SI" || value === "TRUE" || value === "1";
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) throw new Error(`${label} duplicado: ${value}`);
    seen.add(value);
  });
}

async function main() {
  const mtRows = await sheetRows("MT");
  const btRows = await sheetRows("BT");
  const optionalRows = await sheetRows("Opcionales");
  const configRows = await sheetRows("Configuracion");

  const configMap = new Map(configRows.map((row) => [text(row, "clave"), text(row, "valor")]));

  const catalog: Catalog = {
    config: {
      company: configMap.get("empresa") || "Grupo Disco",
      tariffName: configMap.get("tarifa") || "Tarifa",
      vatRate: Number((configMap.get("iva") || "0.21").replace(",", ".")),
    },
    mt: mtRows.map((row) => ({
      central: text(row, "central"),
      compressor: text(row, "compresor"),
      quantity: number(row, "cantidad"),
      minPowerKw: number(row, "potencia_minima_kw"),
      maxPower32Kw: number(row, "potencia_maxima_32_kw"),
      maxPower38Kw: number(row, "potencia_maxima_38_kw"),
      maxPower43Kw: number(row, "potencia_maxima_43_kw"),
      rejectPowerKw: number(row, "potencia_disipar_kw"),
      heatRecoveryKw: number(row, "recuperador_kw"),
      absorbedPowerKw: number(row, "potencia_absorbida_kw"),
      imaxA: number(row, "imax_a"),
      weightKg: number(row, "peso_kg"),
      aspConnection: text(row, "conexion_asp"),
      descConnection: text(row, "conexion_desc"),
      liqConnection: text(row, "conexion_liq"),
      enclosureType: text(row, "tipo"),
      dimensions: text(row, "dimensiones"),
      receiverVolumeL: number(row, "volumen_recipiente_l"),
      pvp: number(row, "pvp"),
      duplicateHpvPrice: number(row, "opcional_duplicar_hpv"),
      heatRecoveryPrice: number(row, "opcional_recuperador"),
      active: active(row),
    })),
    bt: btRows.map((row) => ({
      central: text(row, "central"),
      compressor: text(row, "compresor"),
      quantity: number(row, "cantidad"),
      minPowerKw: number(row, "potencia_minima_kw"),
      maxPowerKw: number(row, "potencia_maxima_kw"),
      rejectPowerKw: number(row, "potencia_disipar_kw"),
      absorbedPowerKw: number(row, "potencia_absorbida_kw"),
      imaxA: number(row, "imax_a"),
      weightKg: number(row, "peso_kg"),
      aspConnection: text(row, "conexion_asp"),
      pvp: number(row, "pvp"),
      active: active(row),
    })),
    optionals: optionalRows.map((row) => ({
      code: text(row, "codigo"),
      description: text(row, "descripcion"),
      price: number(row, "precio"),
      appliesTo: text(row, "aplica_a") as "quote" | "mt",
      rule: text(row, "regla"),
      active: active(row),
    })),
  };

  assertUnique(catalog.mt.map((unit) => unit.central), "Modelo MT");
  assertUnique(catalog.bt.map((unit) => unit.central), "Modelo BT");
  assertUnique(catalog.optionals.map((item) => item.code), "Opcional");

  const file = `import type { Catalog } from "../types";\n\nexport const catalog: Catalog = ${JSON.stringify(
    catalog,
    null,
    2,
  )};\n`;
  await writeFile(outputPath, file, "utf8");
  await mkdir(dirname(publicPath), { recursive: true });
  await copyFile(sourcePath, publicPath);

  console.log("Tarifa importada correctamente.");
  console.log(`${catalog.mt.length} modelos MT`);
  console.log(`${catalog.bt.length} modelos BT`);
  console.log(`${catalog.optionals.length} opcionales`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
