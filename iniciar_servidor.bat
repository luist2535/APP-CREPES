@echo off
title Servidor de Crepes en Punto
chcp 65001 > nul

echo =======================================================
echo   INICIANDO SERVIDOR DE CREPES EN PUNTO
echo =======================================================
echo.

:: 1. Liberar el puerto 3000 si está ocupado por una instancia previa
echo [1/4] Asegurando que el puerto 3000 esté libre...
call npx --yes kill-port 3000 > nul 2>&1
echo Puerto 3000 liberado correctamente.
echo.

:: 2. Instalar dependencias si no existen
if not exist node_modules (
    echo [2/4] Instalando dependencias de la aplicación...
    call npm install
) else (
    echo [2/4] Dependencias ya instaladas de Node.js.
)
echo.

:: 3. Compilar el proyecto para producción (Genera la build optimizada)
echo [3/4] Compilando y optimizando para producción (Next.js Build)...
call npm run build
echo Aplicación compilada con éxito.
echo.

:: 4. Abrir la URL en el navegador y arrancar el servidor
echo [4/4] Levantando el servidor local...
echo La aplicación estará disponible en: http://localhost:3000
echo.
echo Abriendo el navegador web automáticamente...
start http://localhost:3000

:: Lanzar el servidor en producción
call npm run start

pause
