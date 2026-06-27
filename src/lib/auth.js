const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'crepes-en-punto-secret-key-2024-change-in-production';
const JWT_EXPIRES_IN = '24h';

function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      rol_id: user.rol_id,
      nombre: user.nombre,
      ciudad_id: user.ciudad_id,
      pdv_id: user.pdv_id
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function getUserFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').filter(Boolean).map(c => {
      const [key, ...rest] = c.split('=');
      return [key, rest.join('=')];
    })
  );
  
  const token = cookies['auth-token'];
  if (!token) return null;
  
  return verifyToken(token);
}

module.exports = { generateToken, verifyToken, hashPassword, comparePassword, getUserFromRequest };
