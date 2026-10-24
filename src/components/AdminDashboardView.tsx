'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Download,
  Upload,
  Bell,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { ProductDto } from './ProductDetailModal';

interface AdminDashboardViewProps {
  initialProducts: ProductDto[];
  onCatalogueUpdated: () => void;
  customLogoUrl: string;
  onUpdateLogoUrl: (url: string) => void;
}

export function AdminDashboardView({
  initialProducts,
  onCatalogueUpdated,
  customLogoUrl,
  onUpdateLogoUrl,
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<
    'products' | 'orders' | 'wholesale' | 'csv' | 'setup_cost'
  >('products');

  const [products, setProducts] = useState<ProductDto[]>(initialProducts);
  const [orders, setOrders] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Product Form Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // CSV Import State
  const [csvInput, setCsvInput] = useState(
    'name,hindiName,category,shortDescription,ingredients,storageInstructions,originRegion,heatLevel,price100g,price250g,price500g,stockQty,wholesaleMinQtyKg,wholesalePricePerKg\n"Byadgi Special Mirch Powder","ब्याडगी लाल मिर्च","Pure Ground Spices","[SAMPLE] Deep red Karnataka chilli powder","100% Byadgi Red Chilli","Store in an airtight container","Dharwad, Karnataka","Mild",88,205,390,65,10,660'
  );

  // Logo input state
  const [logoInput, setLogoInput] = useState(customLogoUrl);

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [prodRes, ordRes, wsRes] = await Promise.all([
        fetch('/api/catalogue?includeInactive=1'),
        fetch('/api/orders?admin=1'),
        fetch('/api/wholesale'),
      ]);
      const prodData = await prodRes.json();
      const ordData = await ordRes.json();
      const wsData = await wsRes.json();

      if (prodData.products) setProducts(prodData.products);
      if (ordData.orders) setOrders(ordData.orders);
      if (wsData.enquiries) setEnquiries(wsData.enquiries);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const newOrderNotifications = orders.filter((o) => o.isNewNotification);

  const handleOpenNewProduct = () => {
    const code = Math.floor(100 + Math.random() * 899);
    setEditingProduct({
      name: '',
      hindiName: '',
      category: 'Pure Ground Spices',
      shortDescription: '[SAMPLE] Custom spice variety added via SGM Admin',
      description: '',
      ingredients: '100% Pure Whole Spices',
      storageInstructions:
        'Store in a cool, dry place inside an airtight container away from sunlight.',
      originRegion: 'India',
      heatLevel: 'Medium',
      imageUrl: '',
      isSampleData: false,
      isActive: true,
      isFeatured: false,
      wholesaleMinQtyKg: 10,
      wholesalePricePerKg: 450,
      variants: [
        {
          packSize: '100g',
          weightGrams: 100,
          sku: `SGM-NEW${code}-100G`,
          priceInr: 75,
          mrpInr: 86,
          stockQty: 50,
        },
        {
          packSize: '250g',
          weightGrams: 250,
          sku: `SGM-NEW${code}-250G`,
          priceInr: 175,
          mrpInr: 200,
          stockQty: 40,
        },
        {
          packSize: '500g',
          weightGrams: 500,
          sku: `SGM-NEW${code}-500G`,
          priceInr: 330,
          mrpInr: 380,
          stockQty: 30,
        },
      ],
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          ...editingProduct,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusBanner(`Saved "${editingProduct.name}" successfully.`);
        setEditingProduct(null);
        await fetchAllAdminData();
        onCatalogueUpdated();
      } else {
        setStatusBanner(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusBanner(`Failed: ${err.message}`);
    }
  };

  const handleToggleProductActive = async (prod: ProductDto) => {
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_active',
        productId: prod.id,
        isActive: !prod.isActive,
      }),
    });
    setStatusBanner(
      `${prod.name} marked as ${!prod.isActive ? 'Active (Visible in Store)' : 'Deactivated (Hidden)'}.`
    );
    await fetchAllAdminData();
    onCatalogueUpdated();
  };

  const handleDeleteProduct = async (prod: ProductDto) => {
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        productId: prod.id,
      }),
    });
    setStatusBanner(`Deleted "${prod.name}".`);
    await fetchAllAdminData();
    onCatalogueUpdated();
  };

  const handleCsvImport = async () => {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'import_csv',
        csvText: csvInput,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatusBanner(`Successfully imported ${data.importedCount} product(s) from CSV.`);
      await fetchAllAdminData();
      onCatalogueUpdated();
      setActiveTab('products');
    } else {
      setStatusBanner(`CSV Import Error: ${data.error}`);
    }
  };

  const handleExportProductsCsv = () => {
    const headers = [
      'ID',
      'Name',
      'HindiName',
      'Category',
      'Origin',
      'HeatLevel',
      'Active',
      'SampleData',
      'SKU_100g',
      'Price_100g_INR',
      'Stock_100g',
      'WholesaleMinKg',
      'WholesalePricePerKg_INR',
    ];
    const rows = products.map((p) => {
      const v100 = p.variants[0];
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.hindiName.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.originRegion}"`,
        p.heatLevel,
        p.isActive,
        p.isSampleData,
        v100?.sku || '',
        v100?.priceInr || 0,
        v100?.stockQty || 0,
        p.wholesaleMinQtyKg,
        p.wholesalePricePerKg,
      ].join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sgm-masale-products-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOrdersCsv = () => {
    const headers = [
      'OrderNumber',
      'CustomerName',
      'Phone',
      'City',
      'State',
      'PinCode',
      'Subtotal_INR',
      'Shipping_INR',
      'Total_INR',
      'PaymentStatus',
      'FulfilmentStatus',
      'RazorpayOrderId',
      'RazorpayPaymentId',
      'RefundAmount_INR',
    ];
    const rows = orders.map((o) =>
      [
        o.orderNumber,
        `"${(o.customerName || '').replace(/"/g, '""')}"`,
        o.customerPhone,
        `"${o.city}"`,
        `"${o.state}"`,
        o.pinCode,
        o.subtotalInr,
        o.shippingInr,
        o.totalInr,
        o.paymentStatus,
        o.fulfilmentStatus,
        o.razorpayOrderId,
        o.razorpayPaymentId,
        o.refundAmountInr || 0,
      ].join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sgm-masale-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateOrder = async (
    orderId: number,
    updates: {
      fulfilmentStatus?: string;
      paymentStatus?: string;
      cancellationReason?: string;
      refundAmountInr?: number;
      markNotificationRead?: boolean;
    }
  ) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...updates }),
    });
    if (res.ok) {
      setStatusBanner(`Updated Order #${orderId}.`);
      await fetchAllAdminData();
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.hindiName.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header & Notifications Bar */}
      <div className="bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#FFF7ED] font-semibold">
            SGM Masale · Storefront & Inventory Operations
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
            Admin Management Console
          </h1>
          <p className="text-xs text-[#FFEDD5] mt-1">
            Manage all 48 spice varieties, pack sizes, stock, orders, refunds, CSV data, and live
            gateway readiness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {newOrderNotifications.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="px-4 py-2.5 rounded-xl bg-white text-[#EA580C] text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 shadow-xs"
            >
              <Bell className="w-4 h-4" />
              <span>{newOrderNotifications.length} New Order Alert(s)</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchAllAdminData}
            className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-[#15803D] text-white text-xs font-medium flex items-center justify-between">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-white underline ml-4 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
        {(
          [
            { id: 'products', label: `Products & Stock (${products.length})` },
            { id: 'orders', label: `Orders & Refunds (${orders.length})` },
            { id: 'wholesale', label: `Wholesale Enquiries (${enquiries.length})` },
            { id: 'csv', label: 'CSV Import / Export' },
            { id: 'setup_cost', label: 'Brand Logo, Costs & Live Setup Guide' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-[#EA580C] text-white shadow-xs'
                : 'text-[#44403C] hover:text-[#EA580C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PRODUCTS & STOCK */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#FED7AA]">
            <input
              type="search"
              placeholder="Search 48 varieties by name, Hindi name, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[240px] px-4 py-2.5 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportProductsCsv}
                className="px-4 py-2.5 rounded-xl border border-[#FED7AA] hover:bg-[#FFF7ED] text-xs font-semibold text-[#1C1917] flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4 text-[#EA580C]" /> Export Catalogue CSV
              </button>
              <button
                type="button"
                onClick={handleOpenNewProduct}
                className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" /> Add New Spice Variety
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#FED7AA] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFF7ED] text-[#44403C] border-b border-[#FED7AA]">
                    <th className="py-3.5 px-4 font-semibold">Spice Variety</th>
                    <th className="py-3.5 px-4 font-semibold">Category & Origin</th>
                    <th className="py-3.5 px-4 font-semibold">Pack Sizes & INR Prices</th>
                    <th className="py-3.5 px-4 font-semibold">Total Stock</th>
                    <th className="py-3.5 px-4 font-semibold">Wholesale (MOQ)</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFEDD5]">
                  {filteredProducts.map((prod) => {
                    const totalStock = prod.variants.reduce((s, v) => s + v.stockQty, 0);
                    return (
                      <tr key={prod.id} className="hover:bg-[#FFF7ED]/60">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#1C1917]">{prod.name}</div>
                          <div className="text-[11px] text-[#EA580C]">
                            {prod.hindiName}
                            {prod.isSampleData ? ' · [SAMPLE DATA]' : ' · [CUSTOM]'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#44403C]">
                          <div>{prod.category}</div>
                          <div className="text-[11px] text-[#78716C]">{prod.originRegion}</div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[#1C1917]">
                          {prod.variants.map((v) => `${v.packSize}: ₹${v.priceInr}`).join(' · ')}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums font-semibold">
                          <span className={totalStock > 20 ? 'text-[#15803D]' : 'text-amber-700'}>
                            {totalStock} packs
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[#44403C]">
                          ₹{prod.wholesalePricePerKg}/kg (Min {prod.wholesaleMinQtyKg}kg)
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              prod.isActive
                                ? 'text-[#15803D] font-semibold'
                                : 'text-stone-400 font-semibold'
                            }
                          >
                            {prod.isActive ? '● Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(JSON.parse(JSON.stringify(prod)))}
                            aria-label={`Edit ${prod.name}`}
                            className="p-1.5 rounded-lg border border-[#FED7AA] hover:bg-[#FFF7ED] text-[#EA580C]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(prod)}
                            aria-label={
                              prod.isActive ? `Deactivate ${prod.name}` : `Activate ${prod.name}`
                            }
                            className="p-1.5 rounded-lg border border-[#FED7AA] hover:bg-[#FFF7ED] text-[#44403C]"
                          >
                            {prod.isActive ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod)}
                            aria-label={`Delete ${prod.name}`}
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS, FULFILMENT & REFUNDS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#FED7AA]">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1C1917]">
                Customer Orders, Fulfilment & Refund Control
              </h2>
              <p className="text-xs text-[#57534E]">
                Update dispatch stages, acknowledge new-order alerts, or process cancellations and
                INR refunds.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportOrdersCsv}
              className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" /> Export Orders CSV
            </button>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#FED7AA] p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#FFEDD5] pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums text-base font-bold text-[#EA580C]">
                        {order.orderNumber}
                      </span>
                      {order.isNewNotification && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateOrder(order.id, { markNotificationRead: true })
                          }
                          className="text-xs font-semibold text-[#C2410C] underline"
                        >
                          New Order Alert — Click to Acknowledge
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-[#44403C] mt-1">
                      <strong>{order.customerName}</strong> · Phone: {order.customerPhone} · Deliver
                      to: {order.deliveryAddress}, {order.city}, {order.state} —{' '}
                      <span className="font-mono">{order.pinCode}</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#78716C] mt-0.5">
                      Razorpay Order: {order.razorpayOrderId || 'N/A'} · Payment ID:{' '}
                      {order.razorpayPaymentId || 'Pending'}
                    </div>
                  </div>

                  <div className="text-right font-mono tabular-nums">
                    <div className="text-lg font-bold text-[#1C1917]">₹{order.totalInr}</div>
                    <div className="text-xs text-[#57534E]">
                      Payment:{' '}
                      <strong
                        className={
                          order.paymentStatus === 'paid' ? 'text-[#15803D]' : 'text-[#EA580C]'
                        }
                      >
                        {order.paymentStatus.toUpperCase()}
                      </strong>{' '}
                      · Fulfilment: <strong>{order.fulfilmentStatus.toUpperCase()}</strong>
                    </div>
                    {order.refundAmountInr > 0 && (
                      <div className="text-xs text-red-700 font-semibold">
                        Refunded: ₹{order.refundAmountInr}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Line Items */}
                <div className="text-xs text-[#44403C] flex flex-wrap gap-4">
                  {(order.items || []).map((item: any) => (
                    <div
                      key={item.id}
                      className="px-3 py-1.5 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] font-mono tabular-nums"
                    >
                      {item.productName} ({item.packSize}) × {item.quantity} = ₹{item.lineTotalInr}
                    </div>
                  ))}
                </div>

                {/* Admin Fulfilment & Refund Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#44403C]">Fulfilment Stage:</span>
                    {(['placed', 'packed', 'shipped', 'delivered'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateOrder(order.id, { fulfilmentStatus: st })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                          order.fulfilmentStatus === st
                            ? 'bg-[#15803D] text-white'
                            : 'bg-[#FFF7ED] text-[#44403C] hover:bg-[#FFEDD5]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.fulfilmentStatus !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateOrder(order.id, {
                            fulfilmentStatus: 'cancelled',
                            cancellationReason: 'Cancelled by Admin Desk',
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold"
                      >
                        Cancel Order
                      </button>
                    )}
                    {order.paymentStatus === 'paid' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateOrder(order.id, {
                            paymentStatus: 'refunded',
                            fulfilmentStatus: 'cancelled',
                            refundAmountInr: order.totalInr,
                            cancellationReason: 'Full refund issued via Admin Console',
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold"
                      >
                        Issue Full Refund (₹{order.totalInr})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WHOLESALE ENQUIRIES */}
      {activeTab === 'wholesale' && (
        <div className="space-y-4">
          {enquiries.map((enq) => {
            let parsedItems: any[] = [];
            try {
              parsedItems = JSON.parse(enq.itemsJson || '[]');
            } catch {
              parsedItems = [];
            }
            return (
              <div
                key={enq.id}
                className="bg-white rounded-2xl border border-[#FED7AA] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="font-mono font-bold text-sm text-[#15803D]">
                      {enq.enquiryNumber}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                      {enq.businessName} ({enq.businessType})
                    </h3>
                    <p className="text-xs text-[#44403C]">
                      Contact: {enq.contactName} · Phone: {enq.phone} · Location: {enq.city},{' '}
                      {enq.state} ({enq.pinCode}) {enq.gstNumber ? `· GSTIN: ${enq.gstNumber}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono tabular-nums text-lg font-bold text-[#EA580C]">
                      Est. ₹{enq.estimatedTotalInr}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {(['new', 'contacted', 'quoted', 'closed'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={async () => {
                            await fetch('/api/admin/orders', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                type: 'wholesale_status',
                                id: enq.id,
                                status: st,
                              }),
                            });
                            await fetchAllAdminData();
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize ${
                            enq.status === st
                              ? 'bg-[#EA580C] text-white'
                              : 'bg-[#FFF7ED] text-[#44403C]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {parsedItems.map((it, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-[#FFF7ED] border border-[#FED7AA]"
                    >
                      {it.productName}: {it.quantityKg}kg @ ₹{it.effectivePricePerKg}/kg = ₹
                      {it.lineTotalInr}
                    </span>
                  ))}
                </div>
                {enq.notes && <p className="text-xs text-[#57534E]">Notes: {enq.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: CSV IMPORT / EXPORT */}
      {activeTab === 'csv' && (
        <div className="bg-white rounded-2xl border border-[#FED7AA] p-6 space-y-5">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#1C1917]">
              Bulk CSV Catalogue Import & Export
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              Paste CSV rows below to automatically create products along with their 100g, 250g, and
              500g pack variants.
            </p>
          </div>

          <textarea
            rows={6}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            className="w-full p-4 rounded-xl border border-[#FED7AA] font-mono text-xs bg-[#FFF7ED]"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCsvImport}
              className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Import CSV Rows into Database
            </button>
            <button
              type="button"
              onClick={handleExportProductsCsv}
              className="px-5 py-2.5 rounded-xl border border-[#FED7AA] hover:bg-[#FFF7ED] text-[#1C1917] text-xs font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#EA580C]" /> Download Full 48-Spice Catalogue CSV
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: LOGO, COST CONTROL & LIVE ACTIVATION GUIDE */}
      {activeTab === 'setup_cost' && (
        <div className="space-y-6">
          {/* Custom Logo Uploader / URL Setter */}
          <div className="bg-white rounded-2xl border border-[#FED7AA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#1C1917]">
              Brand Logo Replacement (Text Placeholder → Custom Logo)
            </h2>
            <p className="text-xs text-[#57534E]">
              Until you upload your official SGM Masale emblem, the storefront uses a heritage
              serif wordmark. Paste a public logo image URL below to replace it across the header.
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                type="url"
                placeholder="https://your-cdn.com/sgm-masale-logo.png (leave blank for heritage text wordmark)"
                value={logoInput}
                onChange={(e) => setLogoInput(e.target.value)}
                className="flex-1 min-w-[260px] px-4 py-2.5 rounded-xl border border-[#FED7AA] text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateLogoUrl(logoInput.trim());
                  setStatusBanner('Updated SGM Masale header brand mark.');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold"
              >
                Apply Brand Logo
              </button>
            </div>
          </div>

          {/* Cost Breakdown & Free-Plan Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#FED7AA] p-6 space-y-3">
              <h3 className="font-serif text-lg font-bold text-[#EA580C]">
                ₹0 Launch Budget & Free-Tier Limits
              </h3>
              <ul className="space-y-2.5 text-xs text-[#44403C] leading-relaxed">
                <li>
                  <strong>Database (PostgreSQL / Supabase Free Tier):</strong> ₹0/month. Includes
                  500 MB database storage (~50,000+ orders and all 48 spice varieties) and 1 GB file
                  storage. Pauses after 7 days of inactivity on free tier unless upgraded ($25/mo
                  Pro) or kept active.
                </li>
                <li>
                  <strong>Frontend & Server Functions Hosting:</strong> ₹0/month on free starter
                  tiers (100 GB bandwidth/month). Custom `.in` or `.com` domain registration costs
                  approx. ₹699–₹999/year via your domain registrar.
                </li>
                <li>
                  <strong>Razorpay Payment Gateway Costs:</strong> ₹0 setup fee and ₹0 annual
                  maintenance fee. Standard domestic transaction fee is{' '}
                  <strong className="font-mono">2.0% + 18% GST</strong> per successful live
                  transaction (UPI, Cards, Netbanking). Test Mode is 100% free.
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-[#FED7AA] p-6 space-y-3">
              <h3 className="font-serif text-lg font-bold text-[#15803D]">
                Manual Setup Steps Required for Live Activation
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-[#44403C] leading-relaxed">
                <li>
                  <strong>Replace Sample Catalogue Data:</strong> Edit the 48 sample spices in the{' '}
                  <em>Products & Stock</em> tab with your actual FSSAI license number, real batch
                  MRP/selling prices, and real pack photos.
                </li>
                <li>
                  <strong>Razorpay Merchant KYC Approval:</strong> Sign up at{' '}
                  <span className="font-mono">dashboard.razorpay.com</span>, submit your Business
                  PAN, Bank Account / Cancelled Cheque, FSSAI certificate, and GSTIN (if applicable),
                  and verify your domain with the included Policy pages (Shipping, Returns, Privacy,
                  Terms).
                </li>
                <li>
                  <strong>Configure Live API Secrets:</strong> Set{' '}
                  <span className="font-mono">RAZORPAY_KEY_ID</span>,{' '}
                  <span className="font-mono">RAZORPAY_KEY_SECRET</span>, and{' '}
                  <span className="font-mono">RAZORPAY_WEBHOOK_SECRET</span> in your server
                  environment variables, and point your Razorpay webhook to{' '}
                  <span className="font-mono">/api/webhooks/razorpay</span>.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT EDIT / CREATE MODAL */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveProduct}
            className="bg-white border border-[#FED7AA] rounded-2xl max-w-3xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#FED7AA] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                {editingProduct.id ? `Edit ${editingProduct.name}` : 'Add New Spice Variety'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-xs font-semibold text-[#EA580C]"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Spice Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Hindi Name</label>
                <input
                  type="text"
                  value={editingProduct.hindiName}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, hindiName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Category *</label>
                <select
                  value={editingProduct.category}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, category: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs"
                >
                  <option value="Pure Ground Spices">Pure Ground Spices</option>
                  <option value="Signature Blended Masalas">Signature Blended Masalas</option>
                  <option value="Whole Spices & Aromatics">Whole Spices & Aromatics</option>
                  <option value="Regional & Specialty Blends">Regional & Specialty Blends</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Origin Region</label>
                <input
                  type="text"
                  value={editingProduct.originRegion}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, originRegion: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Heat Level</label>
                <select
                  value={editingProduct.heatLevel}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, heatLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs"
                >
                  <option value="Mild">Mild</option>
                  <option value="Medium">Medium</option>
                  <option value="Hot">Hot</option>
                  <option value="Aromatic">Aromatic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Wholesale Min (kg)</label>
                <input
                  type="number"
                  value={editingProduct.wholesaleMinQtyKg}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      wholesaleMinQtyKg: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Wholesale ₹/kg</label>
                <input
                  type="number"
                  value={editingProduct.wholesalePricePerKg}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      wholesalePricePerKg: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Product Photo URL (Optional — leave blank for SGM Heritage Pouch Preview)
              </label>
              <input
                type="url"
                value={editingProduct.imageUrl || ''}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                }
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Ingredients</label>
                <textarea
                  rows={2}
                  value={editingProduct.ingredients}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, ingredients: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Storage Instructions</label>
                <textarea
                  rows={2}
                  value={editingProduct.storageInstructions}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      storageInstructions: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#FED7AA] bg-white text-xs"
                />
              </div>
            </div>

            {/* Pack Size Variants Editor */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                Pack Size Variants (SKU, Selling Price ₹, MRP ₹, Stock Qty)
              </label>
              {(editingProduct.variants || []).map((v: any, idx: number) => (
                <div
                  key={idx}
                  className="grid grid-cols-5 gap-2 bg-[#FFF7ED] p-2.5 rounded-xl border border-[#FED7AA]"
                >
                  <input
                    type="text"
                    value={v.packSize}
                    onChange={(e) => {
                      const next = [...editingProduct.variants];
                      next[idx].packSize = e.target.value;
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    placeholder="100g"
                    className="px-2 py-1.5 border border-[#FED7AA] bg-white rounded text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={v.sku}
                    onChange={(e) => {
                      const next = [...editingProduct.variants];
                      next[idx].sku = e.target.value;
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    placeholder="SKU"
                    className="px-2 py-1.5 border border-[#FED7AA] bg-white rounded text-xs font-mono"
                  />
                  <input
                    type="number"
                    value={v.priceInr}
                    onChange={(e) => {
                      const next = [...editingProduct.variants];
                      next[idx].priceInr = Number(e.target.value);
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    placeholder="Price ₹"
                    className="px-2 py-1.5 border border-[#FED7AA] bg-white rounded text-xs font-mono"
                  />
                  <input
                    type="number"
                    value={v.mrpInr}
                    onChange={(e) => {
                      const next = [...editingProduct.variants];
                      next[idx].mrpInr = Number(e.target.value);
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    placeholder="MRP ₹"
                    className="px-2 py-1.5 border border-[#FED7AA] bg-white rounded text-xs font-mono"
                  />
                  <input
                    type="number"
                    value={v.stockQty}
                    onChange={(e) => {
                      const next = [...editingProduct.variants];
                      next[idx].stockQty = Number(e.target.value);
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    placeholder="Stock"
                    className="px-2 py-1.5 border border-[#FED7AA] bg-white rounded text-xs font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded-xl border border-[#FED7AA] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold"
              >
                Save Spice & Variants
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
