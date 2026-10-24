import { NextRequest, NextResponse } from 'next/server';
import {
  createServerAuthoritativeOrder,
  upsertCustomerAddressRecord,
} from '../../../../src/db/repository.ts';
import { validateIndianPhone, validateIndianPinCode } from '../../../../src/lib/commerce-rules.ts';
import { verifyBearerToken } from '../../../../src/lib/firebase-admin.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customerName = (body.customerName || '').trim();
    const customerEmail = (body.customerEmail || '').trim();
    const deliveryAddress = (body.deliveryAddress || '').trim();
    const city = (body.city || '').trim();
    const state = (body.state || '').trim();

    if (!customerName || customerName.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }

    const phoneCheck = validateIndianPhone(body.customerPhone || '');
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }

    const pinCheck = validateIndianPinCode(body.pinCode || '');
    if (!pinCheck.valid) {
      return NextResponse.json({ error: pinCheck.error }, { status: 400 });
    }

    if (!deliveryAddress || deliveryAddress.length < 5) {
      return NextResponse.json(
        { error: 'Please enter a complete delivery street/house address.' },
        { status: 400 }
      );
    }

    if (!city || !state) {
      return NextResponse.json({ error: 'Please enter your city and state.' }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    const decoded = await verifyBearerToken(req.headers.get('authorization'));

    if (decoded?.uid && body.saveAddressToAccount) {
      try {
        await upsertCustomerAddressRecord(decoded.uid, {
          label: body.addressLabel || 'Home',
          recipientName: customerName,
          phone: phoneCheck.cleanPhone,
          addressLine: deliveryAddress,
          city,
          state,
          pinCode: pinCheck.cleanPin,
          isDefault: true,
        });
      } catch (e) {
        console.error('Non-fatal error saving checkout address:', e);
      }
    }

    const result = await createServerAuthoritativeOrder({
      userUid: decoded?.uid || body.userUid || '',
      customerName,
      customerPhone: phoneCheck.cleanPhone,
      customerEmail: customerEmail || decoded?.email || '',
      deliveryAddress,
      city,
      state,
      pinCode: pinCheck.cleanPin,
      items: body.items,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/checkout/create-order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout order.' },
      { status: 400 }
    );
  }
}
