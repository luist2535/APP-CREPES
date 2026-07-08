@echo off
if not "%1"=="run" (
    start "Tunel Publico Cloudflare - Crepes en Punto" cmd /k "%~f0" run
    exit /b
)

title Tunel Publico Cloudflare - Crepes en Punto
color 0B

echo ========================================================================
echo         COMPARTIR APP CREPES EN PUNTO EN INTERNET (CLOUDFLARE)
echo ========================================================================
echo.
echo [IMPORTANTE] Para que este tunel funcione:
echo 1. El servidor de la aplicacion ya debe estar corriendo en http://localhost:3000
echo 2. Este servidor/equipo DEBE tener conexion activa a internet (salida web).
echo.

:: Verificar si cloudflared.exe existe
if exist cloudflared.exe goto start_tunnel

echo [Cloudflare] cloudflared.exe no detectado en esta carpeta.
echo [Cloudflare] Descargando herramienta oficial de tuneles de Cloudflare desde GitHub...
echo.
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
if not exist cloudflared.exe goto download_error
color 0A
echo [Cloudflare] Descarga completada exitosamente.
echo.
color 0B

:start_tunnel
echo Conectando con los servidores globales de Cloudflare...
echo.
echo ========================================================================
echo  BUSCA ABAJO UN RECUADRO O LINEA QUE EMPIECE CON:
echo  https://[palabras-aleatorias].trycloudflare.com
echo.
echo  ¡Ese es tu link publico! Puedes copiarlo y compartirlo.
echo ========================================================================
echo.

cloudflared.exe tunnel --url http://localhost:3000
if errorlevel 1 goto tunnel_error

goto end

:download_error
color 0C
echo ========================================================================
echo [ERROR] No se pudo descargar cloudflared.exe.
echo ========================================================================
echo El servidor no tiene conexion a internet o el firewall impidio la descarga.
echo Si deseas usar Cloudflare en un servidor sin internet, recuerda copiar
echo el archivo 'cloudflared.exe' desde tu computadora principal.
echo ========================================================================
goto end

:tunnel_error
color 0C
echo.
echo ========================================================================
echo [ERROR] El tunel de Cloudflare se desconecto o no pudo conectarse.
echo ========================================================================
echo Posibles causas:
echo 1. El servidor/equipo no tiene salida a internet para conectar con Cloudflare.
echo 2. El firewall de la empresa o antivirus bloqueo a cloudflared.exe.
echo 3. El servidor local en el puerto 3000 no esta ejecutandose.
echo ========================================================================
goto end

:end
echo.
echo ========================================================================
echo El proceso ha terminado. Presiona cualquier tecla para salir...
echo ========================================================================
pause >nul
