'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Star, Shield, ShoppingBag, Sparkles, Flame,
  AlertCircle, Clock, TrendingUp, X, ChevronRight,
  Package, Zap, Award, ArrowRight, Tag, Eye,
} from 'lucide-react'

const ANIM_CSS = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(18px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .card-enter {
    opacity: 0;
    animation: fadeSlideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes sectionIn {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .section-enter {
    opacity: 0;
    animation: sectionIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  .shimmer {
    background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .product-card {
    transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.3s ease;
  }
  .product-card:hover {
    transform: translateY(-4px) scale(1.015);
    box-shadow: 0 20px 48px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06);
  }
  .product-card:active {
    transform: scale(0.97);
    transition: transform 0.12s ease;
  }
  .product-img { transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
  .product-card:hover .product-img { transform: scale(1.06); }

  .btn-press { transition: transform 0.15s cubic-bezier(0.34, 1.4, 0.64, 1); }
  .btn-press:hover  { transform: scale(1.03); }
  .btn-press:active { transform: scale(0.96); }

  .cat-btn { transition: background 0.2s ease, color 0.2s ease, transform 0.2s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease; }
  .cat-btn:hover:not(.cat-active) { transform: scale(1.06); }
  .cat-btn:active { transform: scale(0.95); }

  .search-input { transition: box-shadow 0.25s ease, background 0.25s ease; }
  .search-input:focus-within {
    box-shadow: 0 0 0 3px rgba(14,165,233,0.18), 0 2px 8px rgba(0,0,0,0.06) !important;
    background: white !important;
  }

  @keyframes dropIn {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .drop-in { animation: dropIn 0.18s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

  .rv-card {
    transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.3s ease;
  }
  .rv-card:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 12px 28px rgba(0,0,0,0.1); }
  .rv-card:active { transform: scale(0.97); }
  .rv-card:hover .product-img { transform: scale(1.06); }

  .interest-pill {
    transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1), background 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .interest-pill:hover {
    transform: scale(1.05) translateY(-1px);
    background: #0ea5e9 !important;
    color: white !important;
    border-color: transparent !important;
    box-shadow: 0 8px 20px rgba(14,165,233,0.25);
  }
  .interest-pill:active { transform: scale(0.96); }

  .hot-tag { transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1), background 0.15s ease, color 0.15s ease; }
  .hot-tag:hover { transform: scale(1.07) translateY(-1px); }
  .hot-tag:active { transform: scale(0.95); }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`

const CATEGORIES = [
  { name: 'All', icon: '🛍️' },
  { name: 'Fashion & Clothing', icon: '👔' },
  { name: 'Food Services', icon: '🍔' },
  { name: 'Room Essentials', icon: '🏠' },
  { name: 'School Supplies', icon: '🎒' },
  { name: 'Tech Gadgets', icon: '🎧' },
  { name: 'Cosmetics', icon: '💄' },
  { name: 'Snacks', icon: '🍿' },
  { name: 'Books', icon: '📚' },
]

const TRENDING_SEARCHES = ['iPhone', 'Sneakers', 'Laptop', 'Jollof Rice', 'Textbooks', 'Earbuds', 'Braids', 'Power Bank']
const RECENT_SEARCHES_KEY = 'bata-recent-searches'
const RECENTLY_VIEWED_KEY = 'bata-recently-viewed'

function parseTags(description: string): string[] {
  if (!description) return []
  if (description.includes(' | ')) return description.split(' | ').map(t => t.trim()).filter(Boolean)
  return []
}

function TrustPill({ level }: { level: string }) {
  const tone = level === 'GOLD'
    ? { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-400' }
    : level === 'SILVER'
    ? { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-400' }
    : { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} /> {level}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-xs font-semibold text-gray-600 ml-0.5">{rating.toFixed(1)}</span>
    </div>
  )
}

function ProductCard({ product, onClick, delay = 0 }: { product: any; onClick: () => void; delay?: number }) {
  const tags = parseTags(product.description)
  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)
  return (
    <div onClick={onClick} className="product-card card-enter bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer flex flex-col"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img src={product.images[0] || '/placeholder.png'} alt={product.name} className="product-img w-full h-full object-cover" />
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.isTrending && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black rounded-lg shadow-md">
              <Flame className="w-2.5 h-2.5" /> HOT
            </span>
          )}
          {product.isNew && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] font-black rounded-lg shadow-md">
              <Sparkles className="w-2.5 h-2.5" /> NEW
            </span>
          )}
        </div>
        {product.images?.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm">
            {product.images.length} photos
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{product.category}</p>
        <h3 className="font-bold text-gray-900 line-clamp-2 text-sm leading-snug flex-1">{product.name}</h3>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded-full">{tag}</span>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-2">
          <span className="text-bata-primary font-black text-base tracking-tight block">{fmt(product.price)}</span>
          <StarRating rating={product.seller?.avgRating || 0} />
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <div className="min-w-0">
              <Link href={`/seller/${product.seller?.id}`} className="text-xs font-semibold text-gray-600 hover:text-bata-primary truncate block transition-colors" onClick={e => e.stopPropagation()}>
                {product.seller?.name}
              </Link>
              <div className="mt-1"><TrustPill level={product.seller?.trustLevel || 'BRONZE'} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="card-enter bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ animationDelay: `${delay}ms` }}>
      <div className="aspect-square shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-3 shimmer rounded-full w-1/2" />
        <div className="h-4 shimmer rounded-full w-full" />
        <div className="h-4 shimmer rounded-full w-3/4" />
        <div className="h-5 shimmer rounded-full w-1/3 mt-4" />
      </div>
    </div>
  )
}

function SectionHeader({ title, icon, onSeeAll, delay = 0 }: { title: string; icon: React.ReactNode; onSeeAll?: () => void; delay?: number }) {
  return (
    <div className="section-enter flex items-center justify-between mb-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
      </div>
      {onSeeAll && (
        <button onClick={onSeeAll} className="btn-press flex items-center gap-1 text-xs font-bold text-bata-primary hover:text-bata-dark transition-colors">
          See all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default function MarketplacePage() {
  const router = useRouter()
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed')
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])
  const [interestCategories, setInterestCategories] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  // ✅ FIX: track when user is clicking a suggestion so outside-click handler doesn't close dropdown first
  const isClickingSuggestionRef = useRef(false)

  useEffect(() => {
    if (document.getElementById('bata-anim')) return
    const s = document.createElement('style')
    s.id = 'bata-anim'
    s.textContent = ANIM_CSS
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    setMounted(true)
    try { setRecentlyViewed(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')) } catch { }
    try { setRecentSearches(JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')) } catch { }
    fetchInterests()
    fetchProducts()
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      // ✅ FIX: if user is clicking a suggestion, don't close the dropdown
      if (isClickingSuggestionRef.current) return
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => { fetchProducts() }, [selectedCategory])

  const updateDropdownPos = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropdownPos({ top: r.bottom + window.scrollY + 8, left: r.left + window.scrollX, width: r.width })
  }, [])

  useEffect(() => {
    window.addEventListener('resize', updateDropdownPos)
    window.addEventListener('scroll', updateDropdownPos)
    return () => { window.removeEventListener('resize', updateDropdownPos); window.removeEventListener('scroll', updateDropdownPos) }
  }, [updateDropdownPos])

  const fetchInterests = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.orders?.length) {
        const cats = Array.from(new Set(data.orders.map((o: any) => o.product?.category).filter(Boolean))) as string[]
        setInterestCategories(cats.slice(0, 4))
      }
    } catch { }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const url = selectedCategory === 'All' ? '/api/products' : `/api/products?category=${encodeURIComponent(selectedCategory)}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setAllProducts((data.products || []).map((p: any) => ({ ...p, isTrending: Math.random() > 0.7, isNew: Math.random() > 0.8 })))
    } catch { }
    finally { setLoading(false) }
  }

  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

  const handleProductClick = (id: string) => {
    const token = localStorage.getItem('token')
    try {
      const viewed = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')
      const product = allProducts.find(p => p.id === id)
      if (product) {
        const updated = [product, ...viewed.filter((v: any) => v.id !== id)].slice(0, 20)
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
        setRecentlyViewed(updated)
      }
    } catch { }
    window.location.href = token ? `/product/${id}` : '/login'
  }

  const handleSearch = (searchTerm?: string) => {
    const q = (searchTerm || searchInput).trim()
    if (!q) return
    try {
      const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8)
      setRecentSearches(updated)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch { }
    setShowSuggestions(false)
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const newListings = useMemo(() => allProducts.filter(p => p.isNew).slice(0, 8), [allProducts])
  const popularProducts = useMemo(() => [...allProducts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 8), [allProducts])
  const interestProducts = useMemo(() => {
    if (!interestCategories.length) return []
    return allProducts.filter(p => interestCategories.includes(p.category)).slice(0, 8)
  }, [allProducts, interestCategories])
  const filteredByCategory = useMemo(() =>
    selectedCategory === 'All' ? allProducts : allProducts.filter(p => p.category === selectedCategory),
    [allProducts, selectedCategory])

  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (!q) return recentSearches.slice(0, 6).map(s => ({ type: 'recent', label: s }))
    const productMatches = allProducts
      .filter(p => { const tags = parseTags(p.description); return p.name.toLowerCase().includes(q) || tags.some(t => t.toLowerCase().includes(q)) })
      .slice(0, 5).map(p => ({ type: 'product', label: p.name, sublabel: fmt(p.price), id: p.id, image: p.images[0] }))
    const trendingMatches = TRENDING_SEARCHES.filter(s => s.toLowerCase().includes(q)).slice(0, 3).map(s => ({ type: 'trending', label: s }))
    return [...productMatches, ...trendingMatches]
  }, [searchInput, allProducts, recentSearches])

  const SuggestionsDropdown = mounted && showSuggestions && suggestions.length > 0
    ? createPortal(
      <div className="drop-in" style={{
        position: 'absolute', top: dropdownPos.top, left: dropdownPos.left,
        width: dropdownPos.width, zIndex: 9999, background: 'white',
        borderRadius: 16, overflow: 'hidden', maxHeight: 360, overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)',
      }}>
        <div className="px-4 pt-3 pb-2 border-b border-gray-50">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {!searchInput.trim() ? 'Recent Searches' : 'Suggestions'}
          </span>
        </div>
        {suggestions.map((s: any, i) => (
          <button
            key={i}
            // ✅ FIX: set flag on mousedown so outside-click handler is skipped
            onMouseDown={e => { e.preventDefault(); isClickingSuggestionRef.current = true }}
            // ✅ FIX: clear flag then execute action
            onClick={() => {
              isClickingSuggestionRef.current = false
              if (s.type === 'product') {
                handleProductClick(s.id)
                return
              }
              handleSearch(s.label)
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            {s.type === 'product' && s.image
              ? <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"><img src={s.image} alt="" className="w-full h-full object-cover" /></div>
              : s.type === 'recent'
              ? <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 text-gray-400" /></div>
              : <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0"><TrendingUp className="w-4 h-4 text-orange-500" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{s.label}</p>
              {s.sublabel && <p className="text-xs text-gray-400">{s.sublabel}</p>}
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          </button>
        ))}
        {searchInput.trim() && (
          <button
            // ✅ FIX: same pattern for the "Search for X" button
            onMouseDown={e => { e.preventDefault(); isClickingSuggestionRef.current = true }}
            onClick={() => { isClickingSuggestionRef.current = false; handleSearch() }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-bata-primary/5 hover:bg-bata-primary/10 transition-colors border-t border-gray-50"
          >
            <div className="w-9 h-9 rounded-xl bg-bata-primary/15 flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-bata-primary" />
            </div>
            <p className="text-sm font-bold text-bata-primary">Search for "<span>{searchInput}</span>"</p>
            <ArrowRight className="w-3.5 h-3.5 text-bata-primary ml-auto" />
          </button>
        )}
      </div>,
      document.body
    ) : null

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {SuggestionsDropdown}

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-bata-primary via-bata-primary to-bata-dark">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-white/[0.06] blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-white/[0.04] blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
            <defs><pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 md:pt-14 pb-0">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 sm:mb-8 md:mb-10">
            <div className="space-y-2 sm:space-y-3 w-full sm:w-auto section-enter">
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/15 text-white/90 text-[10px] sm:text-xs font-bold ring-1 ring-white/20 backdrop-blur-sm">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" /> Campus Marketplace
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-black text-white tracking-tight leading-tight sm:leading-none">
                Your Feed{''}
                <span className="text-white/70 block sm:inline"><br className="hidden sm:block" /> at UNIZIK</span>
              </h1>
              <p className="text-white/65 text-xs sm:text-sm md:text-base max-w-md">
                Discover products picked for you — from your campus, by your campus.
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                {[
                  { icon: <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, label: 'Verified Sellers' },
                  { icon: <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, label: 'Rated Products' },
                  { icon: <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, label: 'Campus Delivery' },
                ].map(({ icon, label }, i) => (
                  <span key={label} className="section-enter inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 text-white/85 text-[10px] sm:text-xs font-semibold ring-1 ring-white/15 backdrop-blur-sm"
                    style={{ animationDelay: `${120 + i * 60}ms` }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex flex-col gap-2 mt-1 section-enter flex-shrink-0" style={{ animationDelay: '80ms' }}>
              <Link href="/sell" className="btn-press flex items-center gap-2 bg-white text-bata-primary px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-lg">
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /> Sell a Product
              </Link>
              <Link href="/report" className="btn-press flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm ring-1 ring-white/15 transition-colors">
                <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> Report Issue
              </Link>
            </div>
          </div>

          {/* Search card */}
          <div ref={searchRef} className="relative section-enter" style={{ animationDelay: '60ms' }}>
            <div className="bg-white rounded-t-xl sm:rounded-t-2xl md:rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-3 sm:p-4 md:p-5">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="search-input flex-1 flex items-center gap-2 bg-gray-50 ring-1 ring-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchInput}
                    onChange={e => { setSearchInput(e.target.value); updateDropdownPos(); setShowSuggestions(true) }}
                    onFocus={() => { updateDropdownPos(); setShowSuggestions(true) }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search products..."
                    className="flex-1 bg-transparent outline-none text-xs sm:text-sm text-gray-800 placeholder-gray-400 py-2.5 sm:py-3 md:py-3.5"
                    autoComplete="off"
                  />
                  {searchInput && (
                    <button onClick={() => { setSearchInput(''); setShowSuggestions(false) }} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                      <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSearch()} className="btn-press flex-1 sm:flex-none px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 bg-bata-primary hover:bg-bata-dark text-white rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-md transition-colors">
                    Search
                  </button>
                  <Link href="/sell" className="sm:hidden btn-press px-4 py-2.5 bg-bata-primary text-white rounded-lg flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Hot tags */}
              <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar pb-1 -mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap flex-shrink-0">Hot:</span>
                <div className="flex gap-1.5 sm:gap-2">
                  {['iPhone', 'Sneakers', 'Laptop', 'Books', 'Jollof', 'Earbuds'].map(tag => (
                    <button key={tag} onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                      className="hot-tag flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gray-100 hover:bg-bata-primary/10 hover:text-bata-primary text-gray-600 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap flex-shrink-0">
                      <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CATEGORY NAV ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-1">
              {CATEGORIES.map(cat => (
                <button key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                  className={`cat-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap text-xs ${
                    selectedCategory === cat.name
                      ? 'cat-active bg-bata-primary text-white shadow-md shadow-bata-primary/25'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}>
                  <span className="text-sm">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
              {(['feed', 'grid'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-200"
                  style={viewMode === mode ? { background: 'white', color: '#0ea5e9', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#6b7280' }}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} delay={i * 40} />)}
          </div>

        ) : selectedCategory !== 'All' ? (
          <div>
            <div className="flex items-center gap-2 mb-5 section-enter">
              <button onClick={() => setSelectedCategory('All')} className="text-xs font-bold text-gray-400 hover:text-bata-primary transition-colors">← All</button>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-bold text-gray-700">{selectedCategory}</span>
              <span className="text-xs text-gray-400">({filteredByCategory.length})</span>
            </div>
            {filteredByCategory.length === 0 ? (
              <div className="section-enter flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <ShoppingBag className="w-10 h-10 text-gray-300 mb-3" />
                <h3 className="text-lg font-black text-gray-800 mb-1">Nothing here yet</h3>
                <Link href="/sell" className="btn-press mt-4 inline-flex items-center gap-2 bg-bata-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md">
                  List a Product <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {filteredByCategory.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 40} />)}
              </div>
            )}
          </div>

        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {allProducts.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 30} />)}
          </div>

        ) : (
          <div className="space-y-12">

            {interestCategories.length > 0 && (
              <div>
                <SectionHeader title="Your Interests" delay={0}
                  icon={<div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Sparkles className="w-4 h-4 text-purple-600" /></div>}
                />
                <div className="flex flex-wrap gap-2.5">
                  {interestCategories.map((cat, i) => {
                    const catObj = CATEGORIES.find(c => c.name === cat)
                    return (
                      <button key={cat} onClick={() => setSelectedCategory(cat)}
                        className="interest-pill card-enter flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700"
                        style={{ animationDelay: `${i * 50}ms` }}>
                        <span>{catObj?.icon}</span> {cat}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {recentlyViewed.length > 0 && (
              <div>
                <SectionHeader title="Recently Viewed" delay={60}
                  icon={<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Eye className="w-4 h-4 text-blue-600" /></div>}
                />
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                  {recentlyViewed.slice(0, 8).map((p, i) => (
                    <div key={p.id} onClick={() => handleProductClick(p.id)}
                      className="rv-card card-enter flex-shrink-0 w-40 cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="w-40 h-40 overflow-hidden bg-gray-100">
                        <img src={p.images?.[0] || '/placeholder.png'} alt={p.name} className="product-img w-full h-full object-cover" />
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
                        <p className="text-xs font-black text-bata-primary mt-1">{fmt(p.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {interestProducts.length > 0 && (
              <div>
                <SectionHeader title="Based on Your Orders" delay={80}
                  icon={<div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>}
                  onSeeAll={() => setSelectedCategory(interestCategories[0])}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {interestProducts.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 40} />)}
                </div>
              </div>
            )}

            {newListings.length > 0 && (
              <div>
                <SectionHeader title="New on BATA" delay={100}
                  icon={<div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><Sparkles className="w-4 h-4 text-green-600" /></div>}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {newListings.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 40} />)}
                </div>
              </div>
            )}

            {popularProducts.length > 0 && (
              <div>
                <SectionHeader title="🔥 Popular on Campus" delay={120}
                  icon={<div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center"><Flame className="w-4 h-4 text-orange-600" /></div>}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {popularProducts.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 40} />)}
                </div>
              </div>
            )}

            <div>
              <SectionHeader title="All Listings" delay={140}
                icon={<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-gray-600" /></div>}
              />
              {allProducts.length === 0 ? (
                <div className="section-enter flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mb-3" />
                  <h3 className="text-lg font-black text-gray-800 mb-1">No products yet</h3>
                  <Link href="/sell" className="btn-press mt-4 inline-flex items-center gap-2 bg-bata-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md">
                    Be the first to list <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {allProducts.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 25} />)}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Floating Sell Button for Mobile */}
      <div className="fixed bottom-4 right-4 z-50 sm:hidden">
        <Link href="/sell" className="btn-press flex items-center gap-2 bg-bata-primary text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg">
          <Sparkles className="w-4 h-4" /> Sell
        </Link>
      </div>
    </div>
  )
}