import { NextRequest, NextResponse } from 'next/server';
import {
  confirmCustomerPasswordReset,
  loginCustomerAccount,
  registerCustomerAccount,
  requestCustomerPasswordReset,
} from '../../../../src/db/repository.ts';
import { validateIndianPhone } from '../../../../src/lib/commerce-rules.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'register') {
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!name || name.length < 2) {
        return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
      }
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }
      const phoneCheck = validateIndianPhone(body.phone || '');
      if (!phoneCheck.valid) {
        return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      const result = await registerCustomerAccount({
        name,
        email,
        phone: phoneCheck.cleanPhone,
        password,
      });
      return NextResponse.json(result);
    }

    if (action === 'login') {
      const email = (body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Please enter both your email and password.' },
          { status: 400 }
        );
      }
      const result = await loginCustomerAccount({ email, password });
      return NextResponse.json(result);
    }

    if (action === 'request_reset') {
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { error: 'Please enter your registered email address.' },
          { status: 400 }
        );
      }
      const result = await requestCustomerPasswordReset(email);
      return NextResponse.json(result);
    }

    if (action === 'confirm_reset') {
      const email = (body.email || '').trim().toLowerCase();
      const resetCode = (body.resetCode || '').trim();
      const newPassword = String(body.newPassword || '');
      if (!email || !resetCode) {
        return NextResponse.json(
          { error: 'Email and 6-character reset code are required.' },
          { status: 400 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }
      const result = await confirmCustomerPasswordReset({
        email,
        resetCode,
        newPassword,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unsupported auth action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in POST /api/account/auth:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication request failed.' },
      { status: 400 }
    );
  }
}
