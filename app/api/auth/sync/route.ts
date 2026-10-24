import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken } from '../../../../src/lib/firebase-admin.ts';
import { getOrCreateUser } from '../../../../src/db/repository.ts';

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyBearerToken(req.headers.get('authorization'));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const user = await getOrCreateUser(
      decoded.uid,
      decoded.email || body.email || 'user@example.com',
      decoded.name || body.name
    );
    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error in POST /api/auth/sync:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to synchronize user' },
      { status: 500 }
    );
  }
}
