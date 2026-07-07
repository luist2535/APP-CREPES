@echo off
title Tunel Publico Cloudflare - Crepes en Punto
color 0B

echo ========================================================================
echo         COMPARTIR APP CREPES EN PUNTO EN INTERNET (CLOUDFLARE)
echo ========================================================================
echo.
echo [IMPORTANTE] Para que este tunel funcione, el servidor de la aplicacion
echo ya debe estar corriendo de fondo en http://localhost:3000
echo (ya sea abriendo iniciar_servidor.bat o desde la terminal).
echo.

:: Verificar si cloudflared.exe existe; si no, descargarlo automáticamente
if not exist cloudflared.exe (
    echo [Cloudflare] cloudflared.exe no detectado en esta carpeta (normal al clonar un servidor nuevo).
    echo [Cloudflare] Descargando herramienta oficial de tuneles de Cloudflare desde GitHub...
    echo.
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    
    if exist cloudflared.exe (
        color 0A
        echo [Cloudflare] Descarga completada exitosamente.
        echo.
        color 0B
    ) else (
        color 0C
        echo [ERROR] No se pudo descargar cloudflared.exe. Por favor verifica tu conexion a internet.
        pause
        exit /b
    )
)

echo Conectando con los servidores globales de Cloudflare...
echo.
echo ========================================================================
echo  BUSCA ABAJO UN RECUADRO O LINEA QUE EMPIECE CON:
echo  https://[palabras-aleatorias].trycloudflare.com
echo.
echo  ¡Ese es tu link publico! Puedes copiarlo y compartirlo con todo el
echo  mundo por WhatsApp, correo o abrirlo desde el celular.
echo ========================================================================
echo.

cloudflared.exe tunnel --url http://localhost:3000

pause
