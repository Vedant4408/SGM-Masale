import { NextRequest, NextResponse } from 'next/server';
import { getAllCatalogueProducts } from '../../../src/db/repository.ts';

export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === '1';
    const catalogue = await getAllCatalogueProducts(includeInactive);
    return NextResponse.json({ products: catalogue });
  } catch (error: any) {
    console.error('Error in GET /api/catalogue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load catalogue' },
      { status: 500 }
    );
  }
}
