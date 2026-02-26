'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import RatingBadge from '@/components/reviews/RatingBadge';
import ReviewList from '@/components/reviews/ReviewList';
import { useCartStore } from '@/lib/cart-store';
import {
  ShoppingCart,
  Star,
  Share2,
  ChevronLeft,
  ChevronRight,
  User,
  Package,
  CheckCircle,
  Check,
  Shield,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  Zap,
  Tag,
  BadgeCheck,
  Minus,
  Plus,
  Copy,
} from 'lucide-react';

// Parse pipe-separated description into tags
function parseTags(description: string): string[] {
  if (!description) return []
  if (description.includes(' | ')) return description.split(' | ').map(t => t.trim()).filter(Boolean)
  return []
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [showLinkCopied, setShowLinkCopied] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => { if (params.id) fetchProduct() }, [params.id]);

  useEffect(() => {
    if (product?.sellerId) fetchSellerReviews();
    if (product?.id) fetchProductReviews();
  }, [product?.sellerId, product?.id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data.product);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?userId=${product.sellerId}&type=SELLER`);
      if (response.ok) {
        const data = await response.json();
        setSellerReviews(data.reviews || []);
      }
    } catch (error) { console.error('Error fetching reviews:', error) }
  };

  const fetchProductReviews = async () => {
    try {
      const response = await fetch(`/api/reviews/product?productId=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProductReviews(data.reviews || []);
      }
    } catch (error) { console.error('Error fetching product reviews:', error) }
    finally { setReviewsLoading(false) }
  };

  const addToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      maxQuantity: product.quantity,
      image: product.images?.[0] || '/placeholder.png',
      sellerId: product.sellerId,
      sellerName: product.seller?.name || 'Seller',
    });
    setShowAddedToCart(true);
    setTimeout(() => setShowAddedToCart(false), 3000);
    setQuantity(1);
  };

  const handleShare = async () => {
    const productLink = `${window.location.origin}/product/${product?.id}`;
    try {
      await navigator.clipboard.writeText(productLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = productLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setShowLinkCopied(true);
    setTimeout(() => setShowLinkCopied(false), 3000);
  };

  const handlePreviousImage = () =>
    setCurrentImageIndex(prev => prev === 0 ? (product.images?.length || 1) - 1 : prev - 1);

  const handleNextImage = () =>
    setCurrentImageIndex(prev => prev === (product.images?.length || 1) - 1 ? 0 : prev + 1);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price);

  const stockStatus = product
    ? product.quantity > 10
      ? { label: 'In Stock', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500' }
      : product.quantity > 0
      ? { label: `Only ${product.quantity} left`, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200', dot: 'bg-amber-500' }
      : { label: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200', dot: 'bg-red-500' }
    : null;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse mb-8" />
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
              <div className="flex gap-3">
                {[1,2,3,4].map(i => <div key={i} className="w-20 h-20 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />)}
              </div>
            </div>
            <div className="space-y-5">
              <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-3/4" />
              <div className="h-6 bg-gray-200 rounded-xl animate-pulse w-1/2" />
              <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
              <div className="h-14 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
        <div className="text-center bg-white rounded-2xl p-12 shadow-sm border border-gray-100 max-w-md">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-gray-200">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-500 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 bg-bata-primary hover:bg-bata-dark text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
          >
            <ChevronLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const descriptionTags = parseTags(product.description)
  const isTagDescription = descriptionTags.length > 0

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-20">

      {/* ── Toast notifications ── */}
      {showAddedToCart && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right-5 duration-300">
          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm">Added to cart!</span>
        </div>
      )}
      {showLinkCopied && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right-5 duration-300">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Copy className="w-3 h-3" />
          </div>
          <span className="font-semibold text-sm">Link copied!</span>
        </div>
      )}

      {/* ── Breadcrumb / Back bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-bata-primary transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
            <span>Marketplace</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 font-semibold truncate max-w-[200px]">{product.name}</span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-bata-primary transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">

          {/* ── LEFT: Images ── */}
          <div className="space-y-3 sm:space-y-4">
            {/* Main image */}
            <div className="relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm group aspect-square">
              <img
                src={product.images?.[currentImageIndex] || '/placeholder.png'}
                alt={product.name}
                className="w-full h-full object-contain p-4 sm:p-8 transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {product.images?.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-gray-900/60 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                    {currentImageIndex + 1}/{product.images.length}
                  </div>
                </>
              )}
              {product.images?.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {product.images.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`rounded-full transition-all duration-200 ${i === currentImageIndex ? 'w-5 h-1.5 bg-bata-primary' : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {product.images.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 sm:w-20 h-16 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      currentImageIndex === index
                        ? 'border-bata-primary shadow-md shadow-bata-primary/20'
                        : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Shield className="w-4 h-4 text-bata-primary" />, label: 'Verified Seller' },
                { icon: <Zap className="w-4 h-4 text-amber-500" />, label: 'Fast Delivery' },
                { icon: <BadgeCheck className="w-4 h-4 text-emerald-500" />, label: 'Campus Safe' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 bg-white rounded-xl p-3 border border-gray-100 text-center">
                  {icon}
                  <span className="text-[11px] font-semibold text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div className="space-y-5 sm:space-y-6">

            {/* Category + stock badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-bata-primary uppercase tracking-widest bg-bata-primary/8 px-3 py-1 rounded-full">
                {product.category}
              </span>
              {stockStatus && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ring-1 ${stockStatus.bg} ${stockStatus.color} ${stockStatus.ring}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stockStatus.dot}`} />
                  {stockStatus.label}
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-gray-900 leading-tight">
                {product.name}
              </h1>
              {product.avgRating > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(product.avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-700">{product.avgRating?.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">({product.totalReviews || 0} reviews)</span>
                </div>
              )}
            </div>

            {/* Price block */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <p className="text-3xl sm:text-4xl font-black text-bata-primary tracking-tight">
                {formatPrice(product.price)}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Price per unit · Campus delivery available</p>
            </div>

            {/* ── Description / Tags ── */}
            {product.description && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Product Details</p>
                {isTagDescription ? (
                  // New tag-based description
                  <div className="flex flex-wrap gap-2">
                    {descriptionTags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bata-primary/8 text-bata-primary text-sm font-semibold rounded-full ring-1 ring-bata-primary/15"
                      >
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  // Fallback for old plain-text descriptions
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{product.description}</p>
                )}
              </div>
            )}

            {/* Quantity selector */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quantity</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-all active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-black text-lg text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                    className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-black text-gray-900">{product.quantity}</span> units available
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <button
                onClick={addToCart}
                disabled={product.quantity === 0}
                className="w-full flex items-center justify-center gap-2.5 bg-bata-primary hover:bg-bata-dark disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black text-base shadow-lg shadow-bata-primary/25 hover:shadow-xl hover:shadow-bata-primary/30 transition-all duration-200 active:scale-[0.98]"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart · {formatPrice(product.price * quantity)}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push('/cart')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 hover:border-bata-primary hover:bg-bata-primary/5 text-gray-700 hover:text-bata-primary font-bold text-sm transition-all"
                >
                  <ShoppingCart className="w-4 h-4" /> View Cart
                </button>
                <button
                  onClick={() => router.back()}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-all"
                >
                  Keep Shopping
                </button>
              </div>
            </div>

            {/* ── Seller card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {product.seller?.profilePhoto ? (
                    <img
                      src={product.seller.profilePhoto}
                      alt={product.seller.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-bata-primary/10 flex items-center justify-center ring-2 ring-bata-primary/20">
                      <span className="text-bata-primary font-black text-xl">
                        {(product.seller?.name || 'S')[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Sold by</p>
                  <Link
                    href={`/seller/${product.sellerId}`}
                    className="text-lg font-black text-gray-900 hover:text-bata-primary transition-colors truncate block"
                  >
                    {product.seller?.name || 'Seller'}
                  </Link>
                  <div className="flex items-center gap-1 mt-0.5">
                    {product.seller?.trustLevel === 'GOLD' && <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">⭐ Gold Seller</span>}
                    {product.seller?.trustLevel === 'SILVER' && <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full ring-1 ring-slate-200">🥈 Silver Seller</span>}
                    {product.seller?.trustLevel === 'BRONZE' && <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full ring-1 ring-orange-200">🥉 Bronze Seller</span>}
                  </div>
                </div>
              </div>

              {/* Seller stats */}
              <div className="grid grid-cols-3 border-t border-gray-50">
                {[
                  { icon: <TrendingUp className="w-4 h-4 text-bata-primary" />, value: product.seller?.completedOrders || 0, label: 'Orders' },
                  { icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />, value: product.seller?.avgRating?.toFixed(1) || '0.0', label: 'Rating' },
                  { icon: <Shield className="w-4 h-4 text-purple-500" />, value: product.seller?.trustLevel || 'Bronze', label: 'Level' },
                ].map(({ icon, value, label }, i) => (
                  <div key={label} className={`flex flex-col items-center justify-center py-4 gap-1 ${i < 2 ? 'border-r border-gray-50' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {icon}
                      <span className="font-black text-sm sm:text-base text-gray-900">{value}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400">{label}</span>
                  </div>
                ))}
              </div>

              {/* Seller reviews preview */}
              {sellerReviews.length > 0 && (
                <div className="border-t border-gray-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Seller Reviews</p>
                    <span className="text-xs text-gray-400">{sellerReviews.length} total</span>
                  </div>
                  <ReviewList reviews={sellerReviews.slice(0, 2)} />
                  <button
                    onClick={() => router.push(`/seller/${product.sellerId}`)}
                    className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-bata-primary hover:text-bata-dark transition-colors py-2 hover:bg-bata-primary/5 rounded-xl"
                  >
                    View All Reviews <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Product details card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-bata-primary/10 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-bata-primary" />
                </div>
                <h3 className="font-black text-gray-900">Product Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</p>
                  <p className="font-black text-gray-900 text-sm">{product.category}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery</p>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="font-bold text-gray-900 text-xs">On Campus</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Product Reviews ── */}
        {!reviewsLoading && (
          <div className="mt-10 sm:mt-16">
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center ring-1 ring-purple-100">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">Product Reviews</h2>
                  {product.avgRating > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(product.avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-700">{product.avgRating?.toFixed(1)}</span>
                      <span className="text-sm text-gray-400">· {product.totalReviews || 0} reviews</span>
                    </div>
                  )}
                </div>
              </div>
              {product.totalReviews > 0 && (
                <Link
                  href={`/product/${params.id}/reviews`}
                  className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-bata-primary hover:text-bata-dark transition-colors"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {productReviews.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {productReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="p-5 sm:p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {review.reviewer?.profilePhoto ? (
                          <img src={review.reviewer.profilePhoto} alt={review.reviewer.name} className="w-10 h-10 rounded-full flex-shrink-0 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-bata-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-bata-primary font-black text-sm">{(review.reviewer?.name || 'A')[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <div>
                              <p className="font-bold text-sm text-gray-900">{review.reviewer?.name || 'Anonymous'}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-200">
                              <BadgeCheck className="w-3 h-3" /> Verified
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-gray-100">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-black text-gray-800 mb-1">No Reviews Yet</h3>
                  <p className="text-sm text-gray-400 max-w-sm">Be the first to review this product after purchasing.</p>
                </div>
              )}

              {productReviews.length > 5 && (
                <div className="border-t border-gray-50 p-5 text-center">
                  <Link
                    href={`/product/${params.id}/reviews`}
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md"
                  >
                    Load More Reviews ({productReviews.length - 5} more) <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}