'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Check, Package, ShieldCheck } from 'lucide-react';
import { SpiceVisual } from './SpiceVisual';

export interface ProductVariantDto {
  id: number;
  productId: number;
  packSize: string;
  weightGrams: number;
  sku: string;
  priceInr: number;
  mrpInr: number;
  stockQty: number;
  isActive: boolean;
}

export interface ProductDto {
  id: number;
  slug: string;
  name: string;
  hindiName: string;
  category: string;
  shortDescription: string;
  description: string;
  ingredients: string;
  storageInstructions: string;
  originRegion: string;
  heatLevel: string;
  colorHex: string;
  accentHex: string;
  imageUrl: string;
  isSampleData: boolean;
  isActive: boolean;
  isFeatured: boolean;
  wholesaleMinQtyKg: number;
  wholesalePricePerKg: number;
  variants: ProductVariantDto[];
}

interface ProductDetailModalProps {
  product: ProductDto | null;
  relatedProducts: ProductDto[];
  onClose: () => void;
  onSelectProduct: (product: ProductDto) => void;
  onAddToCart: (product: ProductDto, variant: ProductVariantDto, quantity: number) => void;
  onGoToWholesale: (product: ProductDto) => void;
}

export function ProductDetailModal({
  product,
  relatedProducts,
  onClose,
  onSelectProduct,
  onAddToCart,
  onGoToWholesale,
}: ProductDetailModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  if (!product) return null;

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const handleAdd = () => {
    if (!activeVariant) return;
    onAddToCart(product, activeVariant, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
    >
      <div className="bg-white border border-[#FED7AA] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl my-8">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#FED7AA] bg-[#FFF7ED]">
          <div className="flex items-center gap-2 text-xs text-[#EA580C] font-medium">
            <span>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span>Origin: {product.originRegion}</span>
            {product.isSampleData && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#C2410C] font-semibold">Sample Catalogue Data</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="p-2 rounded-lg text-[#EA580C] hover:bg-[#FFEDD5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contiguous Purchase Module (Gallery Left, Purchase Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 sm:p-8">
          <div className="md:col-span-5 flex flex-col gap-4">
            <SpiceVisual
              name={product.name}
              hindiName={product.hindiName}
              category={product.category}
              colorHex={product.colorHex}
              accentHex={product.accentHex}
              imageUrl={product.imageUrl}
              packSize={activeVariant?.packSize || '250g'}
              className="w-full h-72 rounded-xl border border-[#FED7AA]"
            />

            <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-xs text-[#44403C] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1C1917]">Wholesale Bulk Rate:</span>
                <span className="font-mono tabular-nums font-semibold text-[#15803D]">
                  ₹{product.wholesalePricePerKg}/kg (Min {product.wholesaleMinQtyKg} kg)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToWholesale(product);
                }}
                className="text-xs font-semibold text-[#EA580C] underline underline-offset-4 hover:text-[#15803D] transition-colors"
              >
                Request Wholesale / HoReCa Quote for this spice →
              </button>
            </div>
          </div>

          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-[#EA580C]">{product.hindiName}</p>
              <h2
                id="pdp-modal-title"
                className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]"
              >
                {product.name}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                <span>Heat Profile: {product.heatLevel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">SKU: {activeVariant?.sku}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    (activeVariant?.stockQty || 0) > 0
                      ? 'text-[#15803D] font-semibold'
                      : 'text-red-700 font-semibold'
                  }
                >
                  {(activeVariant?.stockQty || 0) > 0
                    ? `● In Stock (${activeVariant?.stockQty} packs)`
                    : 'Out of Stock'}
                </span>
              </div>

              {/* Authoritative Price Display */}
              {activeVariant && (
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="font-mono tabular-nums text-3xl font-bold text-[#EA580C]">
                    ₹{activeVariant.priceInr}
                  </span>
                  {activeVariant.mrpInr > activeVariant.priceInr && (
                    <>
                      <span className="font-mono tabular-nums text-base text-[#78716C] line-through">
                        MRP ₹{activeVariant.mrpInr}
                      </span>
                      <span className="text-xs font-semibold text-[#15803D]">
                        Save ₹{activeVariant.mrpInr - activeVariant.priceInr}
                      </span>
                    </>
                  )}
                  <span className="text-xs text-[#78716C]">(Incl. of all taxes)</span>
                </div>
              )}

              {/* Pack Size Variant Selector */}
              <div className="mt-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403C] mb-2">
                  Select Pack Size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {product.variants.map((variant) => {
                    const isSelected = variant.id === activeVariant?.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#EA580C] bg-[#EA580C] text-white'
                            : 'border-[#FED7AA] bg-white text-[#1C1917] hover:border-[#EA580C]'
                        }`}
                      >
                        <div className="text-sm font-bold">{variant.packSize}</div>
                        <div
                          className={`font-mono tabular-nums text-xs mt-0.5 ${
                            isSelected ? 'text-[#FFF7ED]' : 'text-[#EA580C] font-semibold'
                          }`}
                        >
                          ₹{variant.priceInr}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity + Add to Cart CTA */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center border border-[#FED7AA] rounded-xl bg-white">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-2.5 text-sm font-bold text-[#EA580C] hover:bg-[#FFF7ED] rounded-l-xl"
                  >
                    −
                  </button>
                  <span className="px-4 py-2.5 font-mono tabular-nums text-sm font-semibold text-[#1C1917]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() =>
                      setQuantity((q) => Math.min(activeVariant?.stockQty || 20, q + 1))
                    }
                    className="px-3.5 py-2.5 text-sm font-bold text-[#EA580C] hover:bg-[#FFF7ED] rounded-r-xl"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!activeVariant || activeVariant.stockQty <= 0}
                  onClick={handleAdd}
                  className="flex-1 min-w-[200px] py-3 px-6 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-stone-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Added to Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-white" />
                      <span>
                        Add to Cart · ₹{(activeVariant?.priceInr || 0) * quantity}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Product Details, Ingredients & Storage Instructions */}
              <div className="mt-6 pt-5 border-t border-[#FED7AA] space-y-4 text-sm text-[#44403C]">
                <p className="leading-relaxed">{product.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FFF7ED] p-4 rounded-xl border border-[#FED7AA]">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                      Ingredients
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#292524]">
                      {product.ingredients}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#15803D]">
                      Storage Instructions
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#292524]">
                      {product.storageInstructions}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#FED7AA] flex flex-wrap items-center gap-6 text-xs text-[#57534E]">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#15803D]" />
                Free Shipping on orders ₹499+
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                Hygienically Packed · Batch Tracked
              </span>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="px-6 sm:px-8 py-6 bg-[#FFF7ED] border-t border-[#FED7AA]">
            <h3 className="font-serif text-lg font-bold text-[#1C1917] mb-4">
              Related Spices in {product.category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedProducts.slice(0, 3).map((rel) => {
                const v = rel.variants[0];
                return (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(null);
                      setQuantity(1);
                      onSelectProduct(rel);
                    }}
                    className="p-3 rounded-xl bg-white border border-[#FED7AA] hover:border-[#EA580C] text-left transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-[#EA580C] truncate">{rel.hindiName}</div>
                      <div className="text-sm font-semibold text-[#1C1917] truncate">
                        {rel.name}
                      </div>
                      {v && (
                        <div className="font-mono tabular-nums text-xs text-[#15803D] font-semibold mt-0.5">
                          {v.packSize} · ₹{v.priceInr}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#EA580C] shrink-0">View →</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
