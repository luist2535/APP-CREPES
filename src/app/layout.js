import './globals.css';

export const metadata = {
  title: 'Crepes en Punto | Gestión Operativa',
  description: 'Aplicación interna de gestión operativa para puntos de venta de Crepes en Punto',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6B3A2A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="brown-translucent" />
        <link rel="icon" href="/images/logo-crepes-brown.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/images/logo-crepes-light.png" media="(prefers-color-scheme: dark)" />
        <link rel="shortcut icon" href="/images/logo-crepes-brown.png" />
        <link rel="apple-touch-icon" href="/images/logo-crepes-brown.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}

