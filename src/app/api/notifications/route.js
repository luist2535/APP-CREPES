import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const db = getDb();
    
    // Get last 5 activities as notifications
    const notifications = db.prepare(`
      SELECT h.id, h.created_at, u.nombre as usuario, p.nombre as pdv_nombre, c.nombre as ciudad_nombre,
             en.nombre as estado_nombre, en.color as estado_color
      FROM historial_estados h
      JOIN users u ON h.user_id = u.id
      JOIN pdv p ON h.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN estados_pdv en ON h.estado_nuevo_id = en.id
      ORDER BY h.created_at DESC
      LIMIT 5
    `).all();
    
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
