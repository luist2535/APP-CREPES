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

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Ensure public/uploads exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignore if folder already exists
    }

    // Generate unique name
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadDir, filename);

    // Save physical file
    await fs.writeFile(filePath, buffer);
    const fileUrl = `/uploads/${filename}`;

    // Log to DB if visitaId is provided
    if (visitaId) {
      const db = getDb();
      db.prepare(`
        INSERT INTO evidencias (visita_id, tipo, ruta_archivo, nombre_archivo, etiqueta)
        VALUES (?, 'foto', ?, ?, ?)
      `).run(parseInt(visitaId), fileUrl, file.name, etiqueta);
    }

    return NextResponse.json({
      url: fileUrl,
      nombre: file.name,
      etiqueta: etiqueta,
      message: 'Archivo subido y registrado exitosamente'
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Error al subir archivo en el servidor: ' + error.message }, { status: 500 });
  }
}
