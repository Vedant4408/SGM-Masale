import crypto from 'crypto';

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    'sgm_masale_account_hmac_secret_2026'
  );
}

/**
 * Hashes a plaintext password using scrypt with a random 16-byte salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Timing-safe verification of a plaintext password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

export interface SessionTokenPayload {
  uid: string;
  email: string;
  role: string;
  exp: number;
}

/**
 * Creates an HMAC-SHA256 signed bearer session token (`sgm_sess.<base64url>.<sigHex>`).
 */
export function createSignedSessionToken(params: {
  uid: string;
  email: string;
  role: string;
  ttlMs?: number;
}): string {
  const payload: SessionTokenPayload = {
    uid: params.uid,
    email: params.email,
    role: params.role,
    exp: Date.now() + (params.ttlMs ?? 7 * 24 * 60 * 60 * 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('hex');
  return `sgm_sess.${encoded}.${sig}`;
}

/**
 * Verifies an `sgm_sess.<base64url>.<sigHex>` session token using timing-safe comparison.
 */
export function verifySignedSessionToken(token: string): SessionTokenPayload | null {
  if (!token || !token.startsWith('sgm_sess.')) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, sigHex] = parts;
  if (!encoded || !sigHex) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('hex');

  try {
    if (
      sigHex.length !== expectedSig.length ||
      !/^[0-9a-fA-F]+$/.test(sigHex)
    ) {
      return null;
    }
    const a = Buffer.from(expectedSig, 'hex');
    const b = Buffer.from(sigHex, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionTokenPayload;
    if (!decoded.uid || !decoded.exp || Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Generates a 6-character alphanumeric reset code and its SHA-256 hash valid for 30 minutes.
 */
export function generatePasswordResetToken(): {
  rawCode: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A4F92C"
  const tokenHash = crypto.createHash('sha256').update(rawCode).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  return { rawCode, tokenHash, expiresAt };
}

/**
 * Verifies a password reset code against its stored SHA-256 hash and expiration timestamp.
 */
export function verifyPasswordResetToken(
  rawCode: string,
  storedHash: string,
  expiresAt: Date | null
): boolean {
  if (!rawCode || !storedHash || !expiresAt) return false;
  if (Date.now() > new Date(expiresAt).getTime()) return false;

  const candidateHash = crypto
    .createHash('sha256')
    .update(rawCode.trim().toUpperCase())
    .digest('hex');

  try {
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Row-Level Security (RLS) ownership guard: verifies that an authenticated customer
 * can only access or mutate records belonging to their own `uid` (unless admin).
 */
export function canAccessUserResource(
  authenticatedUid: string | null | undefined,
  resourceOwnerUid: string | null | undefined,
  role = 'customer'
): boolean {
  if (!authenticatedUid || authenticatedUid.trim() === '') {
    return false;
  }
  if (role === 'admin') {
    return true;
  }
  if (!resourceOwnerUid || resourceOwnerUid.trim() === '') {
    return false;
  }
  return authenticatedUid === resourceOwnerUid;
}
