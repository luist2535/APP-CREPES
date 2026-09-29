import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { firma } = await request.json();

    if (firma === undefined) {
      return NextResponse.json({ error: 'La firma es requerida' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('UPDATE users SET firma = ? WHERE id = ?').run(firma, user.id);

    return NextResponse.json({ success: true, message: 'Firma guardada correctamente' });
  } catch (error) {
    console.error('Error saving signature:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
