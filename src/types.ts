export type Condition = "32" | "38" | "43";

export type MtUnit = {
  central: string;
  compressor: string;
  quantity: number;
  minPowerKw: number;
  maxPower32Kw: number;
  maxPower38Kw: number;
  maxPower43Kw: number;
  rejectPowerKw: number;
  heatRecoveryKw: number;
  absorbedPowerKw: number;
  imaxA: number;
  weightKg: number;
  aspConnection: string;
  descConnection: string;
  liqConnection: string;
  enclosureType: string;
  dimensions: string;
  receiverVolumeL: number;
  pvp: number;
  duplicateHpvPrice: number;
  heatRecoveryPrice: number;
  active: boolean;
};

export type BtUnit = {
  central: string;
  compressor: string;
  quantity: number;
  minPowerKw: number;
  maxPowerKw: number;
  rejectPowerKw: number;
  absorbedPowerKw: number;
  imaxA: number;
  weightKg: number;
  aspConnection: string;
  pvp: number;
  active: boolean;
};

export type OptionalItem = {
  code: string;
  description: string;
  price: number;
  appliesTo: "quote" | "mt";
  rule: string;
  active: boolean;
};

export type Catalog = {
  mt: MtUnit[];
  bt: BtUnit[];
  optionals: OptionalItem[];
  config: {
    company: string;
    tariffName: string;
    vatRate: number;
  };
};

export type SelectionInput = {
  mtLoadKw: number;
  btLoadKw: number;
  btCompressors: 0 | 1 | 2;
  condition: Condition;
};

export type SelectionResult = {
  validMt: MtUnit[];
  validBt: BtUnit[];
  selectedMt: MtUnit | null;
  selectedBt: BtUnit | null;
  equivalentMtLoadKw: number;
  btRejectPowerKw: number;
  mtNetAvailableKw: number | null;
  errors: string[];
};
