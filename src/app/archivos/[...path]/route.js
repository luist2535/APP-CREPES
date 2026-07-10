import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];

    if (pathSegments.length === 0) {
      return new NextResponse('Archivo o ruta no especificada', { status: 400 });
    }

    const filename = pathSegments[pathSegments.length - 1];

    // Array de posibles ubicaciones en el sistema de archivos
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'archivos', ...pathSegments),
      path.join(process.cwd(), 'public', 'uploads', filename),
      path.join(process.cwd(), 'public', 'archivos', 'general', filename),
      path.join(process.cwd(), 'public', 'archivos', 'pdf', filename),
      path.join(process.cwd(), 'public', 'archivos', 'documentos', filename),
      path.join(process.cwd(), 'public', 'archivos', 'excel', filename),
      path.join(process.cwd(), 'public', 'archivos', 'fotos', filename),
      path.join(process.cwd(), 'public', filename)
    ];

    let fileBuffer = null;
    let foundPath = null;

    for (const candidate of candidatePaths) {
      try {
        fileBuffer = await fs.readFile(candidate);
        foundPath = candidate;
        break;
      } catch (e) {
        // Continuar buscando en las demás carpetas candidatas
      }
    }

    if (!fileBuffer) {
      console.error(`[Servidor de Archivos] Archivo no encontrado. Ruta solicitada: /archivos/${pathSegments.join('/')}`);
      return new NextResponse('Archivo no encontrado (404)', { status: 404 });
    }

    // Determinar el tipo MIME según la extensión
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Verificar si se solicita descarga forzada mediante query param ?download=1
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get('download') === '1' || searchParams.get('dl') === '1' || searchParams.get('descargar') === '1';

    // Si es descarga o si no podemos previsualizarlo nativamente y es un binario genérico/excel/word
    const forceAttachment = isDownload || ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/vnd.rar'].includes(contentType);

    const dispositionType = forceAttachment ? 'attachment' : 'inline';
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${dispositionType}; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Servidor de Archivos] Error procesando solicitud:', error);
    return new NextResponse('Error interno del servidor al procesar el archivo', { status: 500 });
  }
}
