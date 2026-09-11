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

    const db = getDb();
    const cleanAvatarUrl = (avatar_url && typeof avatar_url === 'string' && avatar_url.trim().length > 0) ? avatar_url.trim() : null;

    db.prepare(`
      UPDATE users 
      SET avatar = ? 
      WHERE id = ?
    `).run(cleanAvatarUrl, user.id);

    return NextResponse.json({ 
      success: true, 
      message: cleanAvatarUrl ? 'Foto de perfil actualizada correctamente' : 'Foto de perfil eliminada correctamente',
      avatar: cleanAvatarUrl 
    });
  } catch (error) {
    console.error('Error updating user avatar:', error);
    return NextResponse.json({ error: 'Error al actualizar foto de perfil: ' + (error.message || '') }, { status: 500 });
  }
}
