import crypto from 'node:crypto';

export function hashToken(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
export function createMagicToken() { return crypto.randomBytes(32).toString('base64url'); }
export function secureCookie(name: string, value: string, maxAge = 60 * 60 * 24 * 30) { return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`; }
export function requirePermission(userPermissions: string[], permission: string) {
  if (!userPermissions.includes(permission)) throw new Error(`Missing permission ${permission}`);
}
