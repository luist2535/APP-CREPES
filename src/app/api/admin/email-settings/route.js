import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || parseInt(user.rol_id) !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requieren permisos de Administrador' }, { status: 403 });
    }

    const db = getDb();
    const configRows = db.prepare("SELECT * FROM configuraciones").all();
    
    const settings = {
      smtp_host: 'smtp.gmail.com',
      smtp_port: '587',
      smtp_user: '',
      smtp_pass: ''
    };

    configRows.forEach((row) => {
      if (row.clave in settings) {
        settings[row.clave] = row.valor;
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error en GET api/admin/email-settings:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || parseInt(user.rol_id) !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requieren permisos de Administrador' }, { status: 403 });
    }

    const db = getDb();
    const body = await request.json();
    const { smtp_host, smtp_port, smtp_user, smtp_pass } = body;

    if (!smtp_host || !smtp_port || !smtp_user) {
      return NextResponse.json({ error: 'Host, Puerto y Correo remitente son requeridos.' }, { status: 400 });
    }

    // Upsert values in the database
    const stmt = db.prepare("INSERT OR REPLACE INTO configuraciones (clave, valor) VALUES (?, ?)");
    stmt.run('smtp_host', smtp_host);
    stmt.run('smtp_port', String(smtp_port));
    stmt.run('smtp_user', smtp_user);
    if (smtp_pass !== undefined && smtp_pass !== null) {
      stmt.run('smtp_pass', smtp_pass);
    }

    return NextResponse.json({ success: true, message: 'Configuración de correo actualizada correctamente.' });
  } catch (error) {
    console.error('Error en POST api/admin/email-settings:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
