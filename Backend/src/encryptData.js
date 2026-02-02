const crypto = require("crypto");

function encryptData(plainText, key) {
  // key = Buffer (32 bytes for AES-256-GCM)
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // IMPORTANT: client expects IV + encrypted (+ authTag if needed)
  return Buffer.concat([iv, encrypted, authTag]);
}

module.exports = encryptData;
