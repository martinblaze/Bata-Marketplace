'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import {
  ShoppingCart, Trash2, Plus, Minus, ChevronLeft,
  Package, Lock, Truck, Shield, ArrowRight, Tag, X,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();

  useEffect(() => { setIsClient(true) }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price);

  const handleCheckout = () => {
    if (items.length === 0) return;
    sessionStorage.setItem('checkout_cart', JSON.stringify(items));
    router.push('/checkout');
  };

  if (!isClient) return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse mb-8" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[1,2].map(i => <div key={i} className="h-36 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
      <div className="text-center bg-white rounded-2xl p-12 sm:p-16 shadow-sm border border-gray-100 max-w-md w-full">
        <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-gray-100">
          <ShoppingCart className="w-9 h-9 text-gray-300" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-400 text-sm mb-7">Browse our marketplace and add items to your cart!</p>
        <button
          onClick={() => router.push('/marketplace')}
          className="inline-flex items-center gap-2 bg-bata-primary hover:bg-bata-dark text-white px-7 py-3 rounded-xl font-bold shadow-md transition-all"
        >
          Start Shopping <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const deliveryFee = 800;
  const subtotal = getTotalPrice();
  const total = subtotal + deliveryFee;
  const uniqueSellers = new Set(items.map(i => i.sellerId)).size;
  const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-20">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/marketplace')}
              className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-bata-primary transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Marketplace</span>
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-lg sm:text-xl font-black text-gray-900">
              Cart <span className="text-gray-400 font-semibold text-base">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
            </h1>
          </div>
          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Cart
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── LEFT: Items ──────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Cart items */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex gap-3 sm:gap-4">
                      {/* image */}
                      <Link href={`/product/${item.productId}`} className="flex-shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-100 hover:border-bata-primary transition-colors">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      </Link>

                      {/* info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/product/${item.productId}`}
                              className="font-bold text-gray-900 hover:text-bata-primary transition-colors text-sm sm:text-base line-clamp-2"
                            >
                              {item.name}
                            </Link>
                            <p className="text-xs text-gray-400 mt-0.5">
                              by <Link href={`/seller/${item.sellerId}`} className="text-bata-primary font-semibold hover:underline">{item.sellerName}</Link>
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* qty controls */}
                          <div className="flex items-center border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-all disabled:opacity-30"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-10 text-center font-black text-sm text-gray-900">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.maxQuantity}
                              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-all disabled:opacity-30"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="font-black text-bata-primary text-base sm:text-lg">{formatPrice(item.price * item.quantity)}</p>
                            <p className="text-[11px] text-gray-400">{formatPrice(item.price)} each</p>
                          </div>
                        </div>

                        {item.quantity >= item.maxQuantity && (
                          <p className="text-[11px] text-amber-600 font-semibold mt-2 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Max quantity reached
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust strip */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Why shop with BATA?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <Shield className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', title: 'Secure Payments', sub: 'Money held until delivery confirmed' },
                  { icon: <Truck className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', title: 'Campus Delivery', sub: 'Fast delivery within UNIZIK' },
                  { icon: <Lock className="w-5 h-5 text-violet-600" />, bg: 'bg-violet-50', title: 'Verified Sellers', sub: 'All sellers are verified students' },
                ].map(({ icon, bg, title, sub }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{icon}</div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Summary ───────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Order Summary</p>

              {/* Line items */}
              <div className="space-y-3 pb-4 border-b border-gray-50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({totalUnits} unit{totalUnits !== 1 ? 's' : ''})</span>
                  <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Delivery Fee
                  </span>
                  <span className="font-bold text-gray-900">{formatPrice(deliveryFee)}</span>
                </div>
              </div>

              <div className="flex justify-between mt-4 mb-5">
                <span className="font-black text-gray-900">Total</span>
                <span className="font-black text-bata-primary text-xl">{formatPrice(total)}</span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2.5 bg-bata-primary hover:bg-bata-dark text-white py-4 rounded-xl font-black text-base shadow-lg shadow-bata-primary/20 hover:shadow-xl transition-all active:scale-[0.98]"
              >
                <Lock className="w-4 h-4" /> Checkout · {formatPrice(total)}
              </button>

              <p className="text-[11px] text-center text-gray-400 mt-3">
                Payment processed securely through trusted partners
              </p>

              {/* Order meta */}
              <div className="mt-5 pt-4 border-t border-gray-50 space-y-2.5">
                {[
                  { label: 'Total Items', value: totalUnits },
                  { label: 'Unique Products', value: items.length },
                  { label: `Seller${uniqueSellers !== 1 ? 's' : ''}`, value: uniqueSellers },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">{label}</span>
                    <span className="font-black text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}