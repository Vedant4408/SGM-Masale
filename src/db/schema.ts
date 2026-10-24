import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').default(''),
  phone: text('phone').default(''),
  passwordHash: text('password_hash').notNull().default(''),
  resetTokenHash: text('reset_token_hash').notNull().default(''),
  resetTokenExpiresAt: timestamp('reset_token_expires_at'),
  role: text('role').notNull().default('customer'), // 'customer' | 'admin'
  createdAt: timestamp('created_at').defaultNow(),
});

export const customerAddresses = pgTable('customer_addresses', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  label: text('label').notNull().default('Home'), // 'Home' | 'Work / Office' | 'Shop / Godown' | 'Other'
  recipientName: text('recipient_name').notNull(),
  phone: text('phone').notNull(),
  addressLine: text('address_line').notNull(),
  landmark: text('landmark').notNull().default(''),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pinCode: text('pin_code').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  hindiName: text('hindi_name').notNull().default(''),
  category: text('category').notNull(), // 'Pure Ground Spices' | 'Signature Blended Masalas' | 'Whole Spices & Aromatics' | 'Regional & Specialty Blends'
  shortDescription: text('short_description').notNull(),
  description: text('description').notNull(),
  ingredients: text('ingredients').notNull(),
  storageInstructions: text('storage_instructions').notNull(),
  originRegion: text('origin_region').notNull().default('India'),
  heatLevel: text('heat_level').notNull().default('Medium'), // 'Mild' | 'Medium' | 'Hot' | 'Aromatic'
  colorHex: text('color_hex').notNull().default('#6B1D1D'),
  accentHex: text('accent_hex').notNull().default('#E09F1F'),
  imageUrl: text('image_url').notNull().default(''),
  isSampleData: boolean('is_sample_data').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  wholesaleMinQtyKg: integer('wholesale_min_qty_kg').notNull().default(10),
  wholesalePricePerKg: integer('wholesale_price_per_kg').notNull().default(420),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  packSize: text('pack_size').notNull(), // '50g' | '100g' | '250g' | '500g' | '1kg'
  weightGrams: integer('weight_grams').notNull(),
  sku: text('sku').notNull().unique(),
  priceInr: integer('price_inr').notNull(),
  mrpInr: integer('mrp_inr').notNull(),
  stockQty: integer('stock_qty').notNull().default(50),
  isActive: boolean('is_active').notNull().default(true),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userUid: text('user_uid').default(''),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').notNull().default(''),
  deliveryAddress: text('delivery_address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pinCode: text('pin_code').notNull(),
  subtotalInr: integer('subtotal_inr').notNull(),
  shippingInr: integer('shipping_inr').notNull(),
  totalInr: integer('total_inr').notNull(),
  paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
  fulfilmentStatus: text('fulfilment_status').notNull().default('placed'), // 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
  razorpayOrderId: text('razorpay_order_id').notNull().default(''),
  razorpayPaymentId: text('razorpay_payment_id').notNull().default(''),
  cancellationReason: text('cancellation_reason').notNull().default(''),
  refundAmountInr: integer('refund_amount_inr').notNull().default(0),
  isNewNotification: boolean('is_new_notification').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id').notNull(),
  variantId: integer('variant_id').notNull(),
  productName: text('product_name').notNull(),
  packSize: text('pack_size').notNull(),
  sku: text('sku').notNull(),
  unitPriceInr: integer('unit_price_inr').notNull(),
  quantity: integer('quantity').notNull(),
  lineTotalInr: integer('line_total_inr').notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  razorpayOrderId: text('razorpay_order_id').notNull(),
  razorpayPaymentId: text('razorpay_payment_id').notNull().default(''),
  razorpaySignature: text('razorpay_signature').notNull().default(''),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  amountInr: integer('amount_inr').notNull(),
  currency: text('currency').notNull().default('INR'),
  status: text('status').notNull().default('created'), // 'created' | 'authorized' | 'captured' | 'failed' | 'refunded'
  method: text('method').notNull().default('razorpay_test'),
  verifiedBy: text('verified_by').notNull().default('server_order'), // 'server_order' | 'signature_verify' | 'webhook' | 'admin_refund'
  rawPayload: text('raw_payload').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const wholesaleEnquiries = pgTable('wholesale_enquiries', {
  id: serial('id').primaryKey(),
  enquiryNumber: text('enquiry_number').notNull().unique(),
  userUid: text('user_uid').default(''),
  businessName: text('business_name').notNull(),
  businessType: text('business_type').notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull().default(''),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pinCode: text('pin_code').notNull(),
  gstNumber: text('gst_number').notNull().default(''),
  itemsJson: text('items_json').notNull(), // JSON string of requested bulk items
  estimatedTotalInr: integer('estimated_total_inr').notNull(),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('new'), // 'new' | 'contacted' | 'quoted' | 'closed'
  createdAt: timestamp('created_at').defaultNow(),
});

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));
