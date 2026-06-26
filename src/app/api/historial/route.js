import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const pdvId = searchParams.get('pdv_id');
    const limit = searchParams.get('limit') || 50;
    
    let query = `
      SELECT h.*, 
             ea.nombre as estado_anterior, ea.color as color_anterior,
             en.nombre as estado_nuevo, en.color as color_nuevo,
             u.nombre as usuario_nombre,
             p.nombre as pdv_nombre, c.nombre as ciudad_nombre
      FROM historial_estados h
      LEFT JOIN estados_pdv ea ON h.estado_anterior_id = ea.id
      LEFT JOIN estados_pdv en ON h.estado_nuevo_id = en.id
      LEFT JOIN users u ON h.user_id = u.id
      LEFT JOIN pdv p ON h.pdv_id = p.id
      LEFT JOIN ciudades c ON p.ciudad_id = c.id
    `;
    const params = [];
    
    if (pdvId) {
      query += ' WHERE h.pdv_id = ?';
      params.push(pdvId);
    }
    
    query += ' ORDER BY h.created_at DESC LIMIT ?';
    params.push(limit);
    
    const historial = db.prepare(query).all(...params);
    return NextResponse.json({ historial });
  } catch (error) {
    console.error('Historial error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
