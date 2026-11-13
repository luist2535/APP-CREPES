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
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png?v=6" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=6" />
        <link rel="shortcut icon" href="/favicon.ico?v=6" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=6" />
        {/* Font preload para performance */}
        <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous"
          href="https://fonts.gstatic.com/s/outfit/v14/QGY_z_wNahGAdqG43RhVcEgY.woff2" />
      </head>
      <body>{children}</body>
    </html>
  );
}

