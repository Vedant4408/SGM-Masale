'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  User as UserIcon,
  MapPin,
  Package,
  Lock,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  LogIn,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { validateIndianPinCode } from '../lib/commerce-rules';

export interface SavedAddressDto {
  id: number;
  userUid: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  landmark: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

export interface CustomerProfileDto {
  id: number;
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: string;
}

interface MyAccountViewProps {
  authToken: string | null;
  currentUser: CustomerProfileDto | null;
  savedAddresses: SavedAddressDto[];
  onAuthSuccess: (user: CustomerProfileDto, token: string) => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onAddressesUpdated: (addresses: SavedAddressDto[]) => void;
  onUseAddressInCheckout: (address: SavedAddressDto) => void;
  onShopNow: () => void;
}

export function MyAccountView({
  authToken,
  currentUser,
  savedAddresses,
  onAuthSuccess,
  onGoogleSignIn,
  onSignOut,
  onAddressesUpdated,
  onUseAddressInCheckout,
  onShopNow,
}: MyAccountViewProps) {
  // Unauthenticated tabs: 'login' | 'register' | 'reset'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');

  // Authenticated dashboard tabs: 'orders' | 'addresses' | 'profile'
  const [accountTab, setAccountTab] = useState<'orders' | 'addresses' | 'profile'>('orders');

  // Login / Register / Reset form states
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [issuedTestResetCode, setIssuedTestResetCode] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Authenticated data state
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Address Form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | undefined>(undefined);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrCity, setAddrCity] = useState('Pune');
  const [addrState, setAddrState] = useState('Maharashtra');
  const [addrPin, setAddrPin] = useState('411001');
  const [addrDefault, setAddrDefault] = useState(true);
  const [addrStatusMsg, setAddrStatusMsg] = useState<string | null>(null);
  const [addrErrorMsg, setAddrErrorMsg] = useState<string | null>(null);

  // Profile Edit state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Guest / Quick Order Lookup state
  const [lookupOrderNo, setLookupOrderNo] = useState('');
  const [lookupPhoneNo, setLookupPhoneNo] = useState('');

  const loadAuthenticatedAccount = useCallback(async () => {
    if (!authToken) return;
    setLoadingAccount(true);
    try {
      const res = await fetch('/api/account/profile', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfileName(data.user.name || '');
        setProfilePhone(data.user.phone || '');
        onAddressesUpdated(data.addresses || []);
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error('Error loading account profile:', e);
    } finally {
      setLoadingAccount(false);
    }
  }, [authToken, onAddressesUpdated]);

  useEffect(() => {
    if (authToken && currentUser) {
      setProfileName(currentUser.name || '');
      setProfilePhone(currentUser.phone || '');
      loadAuthenticatedAccount();
    }
  }, [authToken, currentUser, loadAuthenticatedAccount]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);

    try {
      if (authMode === 'register') {
        const res = await fetch('/api/account/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            name: nameInput,
            email: emailInput,
            phone: phoneInput,
            password: passwordInput,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || 'Registration failed.');
        } else {
          onAuthSuccess(data.user, data.token);
        }
      } else if (authMode === 'login') {
        const res = await fetch('/api/account/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            email: emailInput,
            password: passwordInput,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || 'Login failed.');
        } else {
          onAuthSuccess(data.user, data.token);
        }
      } else if (authMode === 'reset') {
        if (!issuedTestResetCode) {
          // Step 1: Request reset code
          const res = await fetch('/api/account/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'request_reset',
              email: emailInput,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setAuthError(data.error || 'Could not generate reset token.');
          } else {
            setIssuedTestResetCode(data.testResetCode);
            setResetCodeInput(data.testResetCode);
            setAuthSuccessMsg(
              `Password reset code generated for ${data.email}. In Test Mode, your 6-character verification code (${data.testResetCode}) is pre-filled below.`
            );
          }
        } else {
          // Step 2: Confirm reset code & set new password
          const res = await fetch('/api/account/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'confirm_reset',
              email: emailInput,
              resetCode: resetCodeInput,
              newPassword: newPasswordInput,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setAuthError(data.error || 'Password reset failed.');
          } else {
            setIssuedTestResetCode(null);
            setResetCodeInput('');
            setNewPasswordInput('');
            onAuthSuccess(data.user, data.token);
          }
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddressId(undefined);
    setAddrLabel('Home');
    setAddrRecipient(currentUser?.name || '');
    setAddrPhone(currentUser?.phone || '');
    setAddrLine('');
    setAddrLandmark('');
    setAddrCity('Pune');
    setAddrState('Maharashtra');
    setAddrPin('411001');
    setAddrDefault(savedAddresses.length === 0);
    setAddrErrorMsg(null);
    setShowAddressForm(true);
  };

  const handleOpenEditAddress = (addr: SavedAddressDto) => {
    setEditingAddressId(addr.id);
    setAddrLabel(addr.label);
    setAddrRecipient(addr.recipientName);
    setAddrPhone(addr.phone);
    setAddrLine(addr.addressLine);
    setAddrLandmark(addr.landmark || '');
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPin(addr.pinCode);
    setAddrDefault(addr.isDefault);
    setAddrErrorMsg(null);
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setAddrErrorMsg(null);
    setAddrStatusMsg(null);

    try {
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: editingAddressId,
          label: addrLabel,
          recipientName: addrRecipient,
          phone: addrPhone,
          addressLine: addrLine,
          landmark: addrLandmark,
          city: addrCity,
          state: addrState,
          pinCode: addrPin,
          isDefault: addrDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddrErrorMsg(data.error || 'Could not save address.');
        return;
      }
      setShowAddressForm(false);
      setAddrStatusMsg('Saved delivery address to your account.');
      await loadAuthenticatedAccount();
    } catch (err: any) {
      setAddrErrorMsg(err.message || 'Failed to save address.');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/account/addresses?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        setAddrStatusMsg('Deleted saved address.');
        await loadAuthenticatedAccount();
      }
    } catch (e) {
      console.error('Failed to delete address:', e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setProfileMsg(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onAuthSuccess(data.user, authToken);
        setProfileMsg('Profile details updated and saved.');
      } else {
        setProfileMsg(data.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setProfileMsg(err.message || 'Error updating profile.');
    }
  };

  const handleLookupOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAccount(true);
    try {
      const params = new URLSearchParams();
      if (lookupOrderNo.trim()) params.set('orderNumber', lookupOrderNo.trim());
      if (lookupPhoneNo.trim()) params.set('phone', lookupPhoneNo.trim());
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/orders?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Order lookup failed:', err);
    } finally {
      setLoadingAccount(false);
    }
  };

  const pinCheck = validateIndianPinCode(addrPin);

  // ==================== VIEW A: UNAUTHENTICATED (REGISTER / LOGIN / PASSWORD RESET) ====================
  if (!currentUser || !authToken) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Brand Value & Account Security */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#EA580C] to-[#C2410C] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-[#FDBA74] shadow-sm">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#FFEDD5] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
                <span>SGM Masale · Customer Account</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-snug">
                Faster Checkout, Saved Addresses & Order History
              </h1>
              <p className="text-xs sm:text-sm text-[#FFEDD5] leading-relaxed">
                Create your SGM Masale account to save multiple delivery addresses across India,
                track live spice dispatches, and view your complete order receipts.
              </p>

              <ul className="space-y-3 pt-2 text-xs text-white">
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
                  <span>
                    <strong>Saved Delivery Addresses:</strong> Store Home, Office, or Shop addresses
                    with verified 6-digit PIN codes for 1-click checkout.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Package className="w-4 h-4 text-[#FFEDD5] shrink-0 mt-0.5" />
                  <span>
                    <strong>Complete Order Tracking:</strong> View itemised past orders, Razorpay
                    payment references, and fulfilment stages.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
                  <span>
                    <strong>Row-Level Database Security:</strong> Passwords are hashed with salted{' '}
                    <span className="font-mono">scrypt</span> and every address or order record is
                    protected by strict UID ownership rules.
                  </span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-white/20">
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl bg-white text-[#1C1917] hover:bg-[#FFF7ED] font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4 text-[#EA580C]" />
                <span>Continue with Google Sign-In</span>
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Sign In / Create Account / Password Reset Card */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#FED7AA] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#FFF7ED] rounded-xl border border-[#FED7AA] mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    authMode === 'login'
                      ? 'bg-[#EA580C] text-white shadow-xs'
                      : 'text-[#44403C] hover:text-[#EA580C]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    authMode === 'register'
                      ? 'bg-[#EA580C] text-white shadow-xs'
                      : 'text-[#44403C] hover:text-[#EA580C]'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('reset');
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    authMode === 'reset'
                      ? 'bg-[#EA580C] text-white shadow-xs'
                      : 'text-[#44403C] hover:text-[#EA580C]'
                  }`}
                >
                  Reset Password
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
                      Create Your SGM Masale Account
                    </h2>
                    <div>
                      <label
                        htmlFor="reg-name"
                        className="block text-xs font-semibold text-[#292524] mb-1"
                      >
                        Full Name *
                      </label>
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm"
                      />
                    </div>
                  </>
                )}

                {authMode === 'login' && (
                  <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
                    Sign In to Your Account
                  </h2>
                )}

                {authMode === 'reset' && (
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
                      Reset Your Account Password
                    </h2>
                    <p className="text-xs text-[#57534E] mt-1">
                      Enter your registered email address to generate a time-bound 6-character
                      verification code and set a new password.
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    Email Address *
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm"
                  />
                </div>

                {authMode === 'register' && (
                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-xs font-semibold text-[#292524] mb-1"
                    >
                      10-Digit Mobile Number *
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      required
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono"
                    />
                  </div>
                )}

                {(authMode === 'login' || authMode === 'register') && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="auth-password"
                        className="block text-xs font-semibold text-[#292524]"
                      >
                        Password {authMode === 'register' ? '(Min. 6 characters) *' : '*'}
                      </label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('reset');
                            setAuthError(null);
                          }}
                          className="text-xs font-semibold text-[#EA580C] underline"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      minLength={6}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm"
                    />
                  </div>
                )}

                {authMode === 'reset' && issuedTestResetCode && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label
                        htmlFor="reset-code"
                        className="block text-xs font-semibold text-[#292524] mb-1"
                      >
                        6-Character Verification Code *
                      </label>
                      <input
                        id="reset-code"
                        type="text"
                        required
                        value={resetCodeInput}
                        onChange={(e) => setResetCodeInput(e.target.value.toUpperCase())}
                        placeholder="A1B2C3"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reset-new-password"
                        className="block text-xs font-semibold text-[#292524] mb-1"
                      >
                        New Password (Min. 6 characters) *
                      </label>
                      <input
                        id="reset-new-password"
                        type="password"
                        required
                        minLength={6}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm"
                      />
                    </div>
                  </div>
                )}

                {authError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                    {authError}
                  </div>
                )}

                {authSuccessMsg && (
                  <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] font-medium">
                    {authSuccessMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-stone-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Lock className="w-4 h-4 text-white" />
                  <span>
                    {authLoading
                      ? 'Processing...'
                      : authMode === 'register'
                        ? 'Create My Account'
                        : authMode === 'login'
                          ? 'Sign In to My Account'
                          : issuedTestResetCode
                            ? 'Verify Code & Save New Password'
                            : 'Send Password Reset Code'}
                  </span>
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-[#FFEDD5] text-[11px] text-[#78716C] flex items-center justify-between">
              <span className="text-[#15803D] font-medium">● Encrypted Session & Row-Level Ownership</span>
              <span>SGM Masale Customer Portal</span>
            </div>
          </div>
        </div>

        {/* Quick Guest Order Lookup Section */}
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#1C1917]">
              Quick Order Lookup (Guest or Sample Order Tracking)
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              Checked out as a guest? Enter your Order Number (e.g.{' '}
              <span className="font-mono font-semibold text-[#EA580C]">SGM-2026-1001</span>) or
              10-digit Mobile Number below.
            </p>
          </div>
          <form onSubmit={handleLookupOrders} className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Order Number (e.g. SGM-2026-1001)"
              value={lookupOrderNo}
              onChange={(e) => setLookupOrderNo(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-white border border-[#FED7AA] text-xs font-mono"
            />
            <input
              type="tel"
              placeholder="10-Digit Mobile Number"
              value={lookupPhoneNo}
              onChange={(e) => setLookupPhoneNo(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-white border border-[#FED7AA] text-xs font-mono"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold"
            >
              Track Order
            </button>
          </form>

          {orders.length > 0 && (
            <div className="space-y-3 pt-2">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-xl border border-[#FED7AA] p-4 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-sm text-[#EA580C]">
                      {ord.orderNumber}
                    </span>
                    <div className="text-[#44403C] mt-0.5">
                      {ord.customerName} · {ord.city}, {ord.state} ({ord.pinCode})
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="font-bold text-sm text-[#1C1917]">₹{ord.totalInr}</div>
                    <div className="text-[#15803D] font-semibold">
                      {ord.paymentStatus.toUpperCase()} · {ord.fulfilmentStatus.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== VIEW B: AUTHENTICATED "MY ACCOUNT" DASHBOARD ====================
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Account Summary Banner */}
      <div className="bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#FFEDD5] font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
            <span>My Account · Row-Level Security Active</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            Welcome, {currentUser.name || currentUser.email}
          </h1>
          <div className="text-xs text-[#FFEDD5] flex flex-wrap items-center gap-2">
            <span>{currentUser.email}</span>
            {currentUser.phone && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono">+91 {currentUser.phone}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="capitalize">Role: {currentUser.role}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="px-4 py-2.5 rounded-xl bg-white text-[#EA580C] hover:bg-[#FFF7ED] text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 shadow-xs"
        >
          <LogOut className="w-4 h-4 text-[#EA580C]" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
        <button
          type="button"
          onClick={() => setAccountTab('orders')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            accountTab === 'orders'
              ? 'bg-[#EA580C] text-white shadow-xs'
              : 'text-[#44403C] hover:text-[#EA580C]'
          }`}
        >
          Past Orders ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setAccountTab('addresses')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            accountTab === 'addresses'
              ? 'bg-[#EA580C] text-white shadow-xs'
              : 'text-[#44403C] hover:text-[#EA580C]'
          }`}
        >
          Saved Addresses ({savedAddresses.length})
        </button>
        <button
          type="button"
          onClick={() => setAccountTab('profile')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            accountTab === 'profile'
              ? 'bg-[#EA580C] text-white shadow-xs'
              : 'text-[#44403C] hover:text-[#EA580C]'
          }`}
        >
          Profile & Security Settings
        </button>
      </div>

      {/* TAB 1: PAST ORDERS */}
      {accountTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#FED7AA] p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                Your Order History & Live Fulfilment Status
              </h2>
              <p className="text-xs text-[#57534E] mt-0.5">
                Orders placed under your account are linked to your UID and protected from
                unauthorized access.
              </p>
            </div>
            <button
              type="button"
              onClick={onShopNow}
              className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>Shop Spices</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {loadingAccount ? (
            <div className="p-8 text-center text-xs text-[#57534E]">Loading your orders...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#FED7AA] p-10 text-center space-y-3">
              <Package className="w-10 h-10 text-[#EA580C] mx-auto" />
              <h3 className="font-serif text-lg font-bold text-[#1C1917]">No Orders Placed Yet</h3>
              <p className="text-xs text-[#57534E]">
                Browse our 48 Indian spice varieties and place your first order.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-[#FED7AA] p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#FFEDD5] pb-4">
                    <div>
                      <span className="font-mono tabular-nums text-base font-bold text-[#EA580C]">
                        {ord.orderNumber}
                      </span>
                      <div className="text-xs text-[#44403C] mt-0.5">
                        Deliver to: <strong>{ord.customerName}</strong> · {ord.deliveryAddress},{' '}
                        {ord.city}, {ord.state} — <span className="font-mono">{ord.pinCode}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-lg font-bold text-[#1C1917]">₹{ord.totalInr}</div>
                      <div className="text-xs text-[#15803D] font-semibold">
                        Payment: {ord.paymentStatus.toUpperCase()} · Status:{' '}
                        {ord.fulfilmentStatus.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Fulfilment Progress Steps */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
                    {(['placed', 'packed', 'shipped', 'delivered'] as const).map((step, i) => {
                      const stages = ['placed', 'packed', 'shipped', 'delivered'];
                      const currentIdx = stages.indexOf(ord.fulfilmentStatus);
                      const reached = currentIdx >= i && ord.fulfilmentStatus !== 'cancelled';
                      return (
                        <div
                          key={step}
                          className={`py-2 px-2 rounded-lg border capitalize ${
                            reached
                              ? 'bg-[#15803D] text-white border-[#15803D]'
                              : 'bg-[#FFF7ED] text-[#78716C] border-[#FED7AA]'
                          }`}
                        >
                          {i + 1}. {step}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {(ord.items || []).map((it: any) => (
                      <span
                        key={it.id}
                        className="px-3 py-1.5 rounded-lg bg-[#FFF7ED] border border-[#FED7AA]"
                      >
                        {it.productName} ({it.packSize}) × {it.quantity} — ₹{it.lineTotalInr}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED ADDRESSES */}
      {accountTab === 'addresses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#FED7AA] p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                Saved Delivery Addresses
              </h2>
              <p className="text-xs text-[#57534E] mt-0.5">
                Manage your personal & business delivery locations across India for instant checkout
                auto-fill.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddAddress}
              className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Address</span>
            </button>
          </div>

          {addrStatusMsg && (
            <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{addrStatusMsg}</span>
            </div>
          )}

          {showAddressForm && (
            <form
              onSubmit={handleSaveAddress}
              className="bg-[#FFF7ED] rounded-2xl border border-[#FED7AA] p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#FED7AA] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                  {editingAddressId ? 'Edit Saved Address' : 'Add New Delivery Address'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="text-xs font-semibold text-[#EA580C]"
                >
                  Cancel ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="addr-label"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    Address Label *
                  </label>
                  <select
                    id="addr-label"
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#FED7AA] text-xs font-semibold"
                  >
                    <option value="Home">Home</option>
                    <option value="Work / Office">Work / Office</option>
                    <option value="Shop / Godown">Shop / Godown</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="addr-recipient"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    Recipient Full Name *
                  </label>
                  <input
                    id="addr-recipient"
                    type="text"
                    required
                    value={addrRecipient}
                    onChange={(e) => setAddrRecipient(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#FED7AA] text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="addr-phone"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    10-Digit Mobile Number *
                  </label>
                  <input
                    id="addr-phone"
                    type="tel"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#FED7AA] text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="addr-line"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    Flat / House No., Building, Street *
                  </label>
                  <input
                    id="addr-line"
                    type="text"
                    required
                    value={addrLine}
                    onChange={(e) => setAddrLine(e.target.value)}
                    placeholder="Flat 302, Sahyadri Apartments, Kothrud"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#FED7AA] text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="addr-landmark"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    Landmark (Optional)
                  </label>
                  <input
                    id="addr-landmark"
                    type="text"
                    value={addrLandmark}
                    onChange={(e) => setAddrLandmark(e.target.value)}
                    placeholder="Near Metro Station"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#FED7AA] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="addr-city"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    City / District *
                  </label>
                  <input
                    id="addr-city"
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#FED7AA] text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="addr-state"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    State *
                  </label>
                  <input
                    id="addr-state"
                    type="text"
                    required
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#FED7AA] text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="addr-pin"
                    className="block text-xs font-semibold text-[#292524] mb-1"
                  >
                    6-Digit PIN Code *
                  </label>
                  <input
                    id="addr-pin"
                    type="text"
                    required
                    maxLength={6}
                    value={addrPin}
                    onChange={(e) => setAddrPin(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#FED7AA] text-sm font-mono"
                  />
                </div>
              </div>

              {pinCheck.valid ? (
                <div className="text-xs text-[#15803D] font-medium">
                  ✓ Serviceable Zone: {pinCheck.regionName} ({pinCheck.estimatedDays})
                </div>
              ) : (
                <div className="text-xs text-[#C2410C]">{pinCheck.error}</div>
              )}

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#292524] cursor-pointer">
                <input
                  type="checkbox"
                  checked={addrDefault}
                  onChange={(e) => setAddrDefault(e.target.checked)}
                  className="rounded border-[#FED7AA]"
                />
                <span>Set as my Default Delivery Address</span>
              </label>

              {addrErrorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                  {addrErrorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="px-4 py-2 rounded-xl border border-[#FED7AA] bg-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold"
                >
                  Save Address
                </button>
              </div>
            </form>
          )}

          {savedAddresses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#FED7AA] p-10 text-center space-y-3">
              <MapPin className="w-10 h-10 text-[#EA580C] mx-auto" />
              <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                No Saved Addresses Yet
              </h3>
              <p className="text-xs text-[#57534E]">
                Add your home, office, or shop delivery address above for 1-click checkout.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-white rounded-2xl border border-[#FED7AA] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                        {addr.label}
                        {addr.isDefault ? ' · DEFAULT ADDRESS' : ''}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          aria-label={`Edit ${addr.label} address`}
                          className="p-1.5 rounded-lg border border-[#FED7AA] hover:bg-[#FFF7ED] text-[#EA580C]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          aria-label={`Delete ${addr.label} address`}
                          className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="font-serif text-base font-bold text-[#1C1917]">
                      {addr.recipientName}
                    </div>
                    <div className="text-xs text-[#44403C] leading-relaxed">
                      {addr.addressLine}
                      {addr.landmark ? `, ${addr.landmark}` : ''}
                      <br />
                      {addr.city}, {addr.state} —{' '}
                      <span className="font-mono font-semibold">{addr.pinCode}</span>
                    </div>
                    <div className="text-xs font-mono text-[#57534E]">Phone: +91 {addr.phone}</div>
                  </div>

                  <div className="pt-3 border-t border-[#FFEDD5] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onUseAddressInCheckout(addr)}
                      className="text-xs font-semibold text-[#15803D] underline underline-offset-4 hover:text-[#EA580C]"
                    >
                      Use this address in Checkout →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROFILE & SECURITY SETTINGS */}
      {accountTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveProfile}
            className="md:col-span-7 bg-white rounded-2xl border border-[#FED7AA] p-6 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-[#FFEDD5] pb-3">
              <UserIcon className="w-5 h-5 text-[#EA580C]" />
              <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                Personal Profile Details
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Registered Email Address
              </label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-sm text-[#78716C]"
              />
            </div>

            <div>
              <label
                htmlFor="prof-name"
                className="block text-xs font-semibold text-[#292524] mb-1"
              >
                Full Name *
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="prof-phone"
                className="block text-xs font-semibold text-[#292524] mb-1"
              >
                10-Digit Mobile Number *
              </label>
              <input
                id="prof-phone"
                type="tel"
                required
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono"
              />
            </div>

            {profileMsg && (
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] font-medium">
                {profileMsg}
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold"
            >
              Save Profile Changes
            </button>
          </form>

          <div className="md:col-span-5 bg-[#FFF7ED] rounded-2xl border border-[#FED7AA] p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#15803D]">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                Account & Database Security
              </h3>
            </div>
            <p className="text-xs text-[#44403C] leading-relaxed">
              Your account is identified by unique UID{' '}
              <span className="font-mono font-semibold text-[#EA580C]">{currentUser.uid}</span>.
              Server-side database queries enforce strict row-level filtering (`WHERE user_uid =
              authenticated_uid`) so no other customer can view or modify your saved addresses or
              order history.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const emailToReset = currentUser.email;
                  onSignOut();
                  setEmailInput(emailToReset);
                  setAuthMode('reset');
                }}
                className="px-4 py-2.5 rounded-xl border border-[#EA580C] text-[#EA580C] bg-white hover:bg-[#FFEDD5] text-xs font-semibold"
              >
                Reset / Change Account Password →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
