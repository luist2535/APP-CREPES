import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { avatar_url } = body;

    if (!avatar_url) {
      return NextResponse.json({ error: 'Se requiere la URL de la imagen' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      UPDATE users 
      SET avatar = ? 
      WHERE id = ?
    `).run(avatar_url, user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Foto de perfil actualizada correctamente',
      avatar: avatar_url 
    });
  } catch (error) {
    console.error('Error updating user avatar:', error);
    return NextResponse.json({ error: 'Error al actualizar foto de perfil' }, { status: 500 });
  }
}
