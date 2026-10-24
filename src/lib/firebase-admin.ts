import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { verifySignedSessionToken } from './auth-crypto.ts';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();

export interface VerifiedAuthPrincipal {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
  provider: 'firebase' | 'sgm_email';
}

export async function verifyBearerToken(
  authHeader: string | null
): Promise<VerifiedAuthPrincipal | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return null;
  }

  // 1. Check if token is a signed SGM Masale Email/Password session token
  if (token.startsWith('sgm_sess.')) {
    const session = verifySignedSessionToken(token);
    if (!session) return null;
    return {
      uid: session.uid,
      email: session.email,
      role: session.role,
      provider: 'sgm_email',
    };
  }

  // 2. Otherwise verify as a Firebase Google Sign-In ID token
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      provider: 'firebase',
    };
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
}
