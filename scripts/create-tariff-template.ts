import writeXlsxFile from "write-excel-file/node";
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { catalog } from "../src/data/catalog.generated";

const sourcePath = resolve("data/tarifa-maestra.xlsx");
const publicPath = resolve("public/data/tarifa-maestra.xlsx");

type CellValue = string | number | boolean | null;

const headerStyle = {
  fontWeight: "bold" as const,
  color: "#FFFFFF",
  backgroundColor: "#14415C",
  align: "center" as const,
};

function yesNo(value: boolean): string {
  return value ? "SI" : "NO";
}

function row(values: CellValue[], header = false) {
  return values.map((value) => (header ? { value, ...headerStyle } : { value }));
}

async function main() {
  const mtHeader = [
    "central",
    "compresor",
    "cantidad",
    "potencia_minima_kw",
    "potencia_maxima_32_kw",
    "potencia_maxima_38_kw",
    "potencia_maxima_43_kw",
    "potencia_disipar_kw",
    "recuperador_kw",
    "potencia_absorbida_kw",
    "imax_a",
    "peso_kg",
    "conexion_asp",
    "conexion_desc",
    "conexion_liq",
    "tipo",
    "dimensiones",
    "volumen_recipiente_l",
    "pvp",
    "opcional_duplicar_hpv",
    "opcional_recuperador",
    "activo",
  ];

  const btHeader = [
    "central",
    "compresor",
    "cantidad",
    "potencia_minima_kw",
    "potencia_maxima_kw",
    "potencia_disipar_kw",
    "potencia_absorbida_kw",
    "imax_a",
    "peso_kg",
    "conexion_asp",
    "pvp",
    "activo",
  ];

  const optionalHeader = ["codigo", "descripcion", "precio", "aplica_a", "regla", "activo"];
  const configHeader = ["clave", "valor"];

  const sheets = [
    {
      name: "MT",
      data: [
      row(mtHeader, true),
      ...catalog.mt.map((unit) =>
        row([
          unit.central,
          unit.compressor,
          unit.quantity,
          unit.minPowerKw,
          unit.maxPower32Kw,
          unit.maxPower38Kw,
          unit.maxPower43Kw,
          unit.rejectPowerKw,
          unit.heatRecoveryKw,
          unit.absorbedPowerKw,
          unit.imaxA,
          unit.weightKg,
          unit.aspConnection,
          unit.descConnection,
          unit.liqConnection,
          unit.enclosureType,
          unit.dimensions,
          unit.receiverVolumeL,
          unit.pvp,
          unit.duplicateHpvPrice,
          unit.heatRecoveryPrice,
          yesNo(unit.active),
        ]),
      ),
      ],
      columns: mtHeader.map((header) => ({ width: Math.max(header.length + 3, 12) })),
    },
    {
      name: "BT",
      data: [
      row(btHeader, true),
      ...catalog.bt.map((unit) =>
        row([
          unit.central,
          unit.compressor,
          unit.quantity,
          unit.minPowerKw,
          unit.maxPowerKw,
          unit.rejectPowerKw,
          unit.absorbedPowerKw,
          unit.imaxA,
          unit.weightKg,
          unit.aspConnection,
          unit.pvp,
          yesNo(unit.active),
        ]),
      ),
      ],
      columns: btHeader.map((header) => ({ width: Math.max(header.length + 3, 12) })),
    },
    {
      name: "Opcionales",
      data: [
      row(optionalHeader, true),
      ...catalog.optionals.map((item) =>
        row([item.code, item.description, item.price, item.appliesTo, item.rule, yesNo(item.active)]),
      ),
      ],
      columns: optionalHeader.map((header) => ({ width: Math.max(header.length + 3, header === "descripcion" ? 54 : 12) })),
    },
    {
      name: "Configuracion",
      data: [
      row(configHeader, true),
      row(["empresa", catalog.config.company]),
      row(["tarifa", catalog.config.tariffName]),
      row(["iva", catalog.config.vatRate]),
      ],
      columns: configHeader.map((header) => ({ width: Math.max(header.length + 3, 16) })),
    },
  ];

  await mkdir(dirname(sourcePath), { recursive: true });
  await mkdir(dirname(publicPath), { recursive: true });
  await writeXlsxFile(sheets, {
    filePath: sourcePath,
    stickyRowsCount: 1,
  });
  await copyFile(sourcePath, publicPath);
  console.log(`Excel maestro creado: ${sourcePath}`);
  console.log(`Copia publica creada: ${publicPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
