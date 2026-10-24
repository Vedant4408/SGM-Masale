export interface CartCalculationItem {
  variantId: number;
  unitPriceInr: number;
  mrpInr?: number;
  quantity: number;
}

export interface CartTotals {
  subtotalInr: number;
  mrpTotalInr: number;
  savingsInr: number;
  shippingInr: number;
  totalInr: number;
  freeShippingThresholdInr: number;
  amountForFreeShippingInr: number;
}

export const FREE_SHIPPING_THRESHOLD_INR = 499;
export const STANDARD_SHIPPING_INR = 60;

/**
 * Authoritative server- and client-side cart subtotal, shipping, and total calculation.
 */
export function calculateCartTotals(items: CartCalculationItem[]): CartTotals {
  const validItems = items.filter((item) => item.quantity > 0 && item.unitPriceInr >= 0);

  const subtotalInr = validItems.reduce(
    (sum, item) => sum + Math.round(item.unitPriceInr) * Math.floor(item.quantity),
    0
  );

  const mrpTotalInr = validItems.reduce(
    (sum, item) => sum + Math.round(item.mrpInr ?? item.unitPriceInr) * Math.floor(item.quantity),
    0
  );

  const savingsInr = Math.max(0, mrpTotalInr - subtotalInr);

  const shippingInr =
    subtotalInr === 0
      ? 0
      : subtotalInr >= FREE_SHIPPING_THRESHOLD_INR
        ? 0
        : STANDARD_SHIPPING_INR;

  const totalInr = subtotalInr + shippingInr;
  const amountForFreeShippingInr = Math.max(0, FREE_SHIPPING_THRESHOLD_INR - subtotalInr);

  return {
    subtotalInr,
    mrpTotalInr,
    savingsInr,
    shippingInr,
    totalInr,
    freeShippingThresholdInr: FREE_SHIPPING_THRESHOLD_INR,
    amountForFreeShippingInr,
  };
}

/**
 * Validates a 6-digit Indian Postal Index Number (PIN code) and returns region metadata.
 */
export function validateIndianPinCode(pin: string): {
  valid: boolean;
  cleanPin: string;
  regionName: string;
  estimatedDays: string;
  error?: string;
} {
  const cleanPin = (pin || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return {
      valid: false,
      cleanPin,
      regionName: '',
      estimatedDays: '',
      error: 'Enter a valid 6-digit Indian PIN code (cannot start with 0).',
    };
  }

  const firstDigit = cleanPin[0];
  const zoneMap: Record<string, { region: string; days: string }> = {
    '1': { region: 'North Zone (Delhi, Punjab, Haryana, HP, J&K)', days: '3–5 business days' },
    '2': { region: 'North-Central Zone (Uttar Pradesh, Uttarakhand)', days: '3–5 business days' },
    '3': { region: 'West Zone (Rajasthan, Gujarat, Daman & Diu)', days: '2–4 business days' },
    '4': { region: 'West-Central Zone (Maharashtra, Goa, MP, Chhattisgarh)', days: '2–3 business days' },
    '5': { region: 'South Zone (Telangana, Andhra Pradesh, Karnataka)', days: '3–4 business days' },
    '6': { region: 'South Zone (Tamil Nadu, Kerala, Lakshadweep)', days: '4–5 business days' },
    '7': { region: 'East & North-East Zone (West Bengal, Odisha, Assam, NE)', days: '4–6 business days' },
    '8': { region: 'East Zone (Bihar, Jharkhand)', days: '4–5 business days' },
    '9': { region: 'Army Postal Service (APS)', days: '5–7 business days' },
  };

  const zone = zoneMap[firstDigit] || { region: 'All India Delivery', days: '3–5 business days' };

  return {
    valid: true,
    cleanPin,
    regionName: zone.region,
    estimatedDays: zone.days,
  };
}

/**
 * Validates a 10-digit Indian mobile number.
 */
export function validateIndianPhone(phone: string): {
  valid: boolean;
  cleanPhone: string;
  error?: string;
} {
  const stripped = (phone || '').replace(/[\s\-+()]/g, '').replace(/^91/, '');
  if (!/^[6-9][0-9]{9}$/.test(stripped)) {
    return {
      valid: false,
      cleanPhone: stripped,
      error: 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
    };
  }
  return {
    valid: true,
    cleanPhone: stripped,
  };
}

export interface WholesaleQuoteInputItem {
  productId: number;
  productName: string;
  quantityKg: number;
  minQtyKg: number;
  baseWholesalePricePerKg: number;
}

export interface WholesaleQuoteResult {
  valid: boolean;
  errors: string[];
  totalWeightKg: number;
  discountPercent: number;
  subtotalInr: number;
  discountAmountInr: number;
  estimatedTotalInr: number;
  lineItems: Array<{
    productId: number;
    productName: string;
    quantityKg: number;
    minQtyKg: number;
    basePricePerKg: number;
    effectivePricePerKg: number;
    lineTotalInr: number;
  }>;
}

/**
 * Calculates wholesale B2B quote with minimum order quantity validation and volume tiers:
 * - 50kg to 99kg total order weight: 5% volume discount
 * - 100kg+ total order weight: 10% volume discount
 */
export function calculateWholesaleQuote(items: WholesaleQuoteInputItem[]): WholesaleQuoteResult {
  const errors: string[] = [];
  const activeItems = items.filter((i) => i.quantityKg > 0);

  if (activeItems.length === 0) {
    return {
      valid: false,
      errors: ['Select at least one spice variety and specify a bulk quantity in kg.'],
      totalWeightKg: 0,
      discountPercent: 0,
      subtotalInr: 0,
      discountAmountInr: 0,
      estimatedTotalInr: 0,
      lineItems: [],
    };
  }

  for (const item of activeItems) {
    if (item.quantityKg < item.minQtyKg) {
      errors.push(
        `${item.productName} requires a minimum wholesale quantity of ${item.minQtyKg} kg (requested ${item.quantityKg} kg).`
      );
    }
  }

  const totalWeightKg = activeItems.reduce((sum, item) => sum + item.quantityKg, 0);
  const discountPercent = totalWeightKg >= 100 ? 10 : totalWeightKg >= 50 ? 5 : 0;

  let subtotalInr = 0;
  let estimatedTotalInr = 0;

  const lineItems = activeItems.map((item) => {
    const baseLine = Math.round(item.baseWholesalePricePerKg * item.quantityKg);
    const effectivePricePerKg = Math.round(
      item.baseWholesalePricePerKg * (1 - discountPercent / 100)
    );
    const lineTotalInr = effectivePricePerKg * item.quantityKg;
    subtotalInr += baseLine;
    estimatedTotalInr += lineTotalInr;

    return {
      productId: item.productId,
      productName: item.productName,
      quantityKg: item.quantityKg,
      minQtyKg: item.minQtyKg,
      basePricePerKg: item.baseWholesalePricePerKg,
      effectivePricePerKg,
      lineTotalInr,
    };
  });

  return {
    valid: errors.length === 0,
    errors,
    totalWeightKg,
    discountPercent,
    subtotalInr,
    discountAmountInr: Math.max(0, subtotalInr - estimatedTotalInr),
    estimatedTotalInr,
    lineItems,
  };
}

export interface CsvProductImportRow {
  name: string;
  hindiName: string;
  category: string;
  shortDescription: string;
  ingredients: string;
  storageInstructions: string;
  originRegion: string;
  heatLevel: string;
  packSize100gPrice: number;
  packSize250gPrice: number;
  packSize500gPrice: number;
  stockQty: number;
  wholesaleMinQtyKg: number;
  wholesalePricePerKg: number;
}

/**
 * Parses CSV text for admin bulk product import.
 * Expected columns: name,hindiName,category,shortDescription,ingredients,storageInstructions,originRegion,heatLevel,price100g,price250g,price500g,stockQty,wholesaleMinQtyKg,wholesalePricePerKg
 */
export function parseProductsCsv(csvText: string): {
  rows: CsvProductImportRow[];
  errors: string[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ['CSV must include a header row and at least one product data row.'],
    };
  }

  const rows: CsvProductImportRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 11) {
      errors.push(`Row ${i + 1}: Expected at least 11 columns, found ${cols.length}.`);
      continue;
    }

    const name = cols[0]?.trim();
    const category = cols[2]?.trim() || 'Pure Ground Spices';
    const price100g = Number(cols[8]) || 65;
    const price250g = Number(cols[9]) || 150;
    const price500g = Number(cols[10]) || 285;

    if (!name) {
      errors.push(`Row ${i + 1}: Missing product name.`);
      continue;
    }

    rows.push({
      name,
      hindiName: cols[1]?.trim() || '',
      category,
      shortDescription: cols[3]?.trim() || `${name} — SGM Masale sample catalogue entry`,
      ingredients: cols[4]?.trim() || `100% Pure ${name}`,
      storageInstructions:
        cols[5]?.trim() || 'Store in a cool, dry, airtight container away from direct sunlight.',
      originRegion: cols[6]?.trim() || 'India',
      heatLevel: cols[7]?.trim() || 'Medium',
      packSize100gPrice: price100g,
      packSize250gPrice: price250g,
      packSize500gPrice: price500g,
      stockQty: Number(cols[11]) || 50,
      wholesaleMinQtyKg: Number(cols[12]) || 10,
      wholesalePricePerKg: Number(cols[13]) || Math.round(price500g * 1.7),
    });
  }

  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
