import { NextRequest, NextResponse } from 'next/server';
import { getOrdersWithItems } from '../../../src/db/repository.ts';
import { verifyBearerToken } from '../../../src/lib/firebase-admin.ts';

export async function GET(req: NextRequest) {
  try {
    const orderNumber = req.nextUrl.searchParams.get('orderNumber') || undefined;
    const phone = req.nextUrl.searchParams.get('phone') || undefined;
    const isAdminParam = req.nextUrl.searchParams.get('admin') === '1';

    const decoded = await verifyBearerToken(req.headers.get('authorization'));

    const ordersList = await getOrdersWithItems({
      orderNumber,
      phone,
      userUid: decoded?.uid,
      isAdmin: isAdminParam,
    });

    return NextResponse.json({ orders: ordersList });
  } catch (error: any) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
