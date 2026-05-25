import type { BtUnit, Condition, MtUnit, SelectionInput, SelectionResult } from "./types";

export function getMtPower(unit: MtUnit, condition: Condition): number {
  if (condition === "32") return unit.maxPower32Kw;
  if (condition === "38") return unit.maxPower38Kw;
  return unit.maxPower43Kw;
}

export function selectEquipment(
  input: SelectionInput,
  mtUnits: MtUnit[],
  btUnits: BtUnit[],
): SelectionResult {
  const activeMt = mtUnits.filter((unit) => unit.active);
  const activeBt = btUnits.filter((unit) => unit.active);
  const errors: string[] = [];

  const validBt =
    input.btCompressors === 0
      ? []
      : activeBt
          .filter((unit) => unit.quantity === input.btCompressors && unit.maxPowerKw >= input.btLoadKw)
          .sort((a, b) => a.maxPowerKw - b.maxPowerKw);

  const selectedBt = input.btCompressors === 0 ? null : validBt[0] ?? null;
  if (input.btCompressors > 0 && !selectedBt) {
    errors.push("No hay central BT disponible para la carga y número de compresores indicados.");
  }

  const btRejectPowerKw = selectedBt?.rejectPowerKw ?? 0;
  const equivalentMtLoadKw = input.mtLoadKw + btRejectPowerKw;

  const validMt = activeMt
    .filter((unit) => getMtPower(unit, input.condition) >= equivalentMtLoadKw)
    .sort((a, b) => getMtPower(a, input.condition) - getMtPower(b, input.condition));

  const selectedMt = validMt[0] ?? null;
  if (!selectedMt) {
    errors.push("No hay central MT disponible para la carga equivalente indicada.");
  }

  return {
    validMt,
    validBt,
    selectedMt,
    selectedBt,
    equivalentMtLoadKw,
    btRejectPowerKw,
    mtNetAvailableKw: selectedMt ? getMtPower(selectedMt, input.condition) - btRejectPowerKw : null,
    errors,
  };
}

export function canUseOptional(code: string, selectedMt: MtUnit | null, selectedBt: BtUnit | null): boolean {
  if (code === "PRESOSTATO_BT") return !selectedBt;
  if (code === "REPUESTO_ELECTRONICA") {
    return ["RZXCO2-35S", "RZXCO2-40S", "RZXCO2-60", "RZXCO2-75"].includes(selectedMt?.central ?? "");
  }
  if (code === "REPUESTO_FILTRO") {
    return ["RZXCO2-120", "RZXCO2-150"].includes(selectedMt?.central ?? "");
  }
  if (code === "SIN_CARENADO") {
    return ["RZXCO2-35S", "RZXCO2-40S"].includes(selectedMt?.central ?? "");
  }
  return true;
}
