import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import RatingBadge from '@/components/reviews/RatingBadge'
import ReviewList from '@/components/reviews/ReviewList'
import { User, Package, Star, ShoppingBag, Calendar, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Product } from '@prisma/client'

async function refreshSellerStats(sellerId: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: { revieweeId: sellerId, type: 'SELLER' },
    })
    if (reviews.length === 0) return
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
    const avgRating = totalRating / reviews.length
    const totalReviews = reviews.length
    let trustLevel = 'BRONZE'
    if (totalReviews >= 3) {
      if (avgRating >= 4.5 && totalReviews >= 10) trustLevel = 'VERIFIED'
      else if (avgRating >= 4.0 && totalReviews >= 5) trustLevel = 'GOLD'
      else if (avgRating >= 3.5) trustLevel = 'SILVER'
    }
    await prisma.user.update({
      where: { id: sellerId },
      data: { avgRating, totalReviews, trustLevel: trustLevel as any },
    })
  } catch (error) {
    console.error('Error updating seller stats:', error)
  }
}

const TRUST_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  VERIFIED: { label: 'Verified',  color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  GOLD:     { label: 'Gold',      color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200'   },
  SILVER:   { label: 'Silver',    color: 'text-slate-600',   bg: 'bg-slate-50',    border: 'border-slate-200'   },
  BRONZE:   { label: 'Bronze',    color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200'  },
}

export default async function SellerProfilePage({ params }: { params: { id: string } }) {
  await refreshSellerStats(params.id)

  const seller = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      products: {
        where: { isActive: true },
        take: 8,
        orderBy: { createdAt: 'desc' },
      },
      reviewsReceived: {
        where: { type: 'SELLER' },
        include: {
          reviewer: { select: { id: true, name: true, profilePhoto: true } },
          order: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!seller) notFound()

  const totalProducts = await prisma.product.count({
    where: { sellerId: params.id, isActive: true },
  })

  const totalSales = await prisma.order.count({
    where: {
      sellerId: params.id,
      status: { in: ['DELIVERED', 'COMPLETED'] },
    },
  })

  const joinDate = new Date(seller.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })

  const satisfactionRate = seller.avgRating
    ? Math.round((seller.avgRating / 5) * 100)
    : 0

  const trust = TRUST_CONFIG[seller.trustLevel || 'BRONZE']

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/marketplace" className="hover:text-bata-primary transition">Marketplace</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/sellers" className="hover:text-bata-primary transition">Sellers</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-medium">{seller.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Seller identity card ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {seller.profilePhoto ? (
                <img
                  src={seller.profilePhoto}
                  alt={seller.name || 'Seller'}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                  <User className="w-9 h-9 text-gray-400" />
                </div>
              )}
              {seller.trustLevel === 'VERIFIED' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Identity info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${trust.bg} ${trust.color} ${trust.border}`}>
                  {seller.trustLevel === 'VERIFIED' && <Shield className="w-3 h-3" />}
                  {trust.label}
                </span>
              </div>

              {seller.bio && (
                <p className="text-sm text-gray-500 mb-4 max-w-2xl leading-relaxed">{seller.bio}</p>
              )}

              {/* Quick stats row */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ShoppingBag className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">{totalSales}</span> sales
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">{totalProducts}</span> products
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">{seller.avgRating?.toFixed(1) || '—'}</span>
                  <span className="text-gray-400">({seller.totalReviews || 0} reviews)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Joined {joinDate}
                </div>
              </div>
            </div>

            {/* Rating summary — right side */}
            <div className="flex-shrink-0 text-center border border-gray-100 rounded-xl px-6 py-4 hidden md:block">
              <p className="text-4xl font-bold text-gray-900 tabular-nums">
                {seller.avgRating?.toFixed(1) || '0.0'}
              </p>
              <div className="flex items-center justify-center gap-0.5 mt-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.floor(seller.avgRating || 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400">{seller.totalReviews || 0} reviews</p>
            </div>
          </div>
        </div>

        {/* ── Performance metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Average Rating', value: `${(Math.round((seller.avgRating || 0) * 100) / 100).toFixed(2)} / 5`, sub: 'out of 5 stars' },
            { label: 'Total Reviews',  value: String(seller.totalReviews || 0), sub: 'customer reviews' },
            { label: 'Items Sold',     value: String(totalSales), sub: 'completed orders' },
            { label: 'Satisfaction',   value: `${satisfactionRate}%`, sub: 'customer satisfaction' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Products + Reviews grid ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Products — takes 2 cols */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Products for Sale</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{totalProducts} active listing{totalProducts !== 1 ? 's' : ''}</p>
                </div>
                {totalProducts > 8 && (
                  <Link
                    href={`/seller/${params.id}/products`}
                    className="text-sm text-bata-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {seller.products.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                  {seller.products.map((product: Product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="group bg-white p-4 hover:bg-gray-50 transition-colors"
                    >
                      {product.images?.[0] && (
                        <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 bg-gray-100">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-bata-primary transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-bold text-gray-900">
                          ₦{product.price.toLocaleString()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          product.quantity > 10
                            ? 'bg-emerald-50 text-emerald-700'
                            : product.quantity > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {product.quantity > 0 ? `${product.quantity} left` : 'Out of stock'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No products listed yet</p>
                  <p className="text-xs text-gray-400 mt-1">This seller hasn't added any products.</p>
                </div>
              )}
            </div>
          </div>

          {/* Reviews — 1 col */}
          <div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Customer Reviews</h2>
                <p className="text-xs text-gray-400 mt-0.5">{seller.totalReviews || 0} verified purchase{(seller.totalReviews || 0) !== 1 ? 's' : ''}</p>
              </div>

              {/* Rating breakdown */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{seller.avgRating?.toFixed(1) || '0.0'}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= Math.floor(seller.avgRating || 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-200 fill-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = seller.reviewsReceived.filter(r => r.rating === star).length
                      const pct = seller.totalReviews ? Math.round((count / seller.totalReviews) * 100) : 0
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-2">{star}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <ReviewList
                  reviews={seller.reviewsReceived.filter((r) => r.comment !== null) as any}
                  emptyMessage={
                    <div className="text-center py-8">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">No reviews yet</p>
                      <p className="text-xs text-gray-400 mt-1">Be the first to review this seller</p>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}