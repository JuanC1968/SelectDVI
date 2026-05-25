import { useMemo, useState } from "react";
import { Calculator, Download, FileSpreadsheet, ThermometerSnowflake } from "lucide-react";
import { catalog } from "./data/catalog.generated";
import { canUseOptional, getMtPower, selectEquipment } from "./selection";
import type { BtUnit, Condition, MtUnit, OptionalItem } from "./types";
import "./index.css";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function formatKw(value: number | null | undefined): string {
  return typeof value === "number" ? `${value.toFixed(1)} kW` : "-";
}

function formatMoney(value: number): string {
  return euro.format(value);
}

function selectedByCentral<T extends { central: string }>(items: T[], central: string | null): T | null {
  return items.find((item) => item.central === central) ?? null;
}

export default function App() {
  const [mtLoadKw, setMtLoadKw] = useState(45);
  const [btLoadKw, setBtLoadKw] = useState(8);
  const [btCompressors, setBtCompressors] = useState<0 | 1 | 2>(1);
  const [condition, setCondition] = useState<Condition>("32");
  const [manualMt, setManualMt] = useState<string | null>(null);
  const [manualBt, setManualBt] = useState<string | null>(null);
  const [optionCodes, setOptionCodes] = useState<string[]>([]);

  const automatic = useMemo(
    () =>
      selectEquipment(
        {
          mtLoadKw,
          btLoadKw,
          btCompressors,
          condition,
        },
        catalog.mt,
        catalog.bt,
      ),
    [mtLoadKw, btLoadKw, btCompressors, condition],
  );

  const selectedMt = selectedByCentral(automatic.validMt, manualMt) ?? automatic.selectedMt;
  const selectedBt =
    btCompressors === 0 ? null : selectedByCentral(automatic.validBt, manualBt) ?? automatic.selectedBt;
  const btRejectPowerKw = selectedBt?.rejectPowerKw ?? 0;
  const equivalentMtLoadKw = mtLoadKw + btRejectPowerKw;
  const mtNetAvailableKw = selectedMt ? getMtPower(selectedMt, condition) - btRejectPowerKw : null;

  const modelOptions: OptionalItem[] = [
    ...(selectedMt?.duplicateHpvPrice
      ? [
          {
            code: "DUPLICAR_HPV",
            description: "Duplicar HPV",
            price: selectedMt.duplicateHpvPrice,
            appliesTo: "mt" as const,
            rule: "Precio segun central MT",
            active: true,
          },
        ]
      : []),
    ...(selectedMt?.heatRecoveryPrice
      ? [
          {
            code: "RECUPERADOR",
            description: "Recuperador",
            price: selectedMt.heatRecoveryPrice,
            appliesTo: "mt" as const,
            rule: "Precio segun central MT",
            active: true,
          },
        ]
      : []),
  ];

  const availableOptions = [...modelOptions, ...catalog.optionals].filter(
    (item) => item.active && canUseOptional(item.code, selectedMt, selectedBt),
  );
  const selectedOptions = availableOptions.filter((item) => optionCodes.includes(item.code));
  const subtotal =
    (selectedMt?.pvp ?? 0) + (selectedBt?.pvp ?? 0) + selectedOptions.reduce((sum, item) => sum + item.price, 0);
  const vat = subtotal * catalog.config.vatRate;

  function updateOption(code: string, checked: boolean) {
    setOptionCodes((current) => (checked ? [...current, code] : current.filter((item) => item !== code)));
  }

  function resetManualSelection() {
    setManualMt(null);
    setManualBt(null);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">GD</div>
          <div>
            <h1>SelectDVI</h1>
            <p>{catalog.config.company} · Centrales CO2 transcrítico · {catalog.config.tariffName}</p>
          </div>
        </div>
        <a className="excelLink" href="/data/tarifa-maestra.xlsx">
          <FileSpreadsheet size={18} />
          Excel maestro
        </a>
      </header>

      <section className="workspace">
        <aside className="panel inputsPanel">
          <div className="panelTitle">
            <Calculator size={19} />
            <h2>Datos de diseño</h2>
          </div>

          <label className="field">
            <span>Carga MT requerida</span>
            <input type="number" min="0" step="0.1" value={mtLoadKw} onChange={(event) => setMtLoadKw(Number(event.target.value))} />
          </label>

          <div className="field">
            <span>Compresores de negativa</span>
            <div className="segmented">
              {[0, 1, 2].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={btCompressors === value ? "active" : ""}
                  onClick={() => {
                    setBtCompressors(value as 0 | 1 | 2);
                    setManualBt(null);
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <label className={`field ${btCompressors === 0 ? "disabled" : ""}`}>
            <span>Carga BT requerida</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={btLoadKw}
              disabled={btCompressors === 0}
              onChange={(event) => {
                setBtLoadKw(Number(event.target.value));
                setManualBt(null);
              }}
            />
          </label>

          <div className="field">
            <span>Condición MT</span>
            <div className="segmented">
              {(["32", "38", "43"] as Condition[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={condition === value ? "active" : ""}
                  onClick={() => {
                    setCondition(value);
                    setManualMt(null);
                  }}
                >
                  {value} ºC
                </button>
              ))}
            </div>
          </div>

          <div className="panelTitle small">
            <ThermometerSnowflake size={17} />
            <h2>Opcionales</h2>
          </div>
          <div className="optionsList">
            {availableOptions.map((item) => (
              <label key={item.code} className="checkRow">
                <input
                  type="checkbox"
                  checked={optionCodes.includes(item.code)}
                  onChange={(event) => updateOption(item.code, event.target.checked)}
                />
                <span>{item.description}</span>
                <strong>{formatMoney(item.price)}</strong>
              </label>
            ))}
          </div>
        </aside>

        <section className="panel resultPanel">
          <div className="panelHeader">
            <div>
              <h2>Seleccion tecnica</h2>
              <p>Selección automática con cambio manual entre modelos válidos.</p>
            </div>
            <button type="button" className="ghostButton" onClick={resetManualSelection}>
              Auto
            </button>
          </div>

          {automatic.errors.length > 0 && (
            <div className="alert">
              {automatic.errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          <div className="calcStrip">
            <div>
              <span>MT requerida</span>
              <strong>{formatKw(mtLoadKw)}</strong>
            </div>
            <div>
              <span>Disipación BT a MT</span>
              <strong>{formatKw(btRejectPowerKw)}</strong>
            </div>
            <div>
              <span>Carga equivalente MT</span>
              <strong>{formatKw(equivalentMtLoadKw)}</strong>
            </div>
            <div>
              <span>MT neta disponible</span>
              <strong>{formatKw(mtNetAvailableKw)}</strong>
            </div>
          </div>

          <EquipmentCard
            title="Central MT"
            selected={selectedMt}
            validUnits={automatic.validMt}
            value={selectedMt?.central ?? ""}
            onChange={setManualMt}
            condition={condition}
          />

          <EquipmentCard
            title="Central BT"
            selected={selectedBt}
            validUnits={automatic.validBt}
            value={selectedBt?.central ?? ""}
            onChange={setManualBt}
            condition={condition}
            disabled={btCompressors === 0}
          />
        </section>

        <aside className="panel budgetPanel">
          <div className="panelHeader">
            <div>
            <h2>Presupuesto PVP</h2>
              <p>Sin descuentos comerciales.</p>
            </div>
          </div>

          <PriceRow label={selectedMt ? `MT ${selectedMt.central}` : "MT no disponible"} value={selectedMt?.pvp ?? 0} />
          {selectedBt && <PriceRow label={`BT ${selectedBt.central}`} value={selectedBt.pvp} />}
          {selectedOptions.map((item) => (
            <PriceRow key={item.code} label={item.description} value={item.price} />
          ))}

          <div className="totals">
            <PriceRow label="Total sin IVA" value={subtotal} strong />
            <PriceRow label={`IVA ${(catalog.config.vatRate * 100).toFixed(0)}%`} value={vat} />
            <PriceRow label="Total con IVA" value={subtotal + vat} total />
          </div>

          <button
            type="button"
            className="primaryButton"
            disabled={!selectedMt || automatic.errors.length > 0}
            onClick={async () => {
              const { generateQuotePdf } = await import("./pdf");
              await generateQuotePdf({
                mtLoadKw,
                btLoadKw,
                btCompressors,
                condition,
                selectedMt,
                selectedBt,
                selectedOptions,
                vatRate: catalog.config.vatRate,
              });
            }}
          >
            <Download size={18} />
            Generar PDF
          </button>
        </aside>
      </section>
    </main>
  );
}

function EquipmentCard({
  title,
  selected,
  validUnits,
  value,
  onChange,
  condition,
  disabled,
}: {
  title: string;
  selected: MtUnit | BtUnit | null;
  validUnits: Array<MtUnit | BtUnit>;
  value: string;
  onChange: (value: string | null) => void;
  condition: Condition;
  disabled?: boolean;
}) {
  return (
    <article className={`equipment ${disabled ? "muted" : ""}`}>
      <div className="equipmentTop">
        <div>
          <span>{title}</span>
          <h3>{disabled ? "No seleccionada" : selected?.central ?? "No disponible"}</h3>
        </div>
        <select value={value} disabled={disabled || validUnits.length === 0} onChange={(event) => onChange(event.target.value || null)}>
          {validUnits.map((unit) => (
            <option key={unit.central} value={unit.central}>
              {unit.central}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="specGrid">
          <Spec label="Compresor" value={`${selected.quantity} x ${selected.compressor}`} />
          <Spec
            label="Potencia maxima"
            value={"maxPowerKw" in selected ? formatKw(selected.maxPowerKw) : formatKw(getMtPower(selected, condition))}
          />
          <Spec label="Potencia a disipar" value={formatKw(selected.rejectPowerKw)} />
          <Spec label="Peso" value={`${selected.weightKg} kg`} />
          {"dimensions" in selected && <Spec label="Dimensiones" value={`${selected.enclosureType} · ${selected.dimensions} m`} />}
          <Spec label="Conexion aspiracion" value={selected.aspConnection} />
          {"descConnection" in selected && <Spec label="Conexion descarga" value={selected.descConnection} />}
          {"liqConnection" in selected && <Spec label="Conexion liquido" value={selected.liqConnection} />}
        </div>
      )}
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="spec">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PriceRow({ label, value, strong, total }: { label: string; value: number; strong?: boolean; total?: boolean }) {
  return (
    <div className={`priceRow ${strong ? "strong" : ""} ${total ? "total" : ""}`}>
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
    </div>
  );
}
