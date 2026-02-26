'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RiderSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'uploading'>('form')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [idDocument, setIdDocument] = useState<string>('')
  const [idPreview, setIdPreview] = useState<string>('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setIdDocument(base64)
      setIdPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!/\d/.test(formData.password)) {
      setError('Password must contain at least one number')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!idDocument) {
      setError('Please upload your ID document')
      return
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms & Conditions to continue')
      return
    }

    setLoading(true)
    setError('')
    setStep('uploading')

    try {
      const response = await fetch('/api/riders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          idDocument,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/rider/login?registered=true')
      } else {
        setError(data.error || 'Registration failed')
        setStep('form')
      }
    } catch {
      setError('Network error. Please try again.')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-bata-primary to-bata-secondary rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h18v4H3V3zm0 6h18v12H3V9zm2 2v8h14v-8H5zm2 2h10v4H7v-4z"/>
              </svg>
            </div>
            <span className="font-bold text-2xl bg-gradient-to-r from-bata-primary to-bata-secondary bg-clip-text text-transparent">BATA</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Rider</h1>
          <p className="text-gray-600">Earn <span className="font-bold text-bata-primary">₦560</span> per delivery!</p>
        </div>

        {/* Earnings info */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-800 text-sm font-semibold mb-1">💰 How it works</p>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• Pick up orders from sellers on campus</li>
            <li>• Deliver to buyers at their hostel</li>
            <li>• Earn ₦560 per completed delivery</li>
            <li>• Withdraw earnings anytime to your bank</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {step === 'uploading' ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-bata-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold text-lg">Creating your account...</p>
              <p className="text-gray-500 text-sm mt-2">Uploading your ID document</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="you@gmail.com"
                />
                <p className="text-xs text-gray-500 mt-1">You'll use this to log in</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="08012345678"
                />
                <p className="text-xs text-gray-500 mt-1">📞 Buyers will call this number for delivery</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="Enter password"
                />
                <p className="text-xs text-gray-500 mt-1">Min 8 characters, must include a number</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="Confirm your password"
                />
              </div>

              {/* ID Document */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Student ID / Valid ID <span className="text-red-500">*</span>
                </label>

                {idPreview ? (
                  <div className="relative">
                    <img
                      src={idPreview}
                      alt="ID Document"
                      className="w-full h-48 object-cover rounded-lg border-2 border-green-300"
                    />
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      ✓ ID uploaded
                    </div>
                    <button
                      type="button"
                      onClick={() => { setIdDocument(''); setIdPreview('') }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 font-bold text-lg"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-bata-primary transition-colors">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-gray-700 font-semibold">Upload Student ID or Valid ID</p>
                      <p className="text-sm text-gray-500 mt-1">Take a clear photo of your ID card</p>
                    </div>
                  </label>
                )}
              </div>

              {/* ── Terms & Conditions ── */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <input
                    id="agreeTermsRider"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-bata-primary focus:ring-bata-primary border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="agreeTermsRider" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                    I have read and agree to BATA's{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-bata-primary font-semibold hover:underline"
                    >
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-bata-primary font-semibold hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="w-full bg-bata-primary hover:bg-bata-dark text-white py-3.5 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Creating Account...' : 'Register as Rider'}
              </button>

              {!agreedToTerms && (
                <p className="text-center text-xs text-gray-400">
                  Please agree to the Terms & Conditions to continue
                </p>
              )}

            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already a rider?{' '}
              <Link href="/rider/login" className="text-bata-primary font-semibold hover:underline">
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}