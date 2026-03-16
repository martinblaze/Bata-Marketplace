'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, Filter, Star, ArrowRight, ChevronLeft, SlidersHorizontal, ChevronRight } from 'lucide-react'

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
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tone.dot}`} />
      {level}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-2.5 h-2.5 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-[10px] font-semibold text-gray-600 ml-0.5">{rating.toFixed(1)}</span>
    </div>
  )
}

function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQ)
  const [inputVal, setInputVal] = useState(initialQ)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'recent' | 'price-low' | 'price-high'>('recent')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [appliedMin, setAppliedMin] = useState<number | null>(null)
  const [appliedMax, setAppliedMax] = useState<number | null>(null)
  const [showPriceFilter, setShowPriceFilter] = useState(false)

  const queryTokens = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data.products || [])
    } catch { }
    finally { setLoading(false) }
  }

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

  const handleSearch = () => {
    const q = inputVal.trim()
    if (!q) return
    setQuery(q)
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false })
  }

  const removeToken = (token: string) => {
    const newTokens = queryTokens.filter(t => t !== token)
    const newQ = newTokens.join(' ')
    setQuery(newQ)
    setInputVal(newQ)
    router.replace(`/search?q=${encodeURIComponent(newQ)}`, { scroll: false })
  }

  const applyPrice = () => {
    setAppliedMin(minPrice ? parseFloat(minPrice) : null)
    setAppliedMax(maxPrice ? parseFloat(maxPrice) : null)
    setShowPriceFilter(false)
  }

  const clearPrice = () => {
    setMinPrice(''); setMaxPrice('')
    setAppliedMin(null); setAppliedMax(null)
    setShowPriceFilter(false)
  }

  const filtered = useMemo(() => {
    if (!queryTokens.length) return []
    return products
      .filter(p => {
        const tags = parseTags(p.description)
        const allText = [p.name.toLowerCase(), p.category.toLowerCase(), ...tags.map((t: string) => t.toLowerCase())]
        const matches = queryTokens.every(token => allText.some(t => t.includes(token)))
        const priceOk = (appliedMin === null || p.price >= appliedMin) && (appliedMax === null || p.price <= appliedMax)
        return matches && priceOk
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price
        if (sortBy === 'price-high') return b.price - a.price
        return 0
      })
  }, [products, queryTokens, sortBy, appliedMin, appliedMax])

  const handleProductClick = (id: string) => {
    const token = localStorage.getItem('token')
    try {
      const viewed = JSON.parse(localStorage.getItem('BATAMART-recently-viewed') || '[]')
      const product = products.find(p => p.id === id)
      if (product) {
        const updated = [product, ...viewed.filter((v: any) => v.id !== id)].slice(0, 20)
        localStorage.setItem('BATAMART-recently-viewed', JSON.stringify(updated))
      }
    } catch { }
    window.location.href = token ? `/product/${id}` : '/login'
  }

  const priceActive = appliedMin !== null || appliedMax !== null

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-2xl mx-auto px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/marketplace')}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-gray-50 ring-1 ring-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-BATAMART-primary/30 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search products..."
                className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                autoFocus
              />
              {inputVal && (
                <button onClick={() => { setInputVal(''); setQuery('') }} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="flex-shrink-0 px-3 py-2 bg-BATAMART-primary hover:bg-BATAMART-dark text-white rounded-xl font-bold text-sm transition-all"
            >
              Go
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-3 py-4">

        {/* Active filter chips */}
        {(queryTokens.length > 0 || priceActive) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filters:</span>
            {queryTokens.map(token => (
              <span key={token} className="inline-flex items-center gap-1 px-2.5 py-1 bg-BATAMART-primary text-white text-xs font-bold rounded-full">
                {token}
                <button onClick={() => removeToken(token)} className="hover:text-white/70">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {priceActive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 text-white text-xs font-bold rounded-full">
                {appliedMin ? formatPrice(appliedMin) : '₦0'} – {appliedMax ? formatPrice(appliedMax) : 'Any'}
                <button onClick={clearPrice}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-xs text-gray-500 min-w-0 truncate">
            {loading ? 'Searching...' : (
              <>
                <span className="font-black text-gray-900">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
                {query && <span className="text-gray-400"> for "<span className="text-gray-700">{query}</span>"</span>}
              </>
            )}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Price filter */}
            <div className="relative">
              <button
                onClick={() => setShowPriceFilter(p => !p)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${priceActive ? 'bg-BATAMART-primary text-white border-BATAMART-primary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                <Filter className="w-3 h-3" /> Price
              </button>
              {showPriceFilter && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Price Range (₦)</p>
                  <div className="flex items-center gap-1.5 mb-2">
                    <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min" className="w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg text-xs focus:border-BATAMART-primary focus:outline-none" />
                    <span className="text-gray-400 font-bold text-xs">—</span>
                    <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max" className="w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg text-xs focus:border-BATAMART-primary focus:outline-none" />
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {[
                      { label: '<₦5k', min: '', max: '5000' },
                      { label: '₦5k-20k', min: '5000', max: '20000' },
                      { label: '₦20k-50k', min: '20000', max: '50000' },
                      { label: '>₦50k', min: '50000', max: '' }
                    ].map(p => (
                      <button key={p.label} onClick={() => { setMinPrice(p.min); setMaxPrice(p.max) }} className="px-2 py-0.5 bg-gray-100 hover:bg-BATAMART-primary/10 hover:text-BATAMART-primary text-gray-600 text-[10px] font-semibold rounded-full transition-all">{p.label}</button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={clearPrice} className="flex-1 py-1.5 rounded-lg border-2 border-gray-200 text-gray-600 text-xs font-bold">Clear</button>
                    <button onClick={applyPrice} className="flex-1 py-1.5 rounded-lg bg-BATAMART-primary text-white text-xs font-bold">Apply</button>
                  </div>
                </div>
              )}
            </div>
            {/* Sort */}
            <div className="relative">
              <SlidersHorizontal className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="appearance-none bg-white border border-gray-200 rounded-lg pl-6 pr-5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="recent">Newest</option>
                <option value="price-low">Price ↑</option>
                <option value="price-high">Price ↓</option>
              </select>
              <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none rotate-90" />
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-2.5 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !query.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 bg-BATAMART-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-BATAMART-primary" />
            </div>
            <h3 className="text-base font-black text-gray-800 mb-1">What are you looking for?</h3>
            <p className="text-xs text-gray-400 max-w-xs">Try "iPhone 128GB", "Black hoodie", or "Used laptop"</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="text-base font-black text-gray-800 mb-1">No results found</h3>
            <p className="text-xs text-gray-400 max-w-xs mb-4">No products match "<span className="font-semibold text-gray-600">{query}</span>". Try fewer or different keywords.</p>
            <button onClick={() => router.push('/marketplace')} className="inline-flex items-center gap-2 bg-BATAMART-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md">
              Browse Marketplace <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((product) => {
              const tags = parseTags(product.description)
              const matchedTags = tags.filter((t: string) => queryTokens.some(q => t.toLowerCase().includes(q)))
              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <img
                      src={product.images[0] || '/placeholder.png'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-2.5 flex flex-col flex-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{product.category}</p>
                    <h3 className="font-bold text-gray-900 line-clamp-2 text-xs leading-snug group-hover:text-BATAMART-primary transition-colors flex-1">
                      {product.name}
                    </h3>
                    {matchedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {matchedTags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-BATAMART-primary/10 text-BATAMART-primary text-[9px] font-bold rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
                      <p className="text-BATAMART-primary font-black text-sm tracking-tight">{formatPrice(product.price)}</p>
                      <div className="flex items-center justify-between gap-1">
                        <StarRating rating={product.seller.avgRating} />
                        <TrustPill level={product.seller.trustLevel} />
                      </div>
                      <Link
                        href={`/seller/${product.seller.id}`}
                        className="text-[10px] font-semibold text-gray-500 hover:text-BATAMART-primary truncate block transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        {product.seller.name}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPageWrapper() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  )
}