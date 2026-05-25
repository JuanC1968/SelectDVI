# SelectDVI

Aplicación web para seleccionar y presupuestar centrales de refrigeración de CO2 transcrítico.

## Desarrollo

```powershell
npm install
npm run dev
```

La app queda disponible normalmente en:

```text
http://127.0.0.1:5173
```

## Excel maestro

El técnico mantiene:

```text
data/tarifa-maestra.xlsx
```

Hojas:

- `MT`: centrales de media temperatura.
- `BT`: centrales de baja temperatura.
- `Opcionales`: opcionales generales.
- `Configuracion`: empresa, tarifa e IVA.

Después de cambiar el Excel:

```powershell
npm run excel:import
```

Ese comando valida datos básicos, regenera `src/data/catalog.generated.ts` y copia el Excel a `public/data/tarifa-maestra.xlsx` para que se pueda descargar desde la app.

Para recrear el Excel inicial desde los datos actuales:

```powershell
npm run excel:create
```

## Reglas de selección

BT:

```text
cantidad de compresores = 1 o 2
potencia máxima BT >= carga BT requerida
```

MT:

```text
carga equivalente MT = carga MT requerida + potencia a disipar de BT
potencia máxima MT según condición 32/38/43 ºC >= carga equivalente MT
```

Si no hay máquina válida, la aplicación lo indica y bloquea el PDF.

## Presupuesto

```text
PVP total sin IVA = PVP MT + PVP BT + opcionales
IVA = 21% por defecto
PVP total con IVA = PVP total sin IVA + IVA
```

Los descuentos comerciales se aplican después en el CRM.
