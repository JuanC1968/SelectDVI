@echo off
setlocal
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo.
echo ==========================================
echo  SelectDVI - demo en red local
echo ==========================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: No se ha encontrado npm.
  echo Instala Node.js antes de ejecutar esta demo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: No se han podido instalar las dependencias.
    pause
    exit /b 1
  )
)

echo Preparando aplicacion...
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: No se ha podido compilar la aplicacion.
  pause
  exit /b 1
)

echo.
echo La aplicacion se publicara en este equipo en el puerto 4173.
echo.
echo Direcciones probables:
echo   http://localhost:4173/

for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress"`) do (
  echo   http://%%A:4173/
)

echo.
echo Abriendo navegador local...
start "" "http://localhost:4173/"
echo.
echo Deja esta ventana abierta mientras quieras usar la demo.
echo Para parar la aplicacion, pulsa CTRL+C y confirma con S.
echo.

call npm run preview -- --host 0.0.0.0 --port 4173
pause
exit /b
