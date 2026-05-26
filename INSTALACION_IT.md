# SelectDVI - Instrucciones de instalación para IT

## Objetivo

SelectDVI es una aplicación web estática para seleccionar y presupuestar centrales de refrigeración de CO2 transcrítico.

La aplicación no requiere backend, base de datos, servicio Windows ni autenticación propia. Una vez compilada, se publica como archivos estáticos HTML, CSS, JavaScript e imágenes.

## Requisitos

Para preparar una nueva versión:

- Git.
- Node.js corporativo compatible con el proyecto. La versión usada durante el desarrollo fue `v24.14.0`.
- npm. La versión usada durante el desarrollo fue `11.9.0`.
- Acceso al repositorio:

```text
https://github.com/JuanC1968/SelectDVI
```

Para servir la aplicación en la red corporativa:

- IIS, Nginx, Apache, servidor de ficheros web corporativo o cualquier hosting capaz de servir archivos estáticos.
- No hace falta Node.js en el servidor final si IT compila previamente y publica solo la carpeta `dist`.

## Instalación desde cero

Clonar el repositorio:

```powershell
git clone https://github.com/JuanC1968/SelectDVI.git
cd SelectDVI
```

Instalar dependencias:

```powershell
npm install
```

Comprobar que no hay vulnerabilidades conocidas:

```powershell
npm audit
```

Validar el proyecto:

```powershell
npm run lint
npm run build
```

El build genera la web publicable en:

```text
dist/
```

## Publicación en intranet

Publicar el contenido completo de la carpeta `dist` en el servidor web interno.

Ejemplo de destino:

```text
\\servidor-intranet\wwwroot\selectdvi\
```

La URL final podría ser:

```text
http://intranet/selectdvi/
```

Importante: copiar el contenido de `dist`, no la carpeta `dist` como subcarpeta, salvo que esa sea la ruta deseada.

## Configuración recomendada en IIS

1. Crear una aplicación o sitio apuntando a la carpeta publicada.
2. Habilitar contenido estático.
3. Asegurar que `index.html` está como documento predeterminado.
4. Si se publica bajo una ruta tipo `/selectdvi/`, probar acceso directo a:

```text
http://servidor/selectdvi/
```

La aplicación actualmente no usa rutas internas de navegador, por lo que no necesita reglas especiales de reescritura.

## Actualización de versión

En el equipo de build:

```powershell
git pull
npm install
npm run lint
npm run build
```

Después, reemplazar en el servidor web el contenido publicado por el nuevo contenido de:

```text
dist/
```

Recomendación: conservar una copia de la versión anterior antes de reemplazarla.

## Mantenimiento de tarifas y modelos

El fichero maestro editable por técnicos es:

```text
data/tarifa-maestra.xlsx
```

Hojas principales:

- `MT`: centrales de media temperatura.
- `BT`: centrales de baja temperatura.
- `Opcionales`: opcionales generales.
- `Configuracion`: empresa, tarifa e IVA.

Cuando se modifique el Excel, ejecutar:

```powershell
npm run excel:import
```

Este comando:

- Lee `data/tarifa-maestra.xlsx`.
- Valida duplicados básicos.
- Regenera `src/data/catalog.generated.ts`.
- Copia el Excel a `public/data/tarifa-maestra.xlsx` para que pueda descargarse desde la web.

Después de importar la tarifa, generar una nueva versión publicable:

```powershell
npm run build
```

Y volver a publicar el contenido de `dist`.

## Variables de entorno

No hay variables de entorno requeridas.

## Servicios externos

La aplicación no consume APIs externas para funcionar.

El logo de Grupo DISCO está guardado localmente en:

```text
public/brand/grupo-disco-logo.jpg
```

El PDF se genera en el navegador del usuario.

## Comandos útiles

Desarrollo local:

```powershell
npm run dev
```

Vista previa de la versión compilada:

```powershell
npm run build
npm run preview
```

Crear de nuevo el Excel inicial desde los datos actuales:

```powershell
npm run excel:create
```

Importar cambios del Excel:

```powershell
npm run excel:import
```

## Checklist antes de publicar

Antes de copiar a producción/intranet:

```powershell
npm audit
npm run lint
npm run build
```

Comprobar manualmente:

- La pantalla carga correctamente.
- El caso `45 kW MT`, `8 kW BT`, `1 compresor BT`, `32 C` selecciona `RZXCO2-75` y `RZXLCO2-12`.
- El botón `Generar PDF` descarga el presupuesto.
- El enlace `Excel maestro` descarga el fichero de tarifa.

## Copias de seguridad

Antes de publicar una nueva tarifa o versión, conservar copia de:

- `data/tarifa-maestra.xlsx`.
- Carpeta `dist` actualmente publicada.

## Notas de seguridad

- No hay credenciales dentro de la aplicación.
- No hay conexión a base de datos.
- No se almacenan presupuestos.
- No se envían datos a servidores externos desde la aplicación.
- El mantenimiento de precios y modelos se realiza mediante el Excel maestro y queda versionado en Git.
