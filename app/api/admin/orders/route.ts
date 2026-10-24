import { NextRequest, NextResponse } from 'next/server';
import {
  updateAdminOrderStatus,
  updateWholesaleEnquiryStatus,
} from '../../../../src/db/repository.ts';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type === 'wholesale_status') {
      const updated = await updateWholesaleEnquiryStatus(Number(body.id), String(body.status));
      return NextResponse.json({ enquiry: updated });
    }

    const updatedOrder = await updateAdminOrderStatus({
      orderId: Number(body.orderId),
      fulfilmentStatus: body.fulfilmentStatus,
      paymentStatus: body.paymentStatus,
      cancellationReason: body.cancellationReason,
      refundAmountInr: body.refundAmountInr,
      markNotificationRead: body.markNotificationRead,
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order status' },
      { status: 400 }
    );
  }
}
