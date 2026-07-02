import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('area_id');

    let plantillas;
    if (areaId) {
      plantillas = db.prepare('SELECT * FROM plantillas WHERE area_id = ? AND activa = 1').all(parseInt(areaId));
    } else {
      plantillas = db.prepare('SELECT * FROM plantillas WHERE activa = 1').all();
    }

    return NextResponse.json({ plantillas });
  } catch (error) {
    console.error('Error fetching plantillas:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const rol = parseInt(user.rol_id);
    const isJefe = [3, 4, 5, 6, 7, 9].includes(rol);
    const isAdmin = rol === 1 || rol === 2;

    if (!isAdmin && !isJefe) {
      return NextResponse.json({ error: 'No tiene permisos para modificar plantillas' }, { status: 403 });
    }

    const db = getDb();
    const { id, campos } = await request.json();

    if (!id || !campos) {
      return NextResponse.json({ error: 'ID de plantilla y campos son obligatorios' }, { status: 400 });
    }

    const template = db.prepare('SELECT * FROM plantillas WHERE id = ?').get(id);
    if (!template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    if (isJefe) {
      const getAreaIdFromRol = (rolId) => {
        const r = parseInt(rolId);
        if (r === 2 || r === 10) return 1; // Operaciones
        if (r === 3 || r === 11) return 2; // SST
        if (r === 4 || r === 12) return 3; // Mantenimiento
        if (r === 5 || r === 13) return 4; // Calidad
        if (r === 6 || r === 14) return 5; // VRH
        if (r === 7 || r === 15) return 6; // Formación
        if (r === 9 || r === 16) return 7; // Sistemas
        return null;
      };
      
      const userAreaId = getAreaIdFromRol(rol);
      if (userAreaId !== template.area_id) {
        return NextResponse.json({ error: 'No está autorizado para modificar la plantilla de esta área' }, { status: 403 });
      }
    }

    let camposStr;
    try {
      const parsed = typeof campos === 'string' ? JSON.parse(campos) : campos;
      camposStr = JSON.stringify(parsed);
    } catch (e) {
      return NextResponse.json({ error: 'Estructura de campos inválida' }, { status: 400 });
    }

    db.prepare('UPDATE plantillas SET campos = ?, version = version + 1 WHERE id = ?').run(camposStr, id);

    return NextResponse.json({ message: 'Plantilla de checklist actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
