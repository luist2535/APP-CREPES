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
