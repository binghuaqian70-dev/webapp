import crypto from 'crypto';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt-2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 计算admin123的哈希值
hashPassword('admin123').then(hash => {
  console.log('admin123的哈希值:', hash);
});