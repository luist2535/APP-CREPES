import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user || user.rol_id !== 1) { // Solo admins
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const logs = db.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY fecha DESC 
      LIMIT 1000
    `).all();

    // Map the ID field to match what the frontend expects (string format LOG-XXX)
    // and format the date properly for JS to parse.
    const formattedLogs = logs.map(log => ({
      ...log,
      id: "LOG-" + log.id.toString().padStart(4, '0')
    }));

    return NextResponse.json({
      success: true,
      logs: formattedLogs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener bitácora de auditoría' }, 
      { status: 500 }
    );
  }
}

// Endpoint to log new actions
export async function POST(request) {
  const userObj = getUserFromRequest(request);
  if (!userObj) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      usuario, 
      rol, 
      accion, 
      modulo, 
      descripcion, 
      registro_afectado = null, 
      ip = null, 
      dispositivo = null 
    } = body;

    if (!usuario || !rol || !accion || !modulo || !descripcion) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios' }, 
        { status: 400 }
      );
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        usuario, rol, accion, modulo, descripcion, registro_afectado, ip, dispositivo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      usuario, 
      rol, 
      accion, 
      modulo, 
      descripcion, 
      registro_afectado, 
      ip, 
      dispositivo
    );

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Log registrado exitosamente'
    });
  } catch (error) {
    console.error('Error inserting audit log:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar auditoría' }, 
      { status: 500 }
    );
  }
}
