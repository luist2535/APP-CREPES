const crypto = require('crypto');

// The encryption key should be 32 bytes (64 hex characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : null;

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a text string using AES-256-GCM
 * @param {string} text - The text to encrypt
 * @returns {string} - The encrypted text (format: iv:authTag:encryptedData)
 */
function encrypt(text) {
  if (!text) return text;
  if (!ENCRYPTION_KEY) {
    console.warn('WARNING: ENCRYPTION_KEY is not set. Data is NOT being encrypted.');
    return text;
  }

  try {
    const iv = crypto.randomBytes(12); // 96-bit IV is standard for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return combined payload
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

/**
 * Decrypts a text string using AES-256-GCM
 * @param {string} encryptedText - The encrypted string (format: iv:authTag:encryptedData)
 * @returns {string} - The decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  if (!ENCRYPTION_KEY) {
    return encryptedText; // If no key, assume it might be plain text
  }

  // Check if it matches the expected encrypted format (iv:authTag:encryptedData)
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText; // Not encrypted, or encrypted with a different method
  }

  try {
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Fallback to raw text if decryption fails
  }
}

/**
 * Validates a password against security policies
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * @param {string} password 
 * @returns {object} { valid: boolean, message: string }
 */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra mayúscula.' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra minúscula.' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número.' };
  }
  
  return { valid: true, message: 'Contraseña válida' };
}

module.exports = {
  encrypt,
  decrypt,
  validatePassword
};
