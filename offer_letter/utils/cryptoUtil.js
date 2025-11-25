// utils/cryptoUtil.js
const crypto = require('crypto');

const DEFAULT_KEY = process.env.ENCRYPTION_KEY || process.env.BANK_ENCRYPTION_KEY || '9fA7kP3sV2xQ8mR6bT1nY4cJ5uL0dH2W'; // 32 chars

function getKey() {
  const key = process.env.BANK_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  return Buffer.from(key, 'utf8');
}

exports.encryptText = (plain) => {
  if (plain == null) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    content: encrypted.toString('base64')
  };
};

exports.decryptText = (data) => {
  if (!data || !data.iv || !data.content) return null;
  try {
    const iv = Buffer.from(data.iv, 'base64');
    const encrypted = Buffer.from(data.content, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    // On error, return null (protect against invalid data)
    return null;
  }
};
