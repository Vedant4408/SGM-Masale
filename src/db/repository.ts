import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  customerAddresses,
  orders,
  orderItems,
  payments,
  products,
  productVariants,
  users,
  wholesaleEnquiries,
} from './schema.ts';
import { SAMPLE_48_SPICES } from '../lib/sample-catalogue.ts';
import {
  calculateCartTotals,
  CsvProductImportRow,
} from '../lib/commerce-rules.ts';
import {
  generateRazorpaySignature,
  verifyRazorpaySignature,
} from '../lib/razorpay-crypto.ts';
import {
  hashPassword,
  verifyPassword,
  createSignedSessionToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  canAccessUserResource,
} from '../lib/auth-crypto.ts';

const DEFAULT_ADMIN_EMAILS = ['jejurkarvedant44@gmail.com'];

function isEmailAdmin(email: string): boolean {
  const configured = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const allAdmins = new Set([...DEFAULT_ADMIN_EMAILS, ...configured]);
  return allAdmins.has(email.trim().toLowerCase());
}

export function getRazorpayTestSecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || 'sgm_razorpay_test_secret_key_2026';
}

export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || 'rzp_test_SGMMasaleDemoKey';
}

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const role = isEmailAdmin(email) ? 'admin' : 'customer';
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0] || 'Customer',
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          role,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

let seedPromise: Promise<void> | null = null;

export async function ensureCatalogueSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }
  seedPromise = (async () => {
    try {
      const existing = await db.select({ id: products.id }).from(products).limit(1);
      if (existing.length > 0) {
        return;
      }

      const insertedProducts = await db
        .insert(products)
        .values(
          SAMPLE_48_SPICES.map((item) => ({
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
          }))
        )
        .onConflictDoNothing()
        .returning();

      const slugToId = new Map(insertedProducts.map((p) => [p.slug, p.id]));
      const allVariantRows: Array<{
        productId: number;
        packSize: string;
        weightGrams: number;
        sku: string;
        priceInr: number;
        mrpInr: number;
        stockQty: number;
        isActive: boolean;
      }> = [];

      for (const item of SAMPLE_48_SPICES) {
        const pid = slugToId.get(item.slug);
        if (!pid) continue;
        for (const v of item.variants) {
          allVariantRows.push({
            productId: pid,
            packSize: v.packSize,
            weightGrams: v.weightGrams,
            sku: v.sku,
            priceInr: v.priceInr,
            mrpInr: v.mrpInr,
            stockQty: v.stockQty,
            isActive: true,
          });
        }
      }

      if (allVariantRows.length > 0) {
        await db.insert(productVariants).values(allVariantRows).onConflictDoNothing();
      }

      // Seed 1 sample order and 1 sample wholesale enquiry for immediate Admin & Order Lookup demonstration
      const existingOrders = await db.select({ id: orders.id }).from(orders).limit(1);
      if (existingOrders.length === 0) {
        const allProds = await db.select().from(products).limit(2);
        const allVars = await db.select().from(productVariants).limit(3);
        if (allProds.length >= 2 && allVars.length >= 2) {
          const v1 = allVars[0];
          const v2 = allVars[1];
          const sub = v1.priceInr * 2 + v2.priceInr;
          const ship = sub >= 499 ? 0 : 60;
          const tot = sub + ship;

          const sampleOrderRes = await db
            .insert(orders)
            .values({
              orderNumber: 'SGM-2026-1001',
              userUid: 'sample-demo-user',
              customerName: 'Aarav Kulkarni (Sample Order)',
              customerPhone: '9820112233',
              customerEmail: 'aarav.sample@example.com',
              deliveryAddress: 'Flat 402, Sahyadri Residency, Baner Road',
              city: 'Pune',
              state: 'Maharashtra',
              pinCode: '411045',
              subtotalInr: sub,
              shippingInr: ship,
              totalInr: tot,
              paymentStatus: 'paid',
              fulfilmentStatus: 'packed',
              razorpayOrderId: 'order_sample_SGM1001',
              razorpayPaymentId: 'pay_sample_SGM1001',
              isNewNotification: true,
            })
            .onConflictDoNothing()
            .returning();

          if (sampleOrderRes[0]) {
            await db.insert(orderItems).values([
              {
                orderId: sampleOrderRes[0].id,
                productId: allProds[0].id,
                variantId: v1.id,
                productName: allProds[0].name,
                packSize: v1.packSize,
                sku: v1.sku,
                unitPriceInr: v1.priceInr,
                quantity: 2,
                lineTotalInr: v1.priceInr * 2,
              },
              {
                orderId: sampleOrderRes[0].id,
                productId: allProds[0].id,
                variantId: v2.id,
                productName: allProds[0].name,
                packSize: v2.packSize,
                sku: v2.sku,
                unitPriceInr: v2.priceInr,
                quantity: 1,
                lineTotalInr: v2.priceInr,
              },
            ]);

            await db
              .insert(payments)
              .values({
                orderId: sampleOrderRes[0].id,
                razorpayOrderId: 'order_sample_SGM1001',
                razorpayPaymentId: 'pay_sample_SGM1001',
                razorpaySignature: 'sample_verified_hmac_signature',
                idempotencyKey: 'idem_sample_SGM1001',
                amountInr: tot,
                currency: 'INR',
                status: 'captured',
                method: 'razorpay_test',
                verifiedBy: 'signature_verify',
              })
              .onConflictDoNothing();
          }
        }

        await db
          .insert(wholesaleEnquiries)
          .values({
            enquiryNumber: 'SGM-WS-501',
            businessName: 'Annapurna Pure Veg Restaurant & Caterers (Sample)',
            businessType: 'Restaurant / Hotel / Caterer',
            contactName: 'Rajeshwar Deshmukh',
            phone: '9823044556',
            email: 'purchase@annapurnasample.in',
            city: 'Nagpur',
            state: 'Maharashtra',
            pinCode: '440010',
            gstNumber: '27AABCU9603R1ZM',
            itemsJson: JSON.stringify([
              {
                productId: 1,
                productName: 'Salem Haldi Powder (Turmeric)',
                quantityKg: 30,
                effectivePricePerKg: 423,
                lineTotalInr: 12690,
              },
              {
                productId: 2,
                productName: 'Kashmiri Lal Mirch Powder',
                quantityKg: 25,
                effectivePricePerKg: 694,
                lineTotalInr: 17350,
              },
            ]),
            estimatedTotalInr: 30040,
            notes: 'Monthly recurring hotel kitchen supply requirement in 5kg food-grade liners.',
            status: 'new',
          })
          .onConflictDoNothing();
      }
    } catch (error) {
      console.error('Error seeding initial SGM Masale catalogue:', error);
    } finally {
      seedPromise = null;
    }
  })();
  return seedPromise;
}

export async function getAllCatalogueProducts(includeInactive = false) {
  try {
    await ensureCatalogueSeeded();
    const allProducts = await db.select().from(products).orderBy(products.id);
    const allVariants = await db.select().from(productVariants).orderBy(productVariants.weightGrams);

    const variantsByProduct = new Map<number, typeof allVariants>();
    for (const v of allVariants) {
      if (!includeInactive && !v.isActive) continue;
      const list = variantsByProduct.get(v.productId) || [];
      list.push(v);
      variantsByProduct.set(v.productId, list);
    }

    return allProducts
      .filter((p) => (includeInactive ? true : p.isActive))
      .map((p) => ({
        ...p,
        variants: variantsByProduct.get(p.id) || [],
      }));
  } catch (error) {
    console.error('Database query failed in getAllCatalogueProducts:', error);
    throw new Error('Failed to load spice catalogue.', { cause: error });
  }
}

export interface CreateOrderInput {
  userUid?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  city: string;
  state: string;
  pinCode: string;
  items: Array<{ variantId: number; quantity: number }>;
}

/**
 * Creates an order using strictly authoritative database prices and stock levels.
 * Also initializes a server-side Razorpay order record in test/gateway mode.
 */
export async function createServerAuthoritativeOrder(input: CreateOrderInput) {
  try {
    await ensureCatalogueSeeded();

    const variantIds = input.items.map((i) => Number(i.variantId)).filter((id) => id > 0);
    if (variantIds.length === 0) {
      throw new Error('Cart is empty.');
    }

    const dbVariants = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));

    if (dbVariants.length === 0) {
      throw new Error('Selected product variants were not found.');
    }

    const prodIds = Array.from(new Set(dbVariants.map((v) => v.productId)));
    const dbProducts = await db.select().from(products).where(inArray(products.id, prodIds));
    const prodMap = new Map(dbProducts.map((p) => [p.id, p]));
    const varMap = new Map(dbVariants.map((v) => [v.id, v]));

    const verifiedItems: Array<{
      productId: number;
      variantId: number;
      productName: string;
      packSize: string;
      sku: string;
      unitPriceInr: number;
      mrpInr: number;
      quantity: number;
      lineTotalInr: number;
    }> = [];

    for (const reqItem of input.items) {
      const qty = Math.floor(Number(reqItem.quantity));
      if (qty <= 0) continue;
      const v = varMap.get(Number(reqItem.variantId));
      if (!v || !v.isActive) {
        throw new Error(`One of the selected spice pack sizes is currently unavailable.`);
      }
      const p = prodMap.get(v.productId);
      if (!p || !p.isActive) {
        throw new Error(`Product for SKU ${v.sku} is no longer active.`);
      }
      if (v.stockQty < qty) {
        throw new Error(
          `Insufficient stock for ${p.name} (${v.packSize}). Available: ${v.stockQty}.`
        );
      }
      verifiedItems.push({
        productId: p.id,
        variantId: v.id,
        productName: p.name,
        packSize: v.packSize,
        sku: v.sku,
        unitPriceInr: v.priceInr,
        mrpInr: v.mrpInr,
        quantity: qty,
        lineTotalInr: v.priceInr * qty,
      });
    }

    if (verifiedItems.length === 0) {
      throw new Error('No valid items in order.');
    }

    const totals = calculateCartTotals(
      verifiedItems.map((i) => ({
        variantId: i.variantId,
        unitPriceInr: i.unitPriceInr,
        mrpInr: i.mrpInr,
        quantity: i.quantity,
      }))
    );

    const timestampPart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(100 + Math.random() * 900);
    const orderNumber = `SGM-2026-${timestampPart}${randomPart}`;
    const razorpayOrderId = `order_SGM_${timestampPart}_${randomPart}`;

    const insertedOrders = await db
      .insert(orders)
      .values({
        orderNumber,
        userUid: input.userUid || '',
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        customerEmail: (input.customerEmail || '').trim(),
        deliveryAddress: input.deliveryAddress.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        pinCode: input.pinCode.trim(),
        subtotalInr: totals.subtotalInr,
        shippingInr: totals.shippingInr,
        totalInr: totals.totalInr,
        paymentStatus: 'pending',
        fulfilmentStatus: 'placed',
        razorpayOrderId,
        isNewNotification: true,
      })
      .returning();

    const createdOrder = insertedOrders[0];

    await db.insert(orderItems).values(
      verifiedItems.map((item) => ({
        orderId: createdOrder.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        packSize: item.packSize,
        sku: item.sku,
        unitPriceInr: item.unitPriceInr,
        quantity: item.quantity,
        lineTotalInr: item.lineTotalInr,
      }))
    );

    await db.insert(payments).values({
      orderId: createdOrder.id,
      razorpayOrderId,
      idempotencyKey: `init_${razorpayOrderId}`,
      amountInr: totals.totalInr,
      currency: 'INR',
      status: 'created',
      method: 'razorpay_test',
      verifiedBy: 'server_order',
    });

    // For Test Mode simulator convenience, pre-compute the test payment credentials on the server
    // so the interactive Razorpay Test Checkout modal can submit a cryptographically signed callback.
    const simulatedPaymentId = `pay_SGM_${timestampPart}_${randomPart}`;
    const simulatedSignature = generateRazorpaySignature(
      razorpayOrderId,
      simulatedPaymentId,
      getRazorpayTestSecret()
    );

    return {
      order: createdOrder,
      items: verifiedItems,
      razorpayConfig: {
        keyId: getRazorpayKeyId(),
        razorpayOrderId,
        amountPaise: totals.totalInr * 100,
        amountInr: totals.totalInr,
        currency: 'INR',
        mode: 'test',
        testCredentials: {
          razorpayPaymentId: simulatedPaymentId,
          razorpaySignature: simulatedSignature,
        },
      },
    };
  } catch (error: any) {
    console.error('Database query failed in createServerAuthoritativeOrder:', error);
    throw new Error(error.message || 'Failed to create order.', { cause: error });
  }
}

/**
 * Idempotent server-side payment verification & stock deduction.
 */
export async function verifyAndCapturePayment(params: {
  orderNumber: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  method?: string;
  verifiedBy?: 'signature_verify' | 'webhook';
}) {
  try {
    const secret = getRazorpayTestSecret();
    const isSignatureValid = verifyRazorpaySignature(
      params.razorpayOrderId,
      params.razorpayPaymentId,
      params.razorpaySignature,
      secret
    );

    if (!isSignatureValid) {
      throw new Error('Invalid Razorpay HMAC-SHA256 payment signature. Verification rejected.');
    }

    const foundOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, params.orderNumber));

    const order = foundOrders[0];
    if (!order) {
      throw new Error('Order not found.');
    }
    if (order.razorpayOrderId !== params.razorpayOrderId) {
      throw new Error('Razorpay Order ID mismatch for this order.');
    }

    // Idempotency check: if already paid with this paymentId, return existing order without double-deducting stock
    if (order.paymentStatus === 'paid') {
      return { order, alreadyProcessed: true };
    }

    const idempotencyKey = `capture_${params.razorpayOrderId}_${params.razorpayPaymentId}`;

    await db
      .insert(payments)
      .values({
        orderId: order.id,
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
        idempotencyKey,
        amountInr: order.totalInr,
        currency: 'INR',
        status: 'captured',
        method: params.method || 'upi_test',
        verifiedBy: params.verifiedBy || 'signature_verify',
      })
      .onConflictDoNothing();

    // Deduct stock for each order item
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const item of items) {
      const vRows = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId));
      const v = vRows[0];
      if (v) {
        const nextStock = Math.max(0, v.stockQty - item.quantity);
        await db
          .update(productVariants)
          .set({ stockQty: nextStock })
          .where(eq(productVariants.id, v.id));
      }
    }

    const updatedOrders = await db
      .update(orders)
      .set({
        paymentStatus: 'paid',
        razorpayPaymentId: params.razorpayPaymentId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();

    return { order: updatedOrders[0], alreadyProcessed: false };
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    throw new Error(error.message || 'Payment verification failed.', { cause: error });
  }
}

export async function getOrdersWithItems(filter?: {
  orderNumber?: string;
  phone?: string;
  userUid?: string;
  isAdmin?: boolean;
}) {
  try {
    await ensureCatalogueSeeded();
    const allOrders = await db.select().from(orders).orderBy(desc(orders.id));
    const filtered = allOrders.filter((o) => {
      if (filter?.isAdmin) return true;
      if (filter?.orderNumber && o.orderNumber.toLowerCase() === filter.orderNumber.toLowerCase()) {
        return true;
      }
      if (filter?.phone && o.customerPhone.includes(filter.phone.replace(/\D/g, '').slice(-10))) {
        return true;
      }
      if (filter?.userUid && filter.userUid.length > 0 && o.userUid === filter.userUid) {
        return true;
      }
      // Also include the sample demo order SGM-2026-1001 so visitors can inspect order tracking immediately
      if (o.orderNumber === 'SGM-2026-1001' && !filter?.orderNumber && !filter?.phone) {
        return true;
      }
      return false;
    });

    if (filtered.length === 0) return [];

    const orderIds = filtered.map((o) => o.id);
    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const itemsByOrder = new Map<number, typeof items>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) || [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return filtered.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || [],
    }));
  } catch (error) {
    console.error('Database query failed in getOrdersWithItems:', error);
    throw new Error('Failed to fetch orders.', { cause: error });
  }
}

export async function createWholesaleEnquiryRecord(input: {
  userUid?: string;
  businessName: string;
  businessType: string;
  contactName: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  pinCode: string;
  gstNumber?: string;
  itemsJson: string;
  estimatedTotalInr: number;
  notes?: string;
}) {
  try {
    const enquiryNumber = `SGM-WS-${Date.now().toString().slice(-5)}`;
    const inserted = await db
      .insert(wholesaleEnquiries)
      .values({
        enquiryNumber,
        userUid: input.userUid || '',
        businessName: input.businessName.trim(),
        businessType: input.businessType.trim(),
        contactName: input.contactName.trim(),
        phone: input.phone.trim(),
        email: (input.email || '').trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        pinCode: input.pinCode.trim(),
        gstNumber: (input.gstNumber || '').trim().toUpperCase(),
        itemsJson: input.itemsJson,
        estimatedTotalInr: input.estimatedTotalInr,
        notes: (input.notes || '').trim(),
        status: 'new',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createWholesaleEnquiryRecord:', error);
    throw new Error('Failed to submit wholesale enquiry.', { cause: error });
  }
}

export async function getAllWholesaleEnquiries() {
  try {
    await ensureCatalogueSeeded();
    return await db.select().from(wholesaleEnquiries).orderBy(desc(wholesaleEnquiries.id));
  } catch (error) {
    console.error('Database query failed in getAllWholesaleEnquiries:', error);
    throw new Error('Failed to load wholesale enquiries.', { cause: error });
  }
}

export async function upsertAdminProduct(input: {
  id?: number;
  name: string;
  hindiName: string;
  category: string;
  shortDescription: string;
  description?: string;
  ingredients: string;
  storageInstructions: string;
  originRegion: string;
  heatLevel: string;
  colorHex?: string;
  accentHex?: string;
  imageUrl?: string;
  isSampleData?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  wholesaleMinQtyKg: number;
  wholesalePricePerKg: number;
  variants: Array<{
    id?: number;
    packSize: string;
    weightGrams: number;
    sku: string;
    priceInr: number;
    mrpInr: number;
    stockQty: number;
    isActive?: boolean;
  }>;
}) {
  try {
    const slug = `${input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${input.id || Date.now().toString().slice(-4)}`;

    let productId = input.id;

    if (productId) {
      await db
        .update(products)
        .set({
          name: input.name.trim(),
          hindiName: input.hindiName.trim(),
          category: input.category,
          shortDescription: input.shortDescription.trim(),
          description: (input.description || input.shortDescription).trim(),
          ingredients: input.ingredients.trim(),
          storageInstructions: input.storageInstructions.trim(),
          originRegion: input.originRegion.trim(),
          heatLevel: input.heatLevel,
          colorHex: input.colorHex || '#6B1D1D',
          accentHex: input.accentHex || '#E09F1F',
          imageUrl: (input.imageUrl || '').trim(),
          isSampleData: input.isSampleData ?? false,
          isActive: input.isActive ?? true,
          isFeatured: input.isFeatured ?? false,
          wholesaleMinQtyKg: Number(input.wholesaleMinQtyKg) || 10,
          wholesalePricePerKg: Number(input.wholesalePricePerKg) || 400,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
    } else {
      const inserted = await db
        .insert(products)
        .values({
          slug,
          name: input.name.trim(),
          hindiName: input.hindiName.trim(),
          category: input.category,
          shortDescription: input.shortDescription.trim(),
          description: (input.description || input.shortDescription).trim(),
          ingredients: input.ingredients.trim(),
          storageInstructions: input.storageInstructions.trim(),
          originRegion: input.originRegion.trim(),
          heatLevel: input.heatLevel,
          colorHex: input.colorHex || '#6B1D1D',
          accentHex: input.accentHex || '#E09F1F',
          imageUrl: (input.imageUrl || '').trim(),
          isSampleData: input.isSampleData ?? false,
          isActive: input.isActive ?? true,
          isFeatured: input.isFeatured ?? false,
          wholesaleMinQtyKg: Number(input.wholesaleMinQtyKg) || 10,
          wholesalePricePerKg: Number(input.wholesalePricePerKg) || 400,
        })
        .returning();
      productId = inserted[0].id;
    }

    if (productId && input.variants && input.variants.length > 0) {
      for (const v of input.variants) {
        if (v.id) {
          await db
            .update(productVariants)
            .set({
              packSize: v.packSize,
              weightGrams: Number(v.weightGrams) || 100,
              sku: v.sku.trim(),
              priceInr: Number(v.priceInr),
              mrpInr: Number(v.mrpInr) || Number(v.priceInr),
              stockQty: Number(v.stockQty),
              isActive: v.isActive ?? true,
            })
            .where(eq(productVariants.id, v.id));
        } else {
          await db
            .insert(productVariants)
            .values({
              productId,
              packSize: v.packSize,
              weightGrams: Number(v.weightGrams) || 100,
              sku: v.sku.trim() || `SGM-${productId}-${v.packSize.toUpperCase()}`,
              priceInr: Number(v.priceInr),
              mrpInr: Number(v.mrpInr) || Math.round(Number(v.priceInr) * 1.15),
              stockQty: Number(v.stockQty),
              isActive: v.isActive ?? true,
            })
            .onConflictDoNothing();
        }
      }
    }

    return { productId };
  } catch (error) {
    console.error('Database query failed in upsertAdminProduct:', error);
    throw new Error('Failed to save product.', { cause: error });
  }
}

export async function toggleProductActiveStatus(productId: number, isActive: boolean) {
  try {
    await db
      .update(products)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(products.id, productId));
  } catch (error) {
    console.error('Database query failed in toggleProductActiveStatus:', error);
    throw new Error('Failed to update product status.', { cause: error });
  }
}

export async function deleteProductById(productId: number) {
  try {
    await db.delete(products).where(eq(products.id, productId));
  } catch (error) {
    console.error('Database query failed in deleteProductById:', error);
    throw new Error('Failed to delete product.', { cause: error });
  }
}

export async function importProductsFromCsvRows(rows: CsvProductImportRow[]) {
  try {
    let importedCount = 0;
    for (const row of rows) {
      const code = `CSV${Date.now().toString().slice(-4)}${importedCount}`;
      await upsertAdminProduct({
        name: row.name,
        hindiName: row.hindiName,
        category: row.category,
        shortDescription: row.shortDescription,
        description: row.shortDescription,
        ingredients: row.ingredients,
        storageInstructions: row.storageInstructions,
        originRegion: row.originRegion,
        heatLevel: row.heatLevel,
        isSampleData: false,
        isActive: true,
        isFeatured: false,
        wholesaleMinQtyKg: row.wholesaleMinQtyKg,
        wholesalePricePerKg: row.wholesalePricePerKg,
        variants: [
          {
            packSize: '100g',
            weightGrams: 100,
            sku: `SGM-${code}-100G`,
            priceInr: row.packSize100gPrice,
            mrpInr: Math.round(row.packSize100gPrice * 1.15),
            stockQty: row.stockQty,
          },
          {
            packSize: '250g',
            weightGrams: 250,
            sku: `SGM-${code}-250G`,
            priceInr: row.packSize250gPrice,
            mrpInr: Math.round(row.packSize250gPrice * 1.15),
            stockQty: row.stockQty,
          },
          {
            packSize: '500g',
            weightGrams: 500,
            sku: `SGM-${code}-500G`,
            priceInr: row.packSize500gPrice,
            mrpInr: Math.round(row.packSize500gPrice * 1.15),
            stockQty: row.stockQty,
          },
        ],
      });
      importedCount++;
    }
    return { importedCount };
  } catch (error) {
    console.error('Failed to import CSV rows:', error);
    throw new Error('Failed to import CSV products.', { cause: error });
  }
}

export async function updateAdminOrderStatus(params: {
  orderId: number;
  fulfilmentStatus?: string;
  paymentStatus?: string;
  cancellationReason?: string;
  refundAmountInr?: number;
  markNotificationRead?: boolean;
}) {
  try {
    const existingRows = await db.select().from(orders).where(eq(orders.id, params.orderId));
    const existing = existingRows[0];
    if (!existing) {
      throw new Error('Order not found.');
    }

    const nextPaymentStatus = params.paymentStatus || existing.paymentStatus;
    const nextFulfilmentStatus = params.fulfilmentStatus || existing.fulfilmentStatus;
    const nextRefund =
      params.refundAmountInr !== undefined ? Number(params.refundAmountInr) : existing.refundAmountInr;

    const updated = await db
      .update(orders)
      .set({
        paymentStatus: nextPaymentStatus,
        fulfilmentStatus: nextFulfilmentStatus,
        cancellationReason:
          params.cancellationReason !== undefined
            ? params.cancellationReason
            : existing.cancellationReason,
        refundAmountInr: nextRefund,
        isNewNotification:
          params.markNotificationRead !== undefined
            ? !params.markNotificationRead
            : existing.isNewNotification,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, params.orderId))
      .returning();

    if (params.paymentStatus === 'refunded' && nextRefund > 0) {
      await db
        .insert(payments)
        .values({
          orderId: existing.id,
          razorpayOrderId: existing.razorpayOrderId || `order_${existing.id}`,
          razorpayPaymentId: existing.razorpayPaymentId || `rfnd_${Date.now()}`,
          idempotencyKey: `refund_${existing.id}_${Date.now()}`,
          amountInr: nextRefund,
          currency: 'INR',
          status: 'refunded',
          method: 'razorpay_refund',
          verifiedBy: 'admin_refund',
        })
        .onConflictDoNothing();
    }

    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateAdminOrderStatus:', error);
    throw new Error('Failed to update order status.', { cause: error });
  }
}

export async function updateWholesaleEnquiryStatus(id: number, status: string) {
  try {
    const updated = await db
      .update(wholesaleEnquiries)
      .set({ status })
      .where(eq(wholesaleEnquiries.id, id))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateWholesaleEnquiryStatus:', error);
    throw new Error('Failed to update wholesale enquiry status.', { cause: error });
  }
}

function sanitizeUserRecord(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    uid: u.uid,
    email: u.email,
    name: u.name || '',
    phone: u.phone || '',
    role: u.role,
    createdAt: u.createdAt,
  };
}

/**
 * Registers a new customer account with scrypt password hashing and returns a signed session token.
 */
export async function registerCustomerAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0 && existing[0].passwordHash) {
      throw new Error('An account with this email address already exists. Please sign in.');
    }

    const passwordHash = hashPassword(input.password);
    const role = isEmailAdmin(cleanEmail) ? 'admin' : 'customer';
    const uid =
      existing[0]?.uid ||
      `sgm_usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    let savedUser: typeof users.$inferSelect;
    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({
          name: input.name.trim(),
          phone: input.phone.trim(),
          passwordHash,
          role,
        })
        .where(eq(users.uid, uid))
        .returning();
      savedUser = updated[0];
    } else {
      const inserted = await db
        .insert(users)
        .values({
          uid,
          email: cleanEmail,
          name: input.name.trim(),
          phone: input.phone.trim(),
          passwordHash,
          role,
        })
        .returning();
      savedUser = inserted[0];
    }

    // Automatically link any existing orders placed with the same phone or email to this user's uid
    const allOrders = await db.select().from(orders);
    for (const o of allOrders) {
      if (
        !o.userUid &&
        ((o.customerEmail && o.customerEmail.toLowerCase() === cleanEmail) ||
          (input.phone && o.customerPhone === input.phone.trim()))
      ) {
        await db.update(orders).set({ userUid: savedUser.uid }).where(eq(orders.id, o.id));
      }
    }

    const token = createSignedSessionToken({
      uid: savedUser.uid,
      email: savedUser.email,
      role: savedUser.role,
    });

    return {
      user: sanitizeUserRecord(savedUser),
      token,
    };
  } catch (error: any) {
    console.error('Error in registerCustomerAccount:', error);
    throw new Error(error.message || 'Failed to register customer account.', { cause: error });
  }
}

/**
 * Authenticates an existing customer via email + password and returns a signed session token.
 */
export async function loginCustomerAccount(input: { email: string; password: string }) {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    const userRecord = existing[0];

    if (!userRecord || !userRecord.passwordHash) {
      throw new Error('Invalid email or password. If you are new, please create an account first.');
    }

    const valid = verifyPassword(input.password, userRecord.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password.');
    }

    const token = createSignedSessionToken({
      uid: userRecord.uid,
      email: userRecord.email,
      role: userRecord.role,
    });

    return {
      user: sanitizeUserRecord(userRecord),
      token,
    };
  } catch (error: any) {
    console.error('Error in loginCustomerAccount:', error);
    throw new Error(error.message || 'Authentication failed.', { cause: error });
  }
}

/**
 * Generates a time-bound 6-character password reset code for an existing account.
 */
export async function requestCustomerPasswordReset(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    const userRecord = existing[0];
    if (!userRecord) {
      throw new Error('No registered account found with that email address.');
    }

    const { rawCode, tokenHash, expiresAt } = generatePasswordResetToken();
    await db
      .update(users)
      .set({
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: expiresAt,
      })
      .where(eq(users.id, userRecord.id));

    return {
      email: cleanEmail,
      // Returned in Test Mode so the customer/tester can complete the password reset immediately without external SMTP
      testResetCode: rawCode,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error in requestCustomerPasswordReset:', error);
    throw new Error(error.message || 'Failed to initiate password reset.', { cause: error });
  }
}

/**
 * Verifies the password reset code and sets a new scrypt-hashed password.
 */
export async function confirmCustomerPasswordReset(input: {
  email: string;
  resetCode: string;
  newPassword: string;
}) {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    const userRecord = existing[0];
    if (!userRecord) {
      throw new Error('Account not found.');
    }

    const isValidCode = verifyPasswordResetToken(
      input.resetCode,
      userRecord.resetTokenHash,
      userRecord.resetTokenExpiresAt
    );

    if (!isValidCode) {
      throw new Error('Invalid or expired password reset code. Please request a new code.');
    }

    const passwordHash = hashPassword(input.newPassword);
    const updated = await db
      .update(users)
      .set({
        passwordHash,
        resetTokenHash: '',
        resetTokenExpiresAt: null,
      })
      .where(eq(users.id, userRecord.id))
      .returning();

    const savedUser = updated[0];
    const token = createSignedSessionToken({
      uid: savedUser.uid,
      email: savedUser.email,
      role: savedUser.role,
    });

    return {
      user: sanitizeUserRecord(savedUser),
      token,
    };
  } catch (error: any) {
    console.error('Error in confirmCustomerPasswordReset:', error);
    throw new Error(error.message || 'Failed to reset password.', { cause: error });
  }
}

/**
 * Fetches the authenticated user's profile and saved addresses, strictly enforcing row-level ownership.
 */
export async function getCustomerAccountData(authenticatedUid: string) {
  try {
    if (!authenticatedUid) {
      throw new Error('Unauthorized: Missing user session.');
    }

    const userRows = await db.select().from(users).where(eq(users.uid, authenticatedUid));
    const userRecord = userRows[0];
    if (!userRecord) {
      throw new Error('Account profile not found.');
    }

    const addresses = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.userUid, authenticatedUid))
      .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.id));

    return {
      user: sanitizeUserRecord(userRecord),
      addresses,
    };
  } catch (error: any) {
    console.error('Error in getCustomerAccountData:', error);
    throw new Error(error.message || 'Failed to load account profile.', { cause: error });
  }
}

export async function updateCustomerProfileDetails(
  authenticatedUid: string,
  input: { name: string; phone: string }
) {
  try {
    const userRows = await db.select().from(users).where(eq(users.uid, authenticatedUid));
    const existing = userRows[0];
    if (!existing || !canAccessUserResource(authenticatedUid, existing.uid, existing.role)) {
      throw new Error('Forbidden: Cannot modify another customer profile.');
    }

    const updated = await db
      .update(users)
      .set({
        name: input.name.trim(),
        phone: input.phone.trim(),
      })
      .where(eq(users.uid, authenticatedUid))
      .returning();

    return sanitizeUserRecord(updated[0]);
  } catch (error: any) {
    console.error('Error in updateCustomerProfileDetails:', error);
    throw new Error(error.message || 'Failed to update profile.', { cause: error });
  }
}

/**
 * Creates or updates a saved address for the authenticated user, enforcing Row-Level Security.
 */
export async function upsertCustomerAddressRecord(
  authenticatedUid: string,
  input: {
    id?: number;
    label: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    landmark?: string;
    city: string;
    state: string;
    pinCode: string;
    isDefault?: boolean;
  }
) {
  try {
    if (!authenticatedUid) {
      throw new Error('Unauthorized: Please sign in to save addresses.');
    }

    const existingAddresses = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.userUid, authenticatedUid));

    const shouldBeDefault = Boolean(input.isDefault) || existingAddresses.length === 0;

    if (shouldBeDefault && existingAddresses.length > 0) {
      await db
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.userUid, authenticatedUid));
    }

    if (input.id) {
      const targetRows = await db
        .select()
        .from(customerAddresses)
        .where(eq(customerAddresses.id, Number(input.id)));
      const target = targetRows[0];
      if (!target || !canAccessUserResource(authenticatedUid, target.userUid)) {
        throw new Error('Forbidden: You can only edit your own saved addresses.');
      }

      const updated = await db
        .update(customerAddresses)
        .set({
          label: input.label.trim() || 'Home',
          recipientName: input.recipientName.trim(),
          phone: input.phone.trim(),
          addressLine: input.addressLine.trim(),
          landmark: (input.landmark || '').trim(),
          city: input.city.trim(),
          state: input.state.trim(),
          pinCode: input.pinCode.trim(),
          isDefault: shouldBeDefault,
        })
        .where(
          and(
            eq(customerAddresses.id, Number(input.id)),
            eq(customerAddresses.userUid, authenticatedUid)
          )
        )
        .returning();

      return updated[0];
    }

    const inserted = await db
      .insert(customerAddresses)
      .values({
        userUid: authenticatedUid,
        label: input.label.trim() || 'Home',
        recipientName: input.recipientName.trim(),
        phone: input.phone.trim(),
        addressLine: input.addressLine.trim(),
        landmark: (input.landmark || '').trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        pinCode: input.pinCode.trim(),
        isDefault: shouldBeDefault,
      })
      .returning();

    return inserted[0];
  } catch (error: any) {
    console.error('Error in upsertCustomerAddressRecord:', error);
    throw new Error(error.message || 'Failed to save delivery address.', { cause: error });
  }
}

/**
 * Deletes a saved address after verifying row-level ownership (`user_uid === authenticatedUid`).
 */
export async function deleteCustomerAddressRecord(authenticatedUid: string, addressId: number) {
  try {
    const targetRows = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.id, Number(addressId)));
    const target = targetRows[0];
    if (!target || !canAccessUserResource(authenticatedUid, target.userUid)) {
      throw new Error('Forbidden: You can only delete your own saved addresses.');
    }

    await db
      .delete(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, Number(addressId)),
          eq(customerAddresses.userUid, authenticatedUid)
        )
      );

    return { deletedId: addressId };
  } catch (error: any) {
    console.error('Error in deleteCustomerAddressRecord:', error);
    throw new Error(error.message || 'Failed to delete address.', { cause: error });
  }
}

