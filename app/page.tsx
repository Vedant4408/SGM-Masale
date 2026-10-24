'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  Check,
  Trash2,
  ArrowRight,
  PackageCheck,
  ShieldCheck,
  LogIn,
  LogOut,
  MapPin,
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../src/lib/firebase';
import {
  calculateCartTotals,
  validateIndianPinCode,
  validateIndianPhone,
} from '../src/lib/commerce-rules';
import { SpiceVisual, HeroSpiceShowcase } from '../src/components/SpiceVisual';
import {
  ProductDetailModal,
  ProductDto,
  ProductVariantDto,
} from '../src/components/ProductDetailModal';
import {
  RazorpayCheckoutModal,
  RazorpayModalConfig,
} from '../src/components/RazorpayCheckoutModal';
import { WholesaleView } from '../src/components/WholesaleView';
import { AdminDashboardView } from '../src/components/AdminDashboardView';
import { PolicyAndInfoViews, InfoPageType } from '../src/components/PolicyAndInfoViews';
import {
  MyAccountView,
  CustomerProfileDto,
  SavedAddressDto,
} from '../src/components/MyAccountView';
import { SAMPLE_48_SPICES } from '../src/lib/sample-catalogue';

const INITIAL_CLIENT_PRODUCTS: ProductDto[] = SAMPLE_48_SPICES.map((item, idx) => ({
  id: idx + 1,
  slug: item.slug,
  name: item.name,
  hindiName: item.hindiName,
  category: item.category,
  shortDescription: item.shortDescription,
  description: item.description,
  ingredients: item.ingredients,
  storageInstructions: item.storageInstructions,
  originRegion: item.originRegion,
  heatLevel: item.heatLevel,
  colorHex: item.colorHex,
  accentHex: item.accentHex,
  imageUrl: '',
  isSampleData: true,
  isActive: true,
  isFeatured: item.isFeatured,
  wholesaleMinQtyKg: item.wholesaleMinQtyKg,
  wholesalePricePerKg: item.wholesalePricePerKg,
  variants: item.variants.map((v, vIdx) => ({
    id: idx * 10 + vIdx + 1,
    productId: idx + 1,
    packSize: v.packSize,
    weightGrams: v.weightGrams,
    sku: v.sku,
    priceInr: v.priceInr,
    mrpInr: v.mrpInr,
    stockQty: v.stockQty,
    isActive: true,
  })),
}));

type ActiveView =
  | 'home'
  | 'shop'
  | 'cart_checkout'
  | 'order_confirmation'
  | 'my_orders'
  | 'wholesale'
  | 'admin'
  | InfoPageType;

interface CartItem {
  productId: number;
  productName: string;
  hindiName: string;
  category: string;
  colorHex: string;
  accentHex: string;
  imageUrl: string;
  variantId: number;
  packSize: string;
  sku: string;
  unitPriceInr: number;
  mrpInr: number;
  stockQty: number;
  quantity: number;
}

const CATEGORIES = [
  'All 48 Spices',
  'Pure Ground Spices',
  'Signature Blended Masalas',
  'Whole Spices & Aromatics',
  'Regional & Specialty Blends',
] as const;

export default function SGMMasaleApp() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState('');

  // Catalogue state initialized with deterministic 48 varieties for zero-latency first paint
  const [products, setProducts] = useState<ProductDto[]>(INITIAL_CLIENT_PRODUCTS);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All 48 Spices');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'name_asc'>(
    'featured'
  );

  // Selected variant per product card (productId -> variantId)
  const [cardVariantSelection, setCardVariantSelection] = useState<Record<number, number>>({});
  // Hovered product ID for interactive Ingredients popover preview
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);

  // Product Detail Modal state
  const [detailProduct, setDetailProduct] = useState<ProductDto | null>(null);
  const [wholesalePreselect, setWholesalePreselect] = useState<ProductDto | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Checkout Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('Pune');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pinCode, setPinCode] = useState('411001');
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Razorpay Test Mode Modal & Confirmed Order state
  const [razorpayModalConfig, setRazorpayModalConfig] = useState<RazorpayModalConfig | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  // Customer Account & Auth state (token kept strictly in React memory)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CustomerProfileDto | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressDto[]>([]);
  const [dbUserRole, setDbUserRole] = useState<string>('customer');

  const applySavedAddressToCheckout = useCallback((addr: SavedAddressDto) => {
    setCustomerName(addr.recipientName);
    setCustomerPhone(addr.phone);
    setDeliveryAddress(
      addr.landmark ? `${addr.addressLine}, ${addr.landmark}` : addr.addressLine
    );
    setCity(addr.city);
    setStateName(addr.state);
    setPinCode(addr.pinCode);
  }, []);

  const fetchCatalogue = useCallback(async () => {
    try {
      const res = await fetch('/api/catalogue');
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to load catalogue:', err);
    } finally {
      setLoadingCatalogue(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogue();
  }, [fetchCatalogue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [activeView]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usr) => {
      setFirebaseUser(usr);
      if (usr) {
        try {
          const token = await usr.getIdToken();
          setIdToken(token);
          if (usr.displayName && !customerName) setCustomerName(usr.displayName);
          if (usr.email && !customerEmail) setCustomerEmail(usr.email);

          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: usr.email,
              name: usr.displayName,
            }),
          });
          const data = await res.json();
          if (data.user) {
            setDbUserRole(data.user.role || 'customer');
            setCurrentUser({
              id: data.user.id,
              uid: data.user.uid,
              email: data.user.email,
              name: data.user.name,
              phone: data.user.phone || '',
              role: data.user.role || 'customer',
            });
          }

          const profRes = await fetch('/api/account/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (profRes.ok) {
            const profData = await profRes.json();
            if (profData.addresses) {
              setSavedAddresses(profData.addresses);
              const defAddr =
                profData.addresses.find((a: SavedAddressDto) => a.isDefault) ||
                profData.addresses[0];
              if (defAddr) {
                applySavedAddressToCheckout(defAddr);
              }
            }
          }
        } catch (e) {
          console.error('Error syncing Firebase user:', e);
        }
      }
    });
    return () => unsub();
  }, [applySavedAddressToCheckout]);

  const handleAccountAuthSuccess = useCallback(
    (user: CustomerProfileDto, token: string) => {
      setCurrentUser(user);
      setIdToken(token);
      setDbUserRole(user.role || 'customer');
      if (user.name) setCustomerName(user.name);
      if (user.email) setCustomerEmail(user.email);
      if (user.phone) setCustomerPhone(user.phone);
    },
    []
  );

  const handleAccountSignOut = useCallback(async () => {
    try {
      if (firebaseUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setFirebaseUser(null);
    setCurrentUser(null);
    setIdToken(null);
    setSavedAddresses([]);
    setDbUserRole('customer');
  }, [firebaseUser]);

  const handleAddToCart = (
    product: ProductDto,
    variant: ProductVariantDto,
    quantityToAdd = 1
  ) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.variantId === variant.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        const nextQty = Math.min(
          variant.stockQty,
          updated[existingIdx].quantity + quantityToAdd
        );
        updated[existingIdx] = { ...updated[existingIdx], quantity: nextQty };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          hindiName: product.hindiName,
          category: product.category,
          colorHex: product.colorHex,
          accentHex: product.accentHex,
          imageUrl: product.imageUrl,
          variantId: variant.id,
          packSize: variant.packSize,
          sku: variant.sku,
          unitPriceInr: variant.priceInr,
          mrpInr: variant.mrpInr,
          stockQty: variant.stockQty,
          quantity: Math.min(variant.stockQty, quantityToAdd),
        },
      ];
    });

    setAddedToast(`${product.name} (${variant.packSize}) added to cart`);
    setTimeout(() => setAddedToast(null), 2200);
  };

  const handleUpdateCartQty = (variantId: number, nextQty: number) => {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((i) => i.variantId !== variantId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.min(item.stockQty, nextQty) }
          : item
      )
    );
  };

  const cartTotals = useMemo(
    () =>
      calculateCartTotals(
        cart.map((i) => ({
          variantId: i.variantId,
          unitPriceInr: i.unitPriceInr,
          mrpInr: i.mrpInr,
          quantity: i.quantity,
        }))
      ),
    [cart]
  );

  const totalCartItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const pinValidation = useMemo(() => validateIndianPinCode(pinCode), [pinCode]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesCat =
        selectedCategory === 'All 48 Spices' || p.category === selectedCategory;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.hindiName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.ingredients.toLowerCase().includes(q) ||
        p.originRegion.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    return [...list].sort((a, b) => {
      const priceA = a.variants[0]?.priceInr || 0;
      const priceB = b.variants[0]?.priceInr || 0;
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      // featured first
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return a.id - b.id;
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  const featuredProducts = useMemo(
    () => products.filter((p) => p.isFeatured).slice(0, 6),
    [products]
  );

  const handleProceedToRazorpay = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (cart.length === 0) {
      setCheckoutError('Please add at least one spice pack to your cart before checking out.');
      return;
    }

    const phoneResult = validateIndianPhone(customerPhone);
    if (!phoneResult.valid) {
      setCheckoutError(phoneResult.error || 'Invalid mobile number.');
      return;
    }

    if (!pinValidation.valid) {
      setCheckoutError(pinValidation.error || 'Invalid PIN code.');
      return;
    }

    setCreatingOrder(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName,
          customerPhone: phoneResult.cleanPhone,
          customerEmail,
          deliveryAddress,
          city,
          state: stateName,
          pinCode: pinValidation.cleanPin,
          saveAddressToAccount: Boolean(currentUser && saveAddressToAccount),
          addressLabel: 'Home',
          items: cart.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || 'Could not create order.');
        setCreatingOrder(false);
        return;
      }

      if (currentUser && saveAddressToAccount && idToken) {
        fetch('/api/account/profile', {
          headers: { Authorization: `Bearer ${idToken}` },
        })
          .then((r) => r.json())
          .then((prof) => {
            if (prof.addresses) setSavedAddresses(prof.addresses);
          })
          .catch(() => {});
      }

      setRazorpayModalConfig({
        orderNumber: data.order.orderNumber,
        customerName: data.order.customerName,
        customerPhone: data.order.customerPhone,
        keyId: data.razorpayConfig.keyId,
        razorpayOrderId: data.razorpayConfig.razorpayOrderId,
        amountInr: data.razorpayConfig.amountInr,
        testCredentials: data.razorpayConfig.testCredentials,
      });
    } catch (err: any) {
      setCheckoutError(err.message || 'Network error creating order.');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  const renderProductCard = (product: ProductDto) => {
    const selectedVarId = cardVariantSelection[product.id];
    const activeVariant =
      product.variants.find((v) => v.id === selectedVarId) || product.variants[0];
    const isIngredientsOpen = hoveredProductId === product.id;

    return (
      <article
        key={product.id}
        className="bg-white rounded-2xl border border-[#FED7AA] flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md relative"
      >
        <div>
          {/* Clickable Imagery Header */}
          <button
            type="button"
            onClick={() => setDetailProduct(product)}
            className="w-full text-left block focus:outline-none rounded-t-2xl overflow-hidden"
          >
            <SpiceVisual
              name={product.name}
              hindiName={product.hindiName}
              category={product.category}
              colorHex={product.colorHex}
              accentHex={product.accentHex}
              imageUrl={product.imageUrl}
              packSize={activeVariant?.packSize || '100g'}
              className="w-full h-52 border-b border-[#FFEDD5]"
            />
          </button>

          <div className="p-5">
            {/* Unboxed Clean Metadata (Zero-Pill Discipline) */}
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#78716C] font-medium">
              <span className="truncate">{product.category}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{product.originRegion}</span>
            </div>

            {/* Product Name with Interactive Hover 'Ingredients' Popover */}
            <div
              className="relative mt-1 group"
              onMouseEnter={() => setHoveredProductId(product.id)}
              onMouseLeave={() =>
                setHoveredProductId((prev) => (prev === product.id ? null : prev))
              }
            >
              {/* Absolute-Positioned Ingredients Popover */}
              <div
                role="tooltip"
                data-testid={`ingredients-popover-${product.id}`}
                aria-hidden={!isIngredientsOpen}
                className={`absolute left-0 right-0 bottom-full mb-2.5 z-30 p-3 rounded-xl bg-white border border-[#EA580C] shadow-xl text-left transition-all duration-150 pointer-events-none ${
                  isIngredientsOpen
                    ? 'opacity-100 translate-y-0 visible'
                    : 'opacity-0 translate-y-1 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                    <span>Ingredients</span>
                  </span>
                  <span className="text-[10px] font-medium text-[#15803D]">100% Pure</span>
                </div>
                <p className="mt-1 text-xs text-[#1C1917] font-medium leading-snug">
                  {product.ingredients}
                </p>
                <div
                  aria-hidden="true"
                  className="w-2.5 h-2.5 bg-white border-r border-b border-[#EA580C] rotate-45 absolute -bottom-1.5 left-5"
                />
              </div>

              <button
                type="button"
                onClick={() => setDetailProduct(product)}
                onFocus={() => setHoveredProductId(product.id)}
                onBlur={() =>
                  setHoveredProductId((prev) => (prev === product.id ? null : prev))
                }
                className="text-left block w-full focus:outline-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#EA580C] font-semibold">{product.hindiName}</span>
                  <span className="text-[10px] text-[#78716C] group-hover:text-[#EA580C] transition-colors">
                    Ingredients ⓘ
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-[#1C1917] group-hover:text-[#EA580C] group-hover:underline decoration-[#EA580C]/40 decoration-dotted underline-offset-4 transition-colors line-clamp-1">
                  {product.name}
                </h3>
              </button>
            </div>

            <p className="mt-1.5 text-xs text-[#57534E] line-clamp-2 leading-relaxed">
              {product.shortDescription}
            </p>

            {/* Interactive Variant Pack Size Selector */}
            <div className="mt-4 flex items-center gap-1.5 p-1 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
              {product.variants.map((v) => {
                const isSelected = v.id === activeVariant?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      setCardVariantSelection((prev) => ({
                        ...prev,
                        [product.id]: v.id,
                      }))
                    }
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#EA580C] text-white shadow-xs'
                        : 'text-[#44403C] hover:text-[#EA580C]'
                    }`}
                  >
                    {v.packSize}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Price + Add to Cart Bar */}
        <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3 border-t border-[#FFF7ED]">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-xl font-bold text-[#EA580C]">
                ₹{activeVariant?.priceInr || 0}
              </span>
              {activeVariant && activeVariant.mrpInr > activeVariant.priceInr && (
                <span className="font-mono tabular-nums text-xs text-[#78716C] line-through">
                  ₹{activeVariant.mrpInr}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#15803D] font-semibold">
              {(activeVariant?.stockQty || 0) > 0
                ? `● In Stock · ${activeVariant?.packSize}`
                : 'Out of Stock'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDetailProduct(product)}
              className="px-3 py-2 rounded-xl border border-[#FED7AA] hover:bg-[#FFF7ED] text-xs font-semibold text-[#C2410C] transition-colors whitespace-nowrap shrink-0"
            >
              Details
            </button>
            <button
              type="button"
              disabled={!activeVariant || activeVariant.stockQty <= 0}
              onClick={() => activeVariant && handleAddToCart(product, activeVariant, 1)}
              className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-stone-300 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1C1917]">
      {/* TOP BAR CONTRACT: Strictly 1 row, 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-[#FED7AA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single Brand Wordmark (or uploaded logo) */}
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#EA580C] whitespace-nowrap shrink-0 text-left flex items-center gap-2"
          >
            {customLogoUrl ? (
              <img
                src={customLogoUrl}
                alt="SGM Masale"
                referrerPolicy="no-referrer"
                className="h-9 w-auto object-contain"
              />
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                <span>SGM Masale</span>
              </>
            )}
          </button>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#44403C]"
          >
            <button
              type="button"
              onClick={() => setActiveView('shop')}
              className={`hover:text-[#EA580C] transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'shop' ? 'text-[#EA580C] underline underline-offset-8 font-semibold' : ''
              }`}
            >
              Shop Spices
            </button>
            <button
              type="button"
              onClick={() => setActiveView('wholesale')}
              className={`hover:text-[#EA580C] transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'wholesale'
                  ? 'text-[#EA580C] underline underline-offset-8 font-semibold'
                  : ''
              }`}
            >
              Wholesale
            </button>
            <button
              type="button"
              onClick={() => setActiveView('my_orders')}
              className={`hover:text-[#EA580C] transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'my_orders'
                  ? 'text-[#EA580C] underline underline-offset-8 font-semibold'
                  : ''
              }`}
            >
              My Account
            </button>
            <button
              type="button"
              onClick={() => setActiveView('about')}
              className={`hover:text-[#EA580C] transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'about' ? 'text-[#EA580C] underline underline-offset-8 font-semibold' : ''
              }`}
            >
              Our Story
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className={`hover:text-[#EA580C] transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'admin' ? 'text-[#EA580C] underline underline-offset-8 font-semibold' : ''
              }`}
            >
              Admin
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveView('cart_checkout')}
              className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="font-mono tabular-nums">
                Cart ({totalCartItems}) · ₹{cartTotals.subtotalInr}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg border border-[#FED7AA] text-[#EA580C]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFF7ED] border-b border-[#FED7AA] px-4 py-3 flex flex-wrap gap-2">
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'shop', label: 'Shop All 48 Spices' },
                { id: 'wholesale', label: 'Wholesale B2B' },
                { id: 'my_orders', label: 'My Account & Orders' },
                { id: 'about', label: 'About & Policies' },
                { id: 'admin', label: 'Admin Console' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 rounded-lg bg-white border border-[#FED7AA] text-xs font-semibold text-[#EA580C]"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Subtle Toast Notification on Add to Cart */}
      {addedToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#15803D] text-white px-4 py-3 rounded-xl shadow-xl border border-white/20 flex items-center gap-3 text-xs font-semibold">
          <Check className="w-4 h-4 text-white" />
          <span>{addedToast}</span>
          <button
            type="button"
            onClick={() => setActiveView('cart_checkout')}
            className="text-[#FFEDD5] underline ml-2"
          >
            View Cart →
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1">
        {/* ==================== 1. HOME VIEW ==================== */}
        {activeView === 'home' && (
          <div className="space-y-16 pb-16">
            {/* Section 1: Storefront Split Hero */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-7 bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-6 sm:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#EA580C]">
                      <span className="text-[#15803D]">● Pure & Freshly Milled</span>
                      <span aria-hidden="true">·</span>
                      <span>48 Spice Varieties</span>
                      <span aria-hidden="true">·</span>
                      <span>Retail & Wholesale</span>
                    </div>

                    <h1 className="mt-4 font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] leading-[1.12] text-balance">
                      Pure, Freshly Milled Indian Masalas for Every Kitchen.
                    </h1>

                    <p className="mt-4 text-sm sm:text-base text-[#44403C] max-w-xl leading-relaxed">
                      From single-origin Salem Haldi, Kashmiri Lal Mirch, and Unjha Jeera to
                      slow-roasted Kolhapuri Kanda Lasun and Shahi Garam Masala. Hygienically packed
                      in 100g, 250g, and 500g pouches with pan-India delivery.
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveView('shop')}
                        className="px-6 py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
                      >
                        <span>Shop All 48 Spices</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView('wholesale')}
                        className="px-5 py-3.5 rounded-xl bg-white hover:bg-[#FFF7ED] border border-[#FED7AA] text-[#15803D] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                      >
                        Wholesale & HoReCa Bulk Enquiry
                      </button>
                    </div>
                  </div>

                  {/* Quantitative Value Bar */}
                  <div className="mt-8 pt-6 border-t border-[#FED7AA] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="font-mono tabular-nums text-lg font-bold text-[#EA580C]">
                        48 Varieties
                      </div>
                      <div className="text-[#57534E]">Ground, Whole & Blended</div>
                    </div>
                    <div>
                      <div className="font-mono tabular-nums text-lg font-bold text-[#15803D]">
                        Free Shipping
                      </div>
                      <div className="text-[#57534E]">On retail orders ₹499+</div>
                    </div>
                    <div>
                      <div className="font-mono tabular-nums text-lg font-bold text-[#C2410C]">
                        5kg – 100kg+
                      </div>
                      <div className="text-[#57534E]">B2B Wholesale Slabs</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex">
                  <HeroSpiceShowcase onExploreClick={() => setActiveView('shop')} />
                </div>
              </div>
            </section>

            {/* Section 2: Featured Spices Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#EA580C] font-semibold">
                    Signature Selection · Clearly Labelled Sample Catalogue
                  </p>
                  <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
                    Bestselling SGM Masale Essentials
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('shop')}
                  className="text-sm font-semibold text-[#EA580C] hover:text-[#15803D] flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span>View Complete 48-Spice Catalogue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Category Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setActiveView('shop');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#FFF7ED] hover:bg-[#EA580C] hover:text-white text-xs font-semibold text-[#C2410C] border border-[#FED7AA] transition-colors whitespace-nowrap shrink-0"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loadingCatalogue ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="h-96 rounded-2xl bg-[#FFF7ED] animate-pulse border border-[#FED7AA]"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredProducts.map((product) => renderProductCard(product))}
                </div>
              )}
            </section>

            {/* Section 3: Craftsmanship & Wholesale B2B Banner */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-sm">
                <div className="lg:col-span-8 space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#FFEDD5] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
                    <span>For Kirana Stores, Supermarkets, Restaurants & Caterers</span>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-balance">
                    Partner with SGM Masale for Bulk & Wholesale Supply
                  </h2>
                  <p className="text-sm text-[#FFEDD5] max-w-2xl leading-relaxed">
                    Get factory-direct wholesale pricing across all 48 spice varieties with
                    configurable minimum order quantities (5 kg – 10 kg), GST tax invoicing, and
                    tier discounts up to 10% off on 100 kg+ dispatches.
                  </p>
                </div>
                <div className="lg:col-span-4 flex lg:justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveView('wholesale')}
                    className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#FFF7ED] text-[#EA580C] font-bold text-sm transition-colors whitespace-nowrap shrink-0 shadow-xs"
                  >
                    Open Wholesale Calculator →
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================== 2. SHOP ALL 48 SPICES VIEW ==================== */}
        {activeView === 'shop' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-[#EA580C]">
                  SGM Masale Catalogue · Sample Data Enabled (Editable in Admin)
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] mt-1">
                  Shop All {products.length} Indian Spice Varieties
                </h1>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-4 h-4 text-[#EA580C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    aria-label="Search spices"
                    placeholder="Search Haldi, Mirch, Garam Masala..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#FED7AA] text-xs"
                  />
                </div>

                <select
                  aria-label="Sort spices"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-[#FED7AA] text-xs font-semibold text-[#1C1917]"
                >
                  <option value="featured">Sort: Featured First</option>
                  <option value="price_asc">Price: Low to High (₹)</option>
                  <option value="price_desc">Price: High to Low (₹)</option>
                  <option value="name_asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#EA580C] text-white shadow-xs'
                        : 'bg-white border border-[#FED7AA] text-[#44403C] hover:border-[#EA580C] hover:text-[#EA580C]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#FED7AA] p-12 text-center space-y-3">
                <p className="font-serif text-lg font-bold text-[#1C1917]">
                  No spices matched &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All 48 Spices');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#EA580C] text-white text-xs font-semibold"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => renderProductCard(product))}
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. CART & CHECKOUT VIEW ==================== */}
        {activeView === 'cart_checkout' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] mb-6">
              Shopping Cart & Secure Razorpay Checkout
            </h1>

            {cart.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#FED7AA] p-12 text-center space-y-4">
                <ShoppingBag className="w-10 h-10 text-[#EA580C] mx-auto" />
                <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                  Your SGM Masale Cart is Empty
                </h2>
                <p className="text-xs text-[#57534E] max-w-md mx-auto">
                  Explore our 48 varieties of pure ground spices, whole aromatics, and regional
                  blends in 100g, 250g, and 500g packs.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('shop')}
                  className="px-6 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold"
                >
                  Browse All 48 Spices
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Cart Items & Free Shipping Meter */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Free Shipping Progress */}
                  <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-xs">
                    {cartTotals.amountForFreeShippingInr > 0 ? (
                      <span>
                        Add{' '}
                        <strong className="font-mono text-[#EA580C]">
                          ₹{cartTotals.amountForFreeShippingInr}
                        </strong>{' '}
                        more to unlock <strong>FREE All-India Shipping</strong> (Free on orders
                        ₹499+).
                      </span>
                    ) : (
                      <span className="text-[#15803D] font-semibold">
                        ✓ Your order qualifies for FREE Standard Shipping across India!
                      </span>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-[#FED7AA] divide-y divide-[#FFEDD5]">
                    {cart.map((item) => (
                      <div
                        key={item.variantId}
                        className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-[#EA580C] font-medium">{item.hindiName}</div>
                          <h3 className="font-serif font-bold text-base text-[#1C1917]">
                            {item.productName}
                          </h3>
                          <div className="text-xs text-[#57534E] font-mono tabular-nums mt-0.5">
                            Pack: <strong>{item.packSize}</strong> · SKU: {item.sku} · ₹
                            {item.unitPriceInr}/pack
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-[#FED7AA] rounded-xl bg-[#FFF7ED]">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${item.productName}`}
                              onClick={() => handleUpdateCartQty(item.variantId, item.quantity - 1)}
                              className="px-3 py-1.5 text-sm font-bold text-[#EA580C]"
                            >
                              −
                            </button>
                            <span className="px-3 py-1.5 font-mono tabular-nums text-xs font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${item.productName}`}
                              onClick={() => handleUpdateCartQty(item.variantId, item.quantity + 1)}
                              className="px-3 py-1.5 text-sm font-bold text-[#EA580C]"
                            >
                              +
                            </button>
                          </div>

                          <div className="w-20 text-right font-mono tabular-nums text-sm font-bold text-[#EA580C]">
                            ₹{item.unitPriceInr * item.quantity}
                          </div>

                          <button
                            type="button"
                            aria-label={`Remove ${item.productName} from cart`}
                            onClick={() => handleUpdateCartQty(item.variantId, 0)}
                            className="p-1.5 text-stone-400 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Delivery Address, PIN Check & Authoritative Order Summary */}
                <form
                  onSubmit={handleProceedToRazorpay}
                  className="lg:col-span-5 bg-white rounded-2xl border border-[#FED7AA] p-6 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#FFEDD5] pb-3">
                    <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                      Delivery Address & Payment
                    </h2>
                    {!currentUser && (
                      <button
                        type="button"
                        onClick={() => setActiveView('my_orders')}
                        className="text-xs font-semibold text-[#EA580C] underline"
                      >
                        Sign in for Saved Addresses
                      </button>
                    )}
                  </div>

                  {/* Saved Addresses Quick Selector for Signed-In Customers */}
                  {currentUser && savedAddresses.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#EA580C]">
                          Select a Saved Delivery Address:
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveView('my_orders')}
                          className="text-[11px] font-semibold text-[#15803D] underline"
                        >
                          Manage in My Account
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {savedAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => applySavedAddressToCheckout(addr)}
                            className="text-left p-2.5 rounded-lg bg-white hover:bg-[#FFF7ED] border border-[#FED7AA] transition-colors text-xs"
                          >
                            <div className="flex items-center justify-between font-semibold text-[#1C1917]">
                              <span>
                                {addr.label} · {addr.recipientName} ({addr.phone})
                              </span>
                              <span className="font-mono text-[#EA580C]">{addr.pinCode}</span>
                            </div>
                            <div className="text-[11px] text-[#57534E] truncate mt-0.5">
                              {addr.addressLine}, {addr.city}, {addr.state}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="chk-name"
                      className="block text-xs font-semibold text-[#292524] mb-1"
                    >
                      Full Name *
                    </label>
                    <input
                      id="chk-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Priya Deshpande"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="chk-phone"
                        className="block text-xs font-semibold text-[#292524] mb-1"
                      >
                        10-Digit Mobile Number *
                      </label>
                      <input
                        id="chk-phone"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="chk-pin"
                        className="block text-xs font-semibold text-[#292524] mb-1"
                      >
                        6-Digit Delivery PIN Code *
                      </label>
                      <input
                        id="chk-pin"
                        type="text"
                        required
                        maxLength={6}
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        placeholder="411001"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* Live PIN Serviceability Feedback */}
                  <div className="text-xs">
                    {pinValidation.valid ? (
                      <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>
                          Serviceable: <strong>{pinValidation.regionName}</strong> (Est.{' '}
                          {pinValidation.estimatedDays})
                        </span>
                      </div>
                    ) : (
                      <div className="text-[#C2410C]">{pinValidation.error}</div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="chk-address"
                      className="block text-xs font-semibold text-[#292524] mb-1"
                    >
                      House / Flat No., Building, Street & Landmark *
                    </label>
                    <input
                      id="chk-address"
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Flat 12, Shanti Nagar, Near City Hospital"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="chk-city"
                        className="block text-xs font-semibold text-[#292524] mb-1"
                      >
                        City / Town *
                      </label>
                      <input
                        id="chk-city"
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#FED7AA] text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="chk-state"
                        className="block text-xs font-semibold text-[#292524] mb-1"
                      >
                        State *
                      </label>
                      <input
                        id="chk-state"
                        type="text"
                        required
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#FED7AA] text-sm"
                      />
                    </div>
                  </div>

                  {currentUser && (
                    <label className="flex items-center gap-2 text-xs text-[#292524] cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={saveAddressToAccount}
                        onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                        className="rounded border-[#FED7AA] text-[#EA580C]"
                      />
                      <span>Save this delivery address to my SGM Masale account</span>
                    </label>
                  )}

                  {/* Bill Breakdown */}
                  <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] space-y-2 text-xs">
                    <div className="flex justify-between text-[#44403C]">
                      <span>Items Subtotal ({totalCartItems} packs):</span>
                      <span className="font-mono tabular-nums font-semibold">
                        ₹{cartTotals.subtotalInr}
                      </span>
                    </div>
                    {cartTotals.savingsInr > 0 && (
                      <div className="flex justify-between text-[#15803D]">
                        <span>Total Discount on MRP:</span>
                        <span className="font-mono tabular-nums font-semibold">
                          −₹{cartTotals.savingsInr}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#44403C]">
                      <span>Shipping Charges:</span>
                      <span className="font-mono tabular-nums font-semibold">
                        {cartTotals.shippingInr === 0 ? 'FREE (₹0)' : `₹${cartTotals.shippingInr}`}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#FED7AA] flex justify-between items-baseline text-sm">
                      <span className="font-bold text-[#1C1917]">Total Payable (INR):</span>
                      <span className="font-mono tabular-nums text-xl font-bold text-[#EA580C]">
                        ₹{cartTotals.totalInr}
                      </span>
                    </div>
                  </div>

                  {checkoutError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                      {checkoutError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={creatingOrder}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-stone-400 text-white font-semibold text-sm transition-colors"
                  >
                    {creatingOrder
                      ? 'Creating Server Order...'
                      : `Pay Securely via Razorpay (Test Mode) · ₹${cartTotals.totalInr}`}
                  </button>

                  <p className="text-[11px] text-[#78716C] text-center leading-relaxed">
                    Server creates an authoritative Razorpay order and verifies the HMAC-SHA256
                    signature before confirming payment.
                  </p>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. ORDER CONFIRMATION VIEW ==================== */}
        {activeView === 'order_confirmation' && confirmedOrder && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
            <div className="bg-white rounded-2xl border border-[#15803D] p-8 space-y-6 text-center">
              <PackageCheck className="w-14 h-14 text-[#15803D] mx-auto" />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-[#15803D] font-bold">
                  Server-Side Payment Signature Verified
                </p>
                <h1 className="font-serif text-3xl font-bold text-[#1C1917]">
                  Order Confirmed — {confirmedOrder.orderNumber}
                </h1>
                <p className="text-xs text-[#57534E] font-mono">
                  Razorpay Order: {confirmedOrder.razorpayOrderId} · Payment ID:{' '}
                  {confirmedOrder.razorpayPaymentId}
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Customer:</span>
                  <span className="font-semibold text-[#1C1917]">
                    {confirmedOrder.customerName} ({confirmedOrder.customerPhone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Delivery Address:</span>
                  <span className="font-semibold text-[#1C1917]">
                    {confirmedOrder.deliveryAddress}, {confirmedOrder.city}, {confirmedOrder.state}{' '}
                    — {confirmedOrder.pinCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Payment Status:</span>
                  <span className="font-mono font-bold text-[#15803D] uppercase">
                    {confirmedOrder.paymentStatus} (₹{confirmedOrder.totalInr})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Fulfilment Stage:</span>
                  <span className="font-mono font-bold text-[#EA580C] uppercase">
                    {confirmedOrder.fulfilmentStatus}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('my_orders')}
                  className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold"
                >
                  Track Order in My Account
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('shop')}
                  className="px-5 py-2.5 rounded-xl border border-[#FED7AA] text-xs font-semibold text-[#1C1917]"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 5. MY ACCOUNT, PAST ORDERS & SAVED ADDRESSES VIEW ==================== */}
        {activeView === 'my_orders' && (
          <MyAccountView
            authToken={idToken}
            currentUser={currentUser}
            savedAddresses={savedAddresses}
            onAuthSuccess={handleAccountAuthSuccess}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOut={handleAccountSignOut}
            onAddressesUpdated={(addrs) => setSavedAddresses(addrs)}
            onUseAddressInCheckout={(addr) => {
              applySavedAddressToCheckout(addr);
              setAddedToast(`Address "${addr.label}" applied to Checkout`);
              setTimeout(() => setAddedToast(null), 2200);
              setActiveView('cart_checkout');
            }}
            onShopNow={() => setActiveView('shop')}
          />
        )}

        {/* ==================== 6. WHOLESALE B2B VIEW ==================== */}
        {activeView === 'wholesale' && (
          <WholesaleView
            products={products}
            preselectedProduct={wholesalePreselect}
            idToken={idToken}
          />
        )}

        {/* ==================== 7. ADMIN DASHBOARD VIEW ==================== */}
        {activeView === 'admin' && (
          <AdminDashboardView
            initialProducts={products}
            onCatalogueUpdated={fetchCatalogue}
            customLogoUrl={customLogoUrl}
            onUpdateLogoUrl={setCustomLogoUrl}
          />
        )}

        {/* ==================== 8. INFO & GATEWAY COMPLIANCE PAGES ==================== */}
        {(['about', 'contact', 'shipping', 'returns', 'privacy', 'terms'] as const).includes(
          activeView as any
        ) && (
          <PolicyAndInfoViews
            page={activeView as InfoPageType}
            onNavigate={(p) => setActiveView(p)}
          />
        )}
      </main>

      {/* PRODUCT DETAILS MODAL */}
      <ProductDetailModal
        product={detailProduct}
        relatedProducts={
          detailProduct
            ? products.filter(
                (p) => p.category === detailProduct.category && p.id !== detailProduct.id
              )
            : []
        }
        onClose={() => setDetailProduct(null)}
        onSelectProduct={(p) => setDetailProduct(p)}
        onAddToCart={handleAddToCart}
        onGoToWholesale={(p) => {
          setWholesalePreselect(p);
          setActiveView('wholesale');
        }}
      />

      {/* RAZORPAY TEST MODE CHECKOUT MODAL */}
      <RazorpayCheckoutModal
        config={razorpayModalConfig}
        onClose={() => setRazorpayModalConfig(null)}
        onVerifiedSuccess={(verifiedOrder) => {
          setRazorpayModalConfig(null);
          setConfirmedOrder(verifiedOrder);
          setCart([]);
          fetchCatalogue();
          setActiveView('order_confirmation');
        }}
      />

      {/* FOOTER */}
      <footer className="bg-[#FFF7ED] text-[#44403C] border-t-2 border-[#EA580C] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
          <div className="md:col-span-4 space-y-3">
            <div className="font-serif text-xl font-bold text-[#EA580C] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
              <span>SGM Masale</span>
            </div>
            <p className="text-[#57534E] leading-relaxed">
              Authentic Indian ground spices, whole aromatics, and regional blended masalas across
              48 varieties. Built for retail households and wholesale B2B buyers across India.
            </p>
            <div className="pt-2 flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <span className="text-[#15803D] font-semibold">
                    Signed in: {currentUser.email} ({dbUserRole})
                  </span>
                  <button
                    type="button"
                    onClick={handleAccountSignOut}
                    className="px-2.5 py-1 rounded bg-white border border-[#FED7AA] hover:bg-[#FFEDD5] text-[#EA580C] font-semibold inline-flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" /> Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveView('my_orders')}
                  className="px-3.5 py-2 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-white" /> My Account / Sign In
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="font-semibold uppercase tracking-wider text-[#EA580C]">
              Store & Wholesale
            </div>
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('shop')}
                  className="hover:text-[#EA580C]"
                >
                  Shop All 48 Spices
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('wholesale')}
                  className="hover:text-[#EA580C]"
                >
                  Wholesale & Bulk B2B Enquiry
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('my_orders')}
                  className="hover:text-[#EA580C]"
                >
                  My Account & Saved Addresses
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('admin')}
                  className="hover:text-[#EA580C]"
                >
                  Admin Dashboard & Live Guide
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="font-semibold uppercase tracking-wider text-[#EA580C]">
              Customer Care & Policies
            </div>
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('about')}
                  className="hover:text-[#EA580C]"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('contact')}
                  className="hover:text-[#EA580C]"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('shipping')}
                  className="hover:text-[#EA580C]"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('returns')}
                  className="hover:text-[#EA580C]"
                >
                  Returns & Refunds
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('privacy')}
                  className="hover:text-[#EA580C]"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('terms')}
                  className="hover:text-[#EA580C]"
                >
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="font-semibold uppercase tracking-wider text-[#15803D]">
              ● Gateway Status
            </div>
            <p className="text-[#57534E] leading-relaxed">
              Razorpay Test Mode active. All prices in INR (₹). Server-verified HMAC-SHA256
              signatures.
            </p>
          </div>
        </div>

        <div className="border-t border-[#FED7AA] py-4 text-center text-[11px] text-[#78716C]">
          © {new Date().getFullYear()} SGM Masale. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
