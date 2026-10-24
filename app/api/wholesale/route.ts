import { NextRequest, NextResponse } from 'next/server';
import {
  createWholesaleEnquiryRecord,
  getAllCatalogueProducts,
  getAllWholesaleEnquiries,
} from '../../../src/db/repository.ts';
import {
  calculateWholesaleQuote,
  validateIndianPhone,
  validateIndianPinCode,
} from '../../../src/lib/commerce-rules.ts';
import { verifyBearerToken } from '../../../src/lib/firebase-admin.ts';

export async function GET() {
  try {
    const enquiries = await getAllWholesaleEnquiries();
    return NextResponse.json({ enquiries });
  } catch (error: any) {
    console.error('Error in GET /api/wholesale:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load wholesale enquiries' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const businessName = (body.businessName || '').trim();
    const businessType = (body.businessType || 'Retail Kirana / Supermarket').trim();
    const contactName = (body.contactName || '').trim();
    const city = (body.city || '').trim();
    const state = (body.state || '').trim();

    if (!businessName || !contactName || !city || !state) {
      return NextResponse.json(
        { error: 'Please complete Business Name, Contact Person, City, and State.' },
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

    const requestedItems: Array<{ productId: number; quantityKg: number }> = Array.isArray(
      body.items
    )
      ? body.items
      : [];

    const catalogue = await getAllCatalogueProducts(false);
    const prodMap = new Map(catalogue.map((p) => [p.id, p]));

    const quoteInput = requestedItems
      .filter((i) => Number(i.quantityKg) > 0)
      .map((i) => {
        const p = prodMap.get(Number(i.productId));
        return {
          productId: Number(i.productId),
          productName: p?.name || 'Spice Variety',
          quantityKg: Number(i.quantityKg),
          minQtyKg: p?.wholesaleMinQtyKg || 10,
          baseWholesalePricePerKg: p?.wholesalePricePerKg || 420,
        };
      });

    const quote = calculateWholesaleQuote(quoteInput);
    if (!quote.valid) {
      return NextResponse.json({ error: quote.errors.join(' ') }, { status: 400 });
    }

    const decoded = await verifyBearerToken(req.headers.get('authorization'));

    const created = await createWholesaleEnquiryRecord({
      userUid: decoded?.uid || '',
      businessName,
      businessType,
      contactName,
      phone: phoneCheck.cleanPhone,
      email: body.email || '',
      city,
      state,
      pinCode: pinCheck.cleanPin,
      gstNumber: body.gstNumber || '',
      itemsJson: JSON.stringify(quote.lineItems),
      estimatedTotalInr: quote.estimatedTotalInr,
      notes: body.notes || '',
    });

    return NextResponse.json({ enquiry: created, quote });
  } catch (error: any) {
    console.error('Error in POST /api/wholesale:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit wholesale enquiry' },
      { status: 400 }
    );
  }
}
