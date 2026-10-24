import { NextRequest, NextResponse } from 'next/server';
import {
  deleteProductById,
  importProductsFromCsvRows,
  toggleProductActiveStatus,
  upsertAdminProduct,
} from '../../../../src/db/repository.ts';
import { parseProductsCsv } from '../../../../src/lib/commerce-rules.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'upsert';

    if (action === 'toggle_active') {
      await toggleProductActiveStatus(Number(body.productId), Boolean(body.isActive));
      return NextResponse.json({ status: 'ok' });
    }

    if (action === 'delete') {
      await deleteProductById(Number(body.productId));
      return NextResponse.json({ status: 'ok' });
    }

    if (action === 'import_csv') {
      const csvText = String(body.csvText || '');
      const parsed = parseProductsCsv(csvText);
      if (parsed.rows.length === 0) {
        return NextResponse.json(
          { error: parsed.errors.join(' ') || 'No valid rows found in CSV.' },
          { status: 400 }
        );
      }
      const res = await importProductsFromCsvRows(parsed.rows);
      return NextResponse.json({
        status: 'ok',
        importedCount: res.importedCount,
        warnings: parsed.errors,
      });
    }

    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: 'Product name and category are required.' },
        { status: 400 }
      );
    }

    const saved = await upsertAdminProduct(body);
    return NextResponse.json({ status: 'ok', productId: saved.productId });
  } catch (error: any) {
    console.error('Error in POST /api/admin/products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save admin product operation.' },
      { status: 400 }
    );
  }
}
