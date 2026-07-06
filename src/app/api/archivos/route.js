import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'excel', 'foto', 'pdf', 'documento'
    const categoria = searchParams.get('categoria');
    const busqueda = searchParams.get('busqueda');
    const referenciaId = searchParams.get('referencia_id');

    const db = getDb();
    let query = `
      SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email, r.nombre as rol_nombre
      FROM archivos_repositorio a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (tipo && tipo !== 'todos') {
      query += ` AND a.tipo_archivo = ?`;
      params.push(tipo);
    }

    if (categoria && categoria !== 'todos') {
      query += ` AND a.categoria = ?`;
      params.push(categoria);
    }

    if (referenciaId) {
      query += ` AND a.referencia_id = ?`;
      params.push(referenciaId);
    }

    if (busqueda) {
      query += ` AND (a.nombre_original LIKE ? OR a.observaciones LIKE ? OR u.nombre LIKE ?)`;
      const term = `%${busqueda}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY a.created_at DESC`;

    const archivos = db.prepare(query).all(...params);

    // Conteo por tipos para los badges del frontend
    const conteos = db.prepare(`
      SELECT tipo_archivo, COUNT(*) as count 
      FROM archivos_repositorio 
      GROUP BY tipo_archivo
    `).all();

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM archivos_repositorio').get().count;

    const stats = {
      todos: totalCount,
      excel: 0,
      foto: 0,
      pdf: 0,
      documento: 0,
      otro: 0
    };

    conteos.forEach(c => {
      if (stats[c.tipo_archivo] !== undefined) {
        stats[c.tipo_archivo] = c.count;
      } else {
        stats.otro += c.count;
      }
    });

    return NextResponse.json({ archivos, stats });
  } catch (error) {
    console.error('Error obteniendo archivos:', error);
    return NextResponse.json({ error: 'Error al consultar archivos: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID de archivo requerido' }, { status: 400 });

    const db = getDb();
    const archivo = db.prepare('SELECT * FROM archivos_repositorio WHERE id = ?').get(id);

    if (!archivo) {
      return NextResponse.json({ error: 'Archivo no encontrado en base de datos' }, { status: 404 });
    }

    // Permisos: Solo Admin (1) o el usuario que lo subió pueden borrar
    if (parseInt(user.rol_id) !== 1 && archivo.user_id !== user.id) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar este archivo' }, { status: 403 });
    }

    // 1. Eliminar archivo físico del disco si existe
    try {
      const physicalPath = path.join(process.cwd(), 'public', archivo.ruta_archivo);
      await fs.unlink(physicalPath);
    } catch (e) {
      console.warn(`No se pudo borrar archivo físico ${archivo.ruta_archivo} (puede que ya no exista):`, e.message);
    }

    // 2. Eliminar de la tabla archivos_repositorio
    db.prepare('DELETE FROM archivos_repositorio WHERE id = ?').run(id);

    // 3. Eliminar de la tabla evidencias si existía ahí
    db.prepare('DELETE FROM evidencias WHERE ruta_archivo = ?').run(archivo.ruta_archivo);

    return NextResponse.json({ success: true, message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return NextResponse.json({ error: 'Error al eliminar archivo: ' + error.message }, { status: 500 });
  }
}
