import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { recibir_correos } = await request.json();

    db.prepare('UPDATE users SET recibir_correos = ? WHERE id = ?').run(recibir_correos ? 1 : 0, user.id);

    return NextResponse.json({ message: 'Preferencia de notificaciones actualizada.' });
  } catch (error) {
    console.error('PATCH /api/users/notificaciones error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
