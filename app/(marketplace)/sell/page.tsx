'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Plus } from 'lucide-react'

const CATEGORIES = [
  'Fashion & Clothing',
  'Food Services',
  'Room Essentials',
  'School Supplies',
  'Tech Gadgets',
  'Cosmetics',
  'Snacks',
  'Deodorants',
  'Books',
  'Furniture',
]

const HOSTELS = [
  'Aroma',
  'Tempsite',
  'Express Gate',
  'Ifite',
  'Amansea',
  'Bus Stand (Inside School)',
  'School Hostel (Inside School)',
]

// Category-specific tag suggestions
const TAG_SUGGESTIONS: Record<string, string[]> = {
  'Tech Gadgets': ['New', 'Used', 'Refurbished', '128GB', '256GB', '64GB', 'Black', 'White', 'Gold', 'Silver', 'Battery Health 90%', 'Battery Health 80%', 'iPhone 13', 'iPhone 14', 'Samsung', 'Unlocked', 'Charger Included', 'Original Box'],
  'Fashion & Clothing': ['New', 'Used', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Unisex', 'Male', 'Female'],
  'Food Services': ['Spicy', 'Mild', 'Vegetarian', 'Chicken', 'Beef', 'Fish', 'Rice', 'Pasta', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Homemade', 'Fresh Daily'],
  'Room Essentials': ['New', 'Used', 'Single', 'Double', 'Small', 'Medium', 'Large', 'Electric', 'Manual', 'Foldable'],
  'School Supplies': ['New', 'Used', '100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Engineering', 'Law', 'Medicine', 'Sciences', 'Arts'],
  'Cosmetics': ['For Men', 'For Women', 'Unisex', 'Natural', 'Organic', 'Original', 'New', 'Sealed'],
  'Snacks': ['Homemade', 'Packaged', 'Sweet', 'Savory', 'Spicy', 'Fresh', 'Vegan'],
  'Deodorants': ['For Men', 'For Women', 'Unisex', 'Roll-on', 'Spray', 'Original', 'New', 'Sealed'],
  'Books': ['New', 'Used', 'Good Condition', 'Fair Condition', 'Hardcover', 'Paperback', '100 Level', '200 Level', '300 Level', '400 Level'],
  'Furniture': ['New', 'Used', 'Good Condition', 'Foldable', 'Wooden', 'Plastic', 'Metal', 'Single', 'Double'],
}

export default function SellPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState('')
  const [images, setImages] = useState<{ preview: string; url: string; uploading: boolean }[]>([])

  // Tag input state
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: '1',
    category: '',
    hostelName: '',
    roomNumber: '',
    landmark: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.push('/login')
    else setCheckingAuth(false)
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-bata-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) { setTagInput(''); return }
    if (tags.length >= 20) { setError('Maximum 20 tags allowed'); return }
    setTags(prev => [...prev, trimmed])
    setTagInput('')
    setError('')
  }

  const removeTag = (index: number) => {
    setTags(prev => prev.filter((_, i) => i !== index))
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const suggestions = formData.category
    ? (TAG_SUGGESTIONS[formData.category] || []).filter(s => !tags.includes(s))
    : []

  const uploadToCloudinary = async (base64: string): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await response.json()
      if (!response.ok) return null
      return data.url
    } catch { return null }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const remaining = 3 - images.length
    const filesToProcess = Array.from(files).slice(0, remaining)
    for (const file of filesToProcess) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        setImages(prev => [...prev, { preview: base64, url: '', uploading: true }])
        const cloudUrl = await uploadToCloudinary(base64)
        if (cloudUrl) {
          setImages(prev => prev.map(img => img.preview === base64 ? { preview: base64, url: cloudUrl, uploading: false } : img))
        } else {
          setImages(prev => prev.filter(img => img.preview !== base64))
          setError('Failed to upload one of your images. Please try again.')
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index))
  const allUploaded = images.length > 0 && images.every(img => !img.uploading)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (images.length < 1) { setError('Please add at least 1 product image'); return }
    if (!allUploaded) { setError('Please wait for all images to finish uploading'); return }
    if (tags.length === 0) { setError('Please add at least 1 description tag (e.g. New, 128GB, Black)'); return }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const imageUrls = images.map(img => img.url)
      // Join tags as pipe-separated string — no DB migration needed
      const description = tags.join(' | ')

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          description,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          images: imageUrls,
        }),
      })

      const data = await response.json()
      if (response.ok) router.push('/my-shop')
      else setError(data.error || 'Failed to create product')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-bata-primary hover:underline mb-4 inline-block">← Back to Home</Link>
          <h1 className="text-3xl font-bold text-gray-900">Sell Your Product</h1>
          <p className="text-gray-600 mt-2">List your item on BATA marketplace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Product Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                placeholder="e.g., iPhone 13 Pro"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                required min="0" step="0.01"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                placeholder="e.g., 50000"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quantity Available <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                required min="1"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">How many units do you have in stock?</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* ── Description Tags ── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Product Details / Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Type a detail and press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[11px]">Enter</kbd> or click <strong>Add</strong> to add it as a tag. Buyers can search by these tags.
              </p>

              {/* Tag chips display + input */}
              <div
                className="min-h-[56px] w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus-within:border-bata-primary transition-colors cursor-text flex flex-wrap gap-2 items-center"
                onClick={() => tagInputRef.current?.focus()}
              >
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-bata-primary/10 text-bata-primary text-sm font-semibold rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeTag(i) }}
                      className="hover:text-red-500 transition-colors ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? 'e.g. New, 128GB, Black, XL...' : 'Add more...'}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 min-w-[100px]"
                  />
                  {tagInput.trim() && (
                    <button
                      type="button"
                      onClick={() => addTag(tagInput)}
                      className="flex items-center gap-1 px-3 py-1 bg-bata-primary text-white text-xs font-bold rounded-full hover:bg-bata-dark transition-colors flex-shrink-0"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
              </div>

              {/* Quick suggestion chips */}
              {suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 12).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTag(s)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-bata-primary/10 hover:text-bata-primary text-gray-600 text-xs font-semibold rounded-full transition-all border border-gray-200 hover:border-bata-primary/30"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tags.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">{tags.length} tag{tags.length !== 1 ? 's' : ''} added</p>
              )}
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Images <span className="text-red-500">*</span>
              </label>
              <div className="space-y-4">
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {images.map((img, index) => (
                      <div key={index} className="relative">
                        <img src={img.preview} alt={`Product ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        {img.uploading && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                          </div>
                        )}
                        {!img.uploading && img.url && (
                          <div className="absolute top-2 left-2 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {!img.uploading && (
                          <button type="button" onClick={() => removeImage(index)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-sm font-bold">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {images.length < 3 && (
                  <label className="block cursor-pointer">
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-bata-primary transition-colors">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-gray-600 font-medium">Click to upload images</p>
                      <p className="text-sm text-gray-500 mt-1">{images.length}/3 images · JPG, PNG, WEBP</p>
                    </div>
                  </label>
                )}
                {images.some(img => img.uploading) && (
                  <p className="text-sm text-bata-primary font-medium">⏳ Uploading images, please wait...</p>
                )}
              </div>
            </div>

            {/* Pickup Location */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Pickup Location</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hostel/Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.hostelName}
                    onChange={e => setFormData({ ...formData, hostelName: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  >
                    <option value="">Select hostel</option>
                    {HOSTELS.map(hostel => <option key={hostel} value={hostel}>{hostel}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                    placeholder="e.g., Room 12, Block A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Landmark <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={e => setFormData({ ...formData, landmark: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                    placeholder="e.g., Near the water dispenser"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !allUploaded}
              className="w-full bg-bata-primary hover:bg-bata-dark text-white py-3.5 rounded-lg font-bold text-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Listing Product...' : !allUploaded && images.length > 0 ? 'Uploading images...' : 'List Product'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}