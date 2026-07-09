import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    const bcrypt = require('bcryptjs');
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = getDb();
    const { hasPermission } = require('@/lib/auth');
    if (!hasPermission(user, 'admin', db)) {
      return NextResponse.json({ error: 'No autorizado. Se requieren permisos de Administración' }, { status: 403 });
    }
    const { entity, data } = await request.json();
    
    if (!entity || !data) {
      return NextResponse.json({ error: 'Entidad y datos son requeridos' }, { status: 400 });
    }

    if (entity === 'user') {
      const { nombre, email, password, rol_id, ciudad_id, pdv_id } = data;
      if (!nombre || !email || !password || !rol_id) {
        return NextResponse.json({ error: 'Campos obligatorios faltantes para el usuario' }, { status: 400 });
      }
      
      // Check if email already exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 409 });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const result = db.prepare(`
        INSERT INTO users (nombre, email, password_hash, rol_id, ciudad_id, pdv_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(nombre, email, passwordHash, parseInt(rol_id), ciudad_id ? parseInt(ciudad_id) : null, pdv_id ? parseInt(pdv_id) : null);
      
      return NextResponse.json({ id: result.lastInsertRowid, message: 'Usuario creado exitosamente' });
    }

    if (entity === 'pdv') {
      const { nombre, ciudad_id, direccion, hora_apertura, hora_cierre } = data;
      if (!nombre || !ciudad_id) {
        return NextResponse.json({ error: 'Nombre y ciudad son requeridos para el PDV' }, { status: 400 });
      }
      
      const result = db.prepare(`
        INSERT INTO pdv (nombre, ciudad_id, direccion, hora_apertura, hora_cierre, estado_id)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(nombre, parseInt(ciudad_id), direccion || '', hora_apertura || '08:00', hora_cierre || '22:00');
      
      return NextResponse.json({ id: result.lastInsertRowid, message: 'Punto de Venta creado exitosamente' });
    }

    if (entity === 'ciudad') {
      const { nombre } = data;
      if (!nombre) {
        return NextResponse.json({ error: 'El nombre de la ciudad es requerido' }, { status: 400 });
      }

      const existing = db.prepare('SELECT id FROM ciudades WHERE nombre = ?').get(nombre);
      if (existing) {
        return NextResponse.json({ error: 'La ciudad ya existe' }, { status: 409 });
      }

      const result = db.prepare('INSERT INTO ciudades (nombre) VALUES (?)').run(nombre);
      return NextResponse.json({ id: result.lastInsertRowid, message: 'Ciudad creada exitosamente' });
    }

    if (entity === 'area') {
      const { nombre, descripcion, color } = data;
      if (!nombre) {
        return NextResponse.json({ error: 'El nombre del área es requerido' }, { status: 400 });
      }

      const result = db.prepare('INSERT INTO areas (nombre, descripcion, color) VALUES (?, ?, ?)')
        .run(nombre, descripcion || '', color || '#8B6914');
      return NextResponse.json({ id: result.lastInsertRowid, message: 'Área creada exitosamente' });
    }

    if (entity === 'tipo_visita') {
      const { area_id, nombre } = data;
      if (!area_id || !nombre) {
        return NextResponse.json({ error: 'Área y nombre de tipo de visita son requeridos' }, { status: 400 });
      }

      const result = db.prepare('INSERT INTO tipos_visita (area_id, nombre) VALUES (?, ?)')
        .run(parseInt(area_id), nombre);
      return NextResponse.json({ id: result.lastInsertRowid, message: 'Tipo de visita creado exitosamente' });
    }

    return NextResponse.json({ error: 'Entidad no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = getDb();
    const { hasPermission } = require('@/lib/auth');
    if (!hasPermission(user, 'admin', db)) {
      return NextResponse.json({ error: 'No autorizado. Se requieren permisos de Administración' }, { status: 403 });
    }
    const { entity, id, data } = await request.json();
    
    if (!entity || !id || !data) {
      return NextResponse.json({ error: 'Entidad, ID y datos son requeridos' }, { status: 400 });
    }

    if (entity === 'user') {
      if ('activo' in data) {
        db.prepare('UPDATE users SET activo = ? WHERE id = ?').run(data.activo ? 1 : 0, id);
        return NextResponse.json({ message: 'Estado del usuario actualizado' });
      } else {
        const { nombre, email, rol_id, ciudad_id, pdv_id } = data;
        if (!nombre || !email || !rol_id) {
          return NextResponse.json({ error: 'Nombre, email y rol son requeridos' }, { status: 400 });
        }

        // Verificar si el email ya existe para otro usuario
        const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
        if (existing) {
          return NextResponse.json({ error: 'El correo electrónico ya está registrado por otro usuario' }, { status: 409 });
        }

        db.prepare(`
          UPDATE users 
          SET nombre = ?, email = ?, rol_id = ?, ciudad_id = ?, pdv_id = ?
          WHERE id = ?
        `).run(nombre, email, parseInt(rol_id), ciudad_id ? parseInt(ciudad_id) : null, pdv_id ? parseInt(pdv_id) : null, id);

        return NextResponse.json({ message: 'Usuario actualizado exitosamente' });
      }
    }

    if (entity === 'pdv') {
      if ('activo' in data) {
        db.prepare('UPDATE pdv SET activo = ? WHERE id = ?').run(data.activo ? 1 : 0, id);
        return NextResponse.json({ message: 'Estado del PDV actualizado' });
      } else {
        const { nombre, ciudad_id, direccion, hora_apertura, hora_cierre } = data;
        if (!nombre || !ciudad_id) {
          return NextResponse.json({ error: 'Nombre y ciudad son requeridos' }, { status: 400 });
        }

        db.prepare(`
          UPDATE pdv 
          SET nombre = ?, ciudad_id = ?, direccion = ?, hora_apertura = ?, hora_cierre = ?
          WHERE id = ?
        `).run(nombre, parseInt(ciudad_id), direccion || '', hora_apertura || '08:00', hora_cierre || '22:00', id);

        return NextResponse.json({ message: 'Punto de Venta actualizado exitosamente' });
      }
    }

    if (entity === 'ciudad') {
      if ('activa' in data) {
        db.prepare('UPDATE ciudades SET activa = ? WHERE id = ?').run(data.activa ? 1 : 0, id);
        return NextResponse.json({ message: 'Estado de la ciudad actualizado' });
      }
    }

    if (entity === 'area') {
      if ('activa' in data) {
        db.prepare('UPDATE areas SET activa = ? WHERE id = ?').run(data.activa ? 1 : 0, id);
        return NextResponse.json({ message: 'Estado del área actualizado' });
      }
    }

    return NextResponse.json({ error: 'Entidad o acción no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('Admin PUT error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = getDb();
    const { hasPermission } = require('@/lib/auth');
    if (!hasPermission(user, 'admin', db)) {
      return NextResponse.json({ error: 'No autorizado. Se requieren permisos de Administración' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const id = searchParams.get('id');
    
    if (!entity || !id) {
      return NextResponse.json({ error: 'Entidad e ID son requeridos' }, { status: 400 });
    }
    
    if (entity === 'user') {
      if (parseInt(id) === 1) {
        return NextResponse.json({ error: 'No se puede eliminar al administrador principal' }, { status: 400 });
      }
      
      try {
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
      } catch (err) {
        if (err.message.includes('FOREIGN KEY')) {
          return NextResponse.json({ 
            error: 'No se puede eliminar el usuario porque tiene historial asociado (visitas, solicitudes, etc.). Por favor desactívalo en su lugar.' 
          }, { status: 409 });
        }
        throw err;
      }
    }

    if (entity === 'pdv') {
      try {
        db.prepare('DELETE FROM pdv WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Punto de Venta eliminado exitosamente' });
      } catch (err) {
        if (err.message.includes('FOREIGN KEY')) {
          return NextResponse.json({ 
            error: 'No se puede eliminar el Punto de Venta porque tiene visitas, solicitudes o equipos asociados. Por favor desactívalo en su lugar.' 
          }, { status: 409 });
        }
        throw err;
      }
    }
    
    return NextResponse.json({ error: 'Entidad no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('Admin DELETE error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
