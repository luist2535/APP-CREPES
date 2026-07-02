@echo off
title Servidor de Crepes en Punto

echo =======================================================
echo   INICIANDO SERVIDOR DE CREPES EN PUNTO
echo =======================================================
echo.

:: 1. Liberar el puerto 3000 si esta ocupado
echo [1/4] Asegurando que el puerto 3000 este libre...
call npx --yes kill-port 3000 > nul 2>&1
echo Puerto 3000 liberado.
echo.

:: 2. Instalar dependencias si no existen
if not exist node_modules (
    echo [2/4] Instalando dependencias de la aplicacion...
    call npm install
) else (
    echo [2/4] Dependencias ya instaladas de Node.js.
)
echo.

:: 3. Compilar el proyecto para produccion
echo [3/4] Compilando para produccion (Next.js Build)...
call npm run build
echo Aplicacion compilada con exito.
echo.

:: 4. Abrir la URL en el navegador y arrancar el servidor
echo [4/4] Levantando el servidor local...
echo La aplicacion estara disponible en: http://localhost:3000
echo.
echo Abriendo el navegador web automaticamente...
start http://localhost:3000

:: Lanzar el servidor
call npm run start

pause
