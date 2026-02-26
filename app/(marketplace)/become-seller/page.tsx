// app/(marketplace)/become-seller/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const FaceVerification = dynamic(() => import('@/components/ui/FaceVerification'), { ssr: false })

type FlowStep = 'info' | 'face_scan' | 'saving_face' | 'done'

export default function BecomeSellerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [flowStep, setFlowStep] = useState<FlowStep>('info')
  const [showFaceScan, setShowFaceScan] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    } else {
      setCheckingAuth(false)
    }
  }, [])

  // Step 1: User clicks "Become a Seller" → show face scan
  const handleBecomeSeller = () => {
    setError('')
    setShowFaceScan(true)
  }

  // Step 2: Face scan succeeds → save descriptor, then call become-seller API
  const handleFaceScanSuccess = async (descriptor?: Float32Array) => {
    setShowFaceScan(false)
    setFlowStep('saving_face')
    setError('')

    if (!descriptor) {
      setError('Could not capture face data. Please try again.')
      setFlowStep('info')
      return
    }

    try {
      const token = localStorage.getItem('token')

      // 1. Save face descriptor
      const faceResponse = await fetch('/api/auth/save-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      })

      if (!faceResponse.ok) {
        const d = await faceResponse.json()
        throw new Error(d.error || 'Failed to save face data')
      }

      // 2. Upgrade to seller
      setLoading(true)
      const sellerResponse = await fetch('/api/auth/become-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const sellerData = await sellerResponse.json()

      if (!sellerResponse.ok) {
        throw new Error(sellerData.error || 'Failed to become seller')
      }

      // Success
      localStorage.setItem('userRole', 'SELLER')
      window.dispatchEvent(new Event('auth-change'))
      setFlowStep('done')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setFlowStep('info')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bata-primary border-t-transparent"></div>
      </div>
    )
  }

  // Success state
  if (flowStep === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">You're a Seller!</h1>
          <p className="text-gray-600 mb-2">Your face ID has been registered.</p>
          <p className="text-gray-500 text-sm mb-8">
            You can now list products. Your face will be verified every time you request a withdrawal.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/sell')}
              className="w-full bg-gradient-to-r from-bata-primary to-bata-secondary text-white py-3.5 rounded-xl font-bold text-lg shadow-lg"
            >
              🛍️ List My First Product
            </button>
            <button
              onClick={() => router.push('/marketplace')}
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50"
            >
              Go to Marketplace
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Saving state
  if (flowStep === 'saving_face') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-bata-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Setting up your seller account...</h2>
          <p className="text-gray-500 text-sm">Saving face ID and upgrading your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-bata-primary hover:underline mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Seller</h1>
          <p className="text-gray-600 mb-8">Start selling your products to thousands of students on campus</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 text-lg mb-4">✨ Seller Benefits</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Earn Money:</strong> Turn unused items into cash</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Secure Payments:</strong> Escrow system protects your earnings</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Built-in Delivery:</strong> Rider network handles logistics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Trust System:</strong> Build reputation with ratings</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>No Listing Fees:</strong> Completely free to list products</span>
                </li>
              </ul>
            </div>

            {/* Face ID notice */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="font-bold text-indigo-900 text-lg mb-3">🔐 Face ID Security</h3>
              <p className="text-indigo-800 text-sm mb-3">
                To protect your earnings, BATA requires a one-time face scan when you become a seller.
                Your face will then be used to verify <strong>every withdrawal request</strong> — so only you can access your money.
              </p>
              <ul className="text-xs text-indigo-700 space-y-1">
                <li>• Takes less than 30 seconds</li>
                <li>• Turn head left & right, blink, open mouth</li>
                <li>• Stored securely — never shared</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-bold text-yellow-900 text-lg mb-4">📋 Seller Requirements</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• You must be a verified student</li>
                <li>• Products must comply with campus policies</li>
                <li>• You need to complete your profile with delivery address</li>
                <li>• You're responsible for accurate product descriptions</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-bold text-green-900 text-lg mb-4">💸 How It Works</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
                  <p className="font-medium">List Your Product</p>
                  <p className="text-sm text-gray-600 mt-1">Add photos, description, price</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
                  <p className="font-medium">Buyer Orders</p>
                  <p className="text-sm text-gray-600 mt-1">Payment held in escrow</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
                  <p className="font-medium">Get Paid</p>
                  <p className="text-sm text-gray-600 mt-1">Receive payment after delivery</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <button
                onClick={handleBecomeSeller}
                disabled={loading}
                className="w-full bg-gradient-to-r from-bata-primary to-bata-secondary hover:from-bata-dark hover:to-bata-dark text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? 'Processing...' : '🔐 Scan Face & Become a Seller'}
              </button>

              <p className="text-center text-gray-500 text-sm mt-4">
                By becoming a seller, you agree to our{' '}
                <Link href="/terms/sellers" className="text-bata-primary hover:underline">
                  Seller Terms & Conditions
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Face scan modal */}
      {showFaceScan && (
        <FaceVerification
          mode="register"
          title="🔐 Register Your Face"
          subtitle="One-time setup to protect your withdrawals"
          onSuccess={handleFaceScanSuccess}
          onCancel={() => setShowFaceScan(false)}
        />
      )}
    </div>
  )
}