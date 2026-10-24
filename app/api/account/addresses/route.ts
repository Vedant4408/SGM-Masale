import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken } from '../../../../src/lib/firebase-admin.ts';
import {
  deleteCustomerAddressRecord,
  upsertCustomerAddressRecord,
} from '../../../../src/db/repository.ts';
import { validateIndianPhone, validateIndianPinCode } from '../../../../src/lib/commerce-rules.ts';

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyBearerToken(req.headers.get('authorization'));
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to manage saved addresses.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const recipientName = (body.recipientName || '').trim();
    const addressLine = (body.addressLine || '').trim();
    const city = (body.city || '').trim();
    const state = (body.state || '').trim();

    if (!recipientName || !addressLine || !city || !state) {
      return NextResponse.json(
        { error: 'Recipient Name, Street Address, City, and State are required.' },
        { status: 400 }
      );
    }

    const phoneCheck = validateIndianPhone(body.phone || '');
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }

    const pinCheck = validateIndianPinCode(body.pinCode || '');
    if (!pinCheck.valid) {
      return NextResponse.json({ error: pinCheck.error }, { status: 400 });
    }

    const address = await upsertCustomerAddressRecord(decoded.uid, {
      id: body.id ? Number(body.id) : undefined,
      label: body.label || 'Home',
      recipientName,
      phone: phoneCheck.cleanPhone,
      addressLine,
      landmark: body.landmark || '',
      city,
      state,
      pinCode: pinCheck.cleanPin,
      isDefault: Boolean(body.isDefault),
    });

    return NextResponse.json({ address });
  } catch (error: any) {
    console.error('Error in POST /api/account/addresses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save delivery address.' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const decoded = await verifyBearerToken(req.headers.get('authorization'));
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to delete addresses.' },
        { status: 401 }
      );
    }

    const id = Number(req.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Address ID is required.' }, { status: 400 });
    }

    await deleteCustomerAddressRecord(decoded.uid, id);
    return NextResponse.json({ status: 'ok', deletedId: id });
  } catch (error: any) {
    console.error('Error in DELETE /api/account/addresses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete address.' },
      { status: 400 }
    );
  }
}
