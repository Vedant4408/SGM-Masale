import { NextRequest, NextResponse } from 'next/server';
import { verifyAndCapturePayment } from '../../../../src/db/repository.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature, method } = body;

    if (!orderNumber || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing required payment verification credentials.' },
        { status: 400 }
      );
    }

    const result = await verifyAndCapturePayment({
      orderNumber,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      method: method || 'razorpay_test_upi',
      verifiedBy: 'signature_verify',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/checkout/verify-payment:', error);
    return NextResponse.json(
      { error: error.message || 'Server-side payment signature verification failed.' },
      { status: 400 }
    );
  }
}
