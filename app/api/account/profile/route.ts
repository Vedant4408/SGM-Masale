import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken } from '../../../../src/lib/firebase-admin.ts';
import {
  getCustomerAccountData,
  getOrdersWithItems,
  getOrCreateUser,
  updateCustomerProfileDetails,
} from '../../../../src/db/repository.ts';
import { validateIndianPhone } from '../../../../src/lib/commerce-rules.ts';

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyBearerToken(req.headers.get('authorization'));
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session required.' },
        { status: 401 }
      );
    }

    // Ensure Firebase users exist in PostgreSQL users table before loading profile
    if (decoded.provider === 'firebase') {
      await getOrCreateUser(
        decoded.uid,
        decoded.email || 'user@example.com',
        decoded.name || 'Customer'
      );
    }

    const accountData = await getCustomerAccountData(decoded.uid);
    const pastOrders = await getOrdersWithItems({ userUid: decoded.uid });

    return NextResponse.json({
      user: accountData.user,
      addresses: accountData.addresses,
      orders: pastOrders,
    });
  } catch (error: any) {
    console.error('Error in GET /api/account/profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load account profile.' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const decoded = await verifyBearerToken(req.headers.get('authorization'));
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const name = (body.name || '').trim();
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter a valid full name.' }, { status: 400 });
    }

    const phoneCheck = validateIndianPhone(body.phone || '');
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }

    const updatedUser = await updateCustomerProfileDetails(decoded.uid, {
      name,
      phone: phoneCheck.cleanPhone,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Error in PATCH /api/account/profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile.' },
      { status: 400 }
    );
  }
}
