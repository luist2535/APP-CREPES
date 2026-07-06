import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const visitaId = formData.get('visita_id');
    const etiqueta = formData.get('etiqueta') || 'soporte'; // 'antes', 'despues', 'soporte'
    const categoria = formData.get('categoria') || (visitaId ? 'evidencia_visita' : 'general');
    const referenciaId = formData.get('referencia_id') || visitaId || null;
    const observaciones = formData.get('observaciones') || '';

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Determinar tipo y extensión
    const extension = path.extname(file.name).toLowerCase().replace('.', '');
    let tipoArchivo = 'otro';
    let subcarpeta = 'general';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
      tipoArchivo = 'foto';
      subcarpeta = 'fotos';
    } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
      tipoArchivo = 'excel';
      subcarpeta = 'excel';
    } else if (extension === 'pdf') {
      tipoArchivo = 'pdf';
      subcarpeta = 'pdf';
    } else if (['doc', 'docx', 'txt', 'ppt', 'pptx'].includes(extension)) {
      tipoArchivo = 'documento';
      subcarpeta = 'documentos';
    }

    // Asegurar que la subcarpeta en public/archivos exista
    const uploadDir = path.join(process.cwd(), 'public', 'archivos', subcarpeta);
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignorar si la carpeta ya existe
    }

    // Generar nombre único ordenado
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadDir, filename);

    // Guardar archivo físico en la carpeta organizada
    await fs.writeFile(filePath, buffer);
    const fileUrl = `/archivos/${subcarpeta}/${filename}`;

    const db = getDb();

    // 1. Registrar en la tabla maestra de archivos (Repositorio Documental)
    const result = db.prepare(`
      INSERT INTO archivos_repositorio (
        nombre_original, nombre_guardado, ruta_archivo, tipo_archivo, 
        extension, tamano_bytes, categoria, referencia_id, user_id, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      file.name, 
      filename, 
      fileUrl, 
      tipoArchivo, 
      extension, 
      buffer.length, 
      categoria, 
      referenciaId ? String(referenciaId) : null, 
      user.id, 
      observaciones
    );

    // 2. Si es una evidencia de visita, mantener compatibilidad con la tabla evidencias
    if (visitaId) {
      db.prepare(`
        INSERT INTO evidencias (visita_id, tipo, ruta_archivo, nombre_archivo, etiqueta)
        VALUES (?, ?, ?, ?, ?)
      `).run(parseInt(visitaId), tipoArchivo, fileUrl, file.name, etiqueta);
    }

    return NextResponse.json({
      id: result.lastInsertRowid,
      url: fileUrl,
      nombre: file.name,
      tipo_archivo: tipoArchivo,
      subcarpeta: subcarpeta,
      etiqueta: etiqueta,
      message: 'Archivo organizado y registrado exitosamente en base de datos'
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Error al subir archivo en el servidor: ' + error.message }, { status: 500 });
  }
}
