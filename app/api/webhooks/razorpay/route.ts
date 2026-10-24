import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRazorpayWebhookSignature,
  generateRazorpaySignature,
} from '../../../../src/lib/razorpay-crypto.ts';
import {
  getRazorpayTestSecret,
  verifyAndCapturePayment,
} from '../../../../src/db/repository.ts';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || getRazorpayTestSecret();

    if (!verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const entity = event?.payload?.payment?.entity || {};
      const orderNumber = entity?.notes?.orderNumber;
      const razorpayOrderId = entity?.order_id;
      const razorpayPaymentId = entity?.id;

      if (orderNumber && razorpayOrderId && razorpayPaymentId) {
        const computedPaymentSig = generateRazorpaySignature(
          razorpayOrderId,
          razorpayPaymentId,
          getRazorpayTestSecret()
        );
        const result = await verifyAndCapturePayment({
          orderNumber,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: computedPaymentSig,
          method: entity?.method || 'webhook_capture',
          verifiedBy: 'webhook',
        });
        return NextResponse.json({ status: 'ok', alreadyProcessed: result.alreadyProcessed });
      }
    }

    return NextResponse.json({ status: 'ignored_or_acknowledged' });
  } catch (error: any) {
    console.error('Error in POST /api/webhooks/razorpay:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
