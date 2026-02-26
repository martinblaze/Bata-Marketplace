'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const FaceVerification = dynamic(() => import('@/components/ui/FaceVerification'), { ssr: false })

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [wantToSell, setWantToSell] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showFaceScan, setShowFaceScan] = useState(false)
  const [faceRegistered, setFaceRegistered] = useState(false)
  const [faceLoading, setFaceLoading] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters'
    if (!/\d/.test(pwd)) return 'Password must contain at least one number'
    return ''
  }

  const validatePhone = (ph: string) => {
    const digits = ph.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 15) return 'Enter a valid phone number'
    return ''
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    const phoneError = validatePhone(phone)
    if (phoneError) { setError(phoneError); return }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (response.ok) {
        setStep(2)
      } else {
        setError(data.error || 'Failed to send OTP')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  // ── UPDATED: now verifies OTP against server before proceeding ──
  const handleVerifyOTP = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode: code }),
      })

      const data = await response.json()
      if (response.ok) {
        setStep(3)
      } else {
        setError(data.error || 'Invalid or expired code. Please try again.')
        // Clear OTP fields so they can re-enter
        setOtp(['', '', '', '', '', ''])
        document.getElementById('otp-0')?.focus()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const pwdError = validatePassword(password)
    if (pwdError) { setError(pwdError); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (!agreedToTerms) { setError('You must agree to the Terms & Conditions to continue'); return }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/signup-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone,
          password,
          otpCode: otp.join(''),
          role: wantToSell ? 'SELLER' : 'BUYER',
        }),
      })

      const data = await response.json()
      if (response.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('userName', data.user.name)
        localStorage.setItem('userRole', data.user.role)
        window.dispatchEvent(new Event('auth-change'))

        if (wantToSell) {
          setCreatedToken(data.token)
          setStep(4)
        } else {
          router.push(data.user.hostelName ? '/marketplace' : '/profile/setup')
        }
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFaceScanSuccess = async (descriptor?: Float32Array) => {
    setShowFaceScan(false)
    if (!descriptor) {
      setError('Could not capture face data. Please try again.')
      return
    }

    setFaceLoading(true)
    setError('')

    try {
      // Use localStorage directly — simpler and avoids state timing issues
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/save-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      })

      const data = await response.json()
      if (response.ok) {
        setFaceRegistered(true)
      } else {
        setError(data.error || 'Failed to save face data')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setFaceLoading(false)
    }
  }

  const handleCompleteFaceStep = () => {
    router.push('/profile/setup')
  }

  const handleSkipFace = () => {
    if (confirm('⚠️ Without face registration, you will not be able to withdraw funds from your wallet. You can register later in your profile settings. Continue anyway?')) {
      router.push('/profile/setup')
    }
  }

  const totalSteps = wantToSell ? 4 : 3

  const BataLogo = () => (
    <div className="text-center mb-8">
      <div className="inline-flex items-center space-x-2 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-bata-primary to-bata-secondary rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h18v4H3V3zm0 6h18v12H3V9zm2 2v8h14v-8H5zm2 2h10v4H7v-4z"/>
          </svg>
        </div>
        <span className="font-bold text-2xl bg-gradient-to-r from-bata-primary to-bata-secondary bg-clip-text text-transparent">BATA</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
      <p className="text-gray-500">Step {step} of {totalSteps}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <BataLogo />

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* ── Step 1: Name + Phone + Email ── */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border-2 border-r-0 border-gray-200 rounded-l-lg bg-gray-50 text-gray-500 text-sm font-medium">
                    +234
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '')
                      setPhone(digits)
                    }}
                    required
                    maxLength={11}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-r-lg focus:border-bata-primary focus:outline-none"
                    placeholder="08012345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="you@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">A verification code will be sent to this email</p>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center">
                  <input
                    id="wantToSell"
                    type="checkbox"
                    checked={wantToSell}
                    onChange={(e) => setWantToSell(e.target.checked)}
                    className="h-5 w-5 text-bata-primary focus:ring-bata-primary border-gray-300 rounded"
                  />
                  <label htmlFor="wantToSell" className="ml-3 text-sm font-medium text-gray-700">
                    I want to sell products on BATA
                  </label>
                </div>
                {wantToSell && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-medium mb-1">🎉 Welcome Seller!</p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• List products for sale immediately</li>
                      <li>• Get paid securely via escrow</li>
                      <li>• Free to list — no fees</li>
                      <li>• 🔐 Face ID required for withdrawals</li>
                    </ul>
                  </div>
                )}
              </div>

              {error && <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-bata-primary hover:bg-bata-dark text-white py-3.5 rounded-lg font-bold text-lg disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP — now verified against server ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Code sent to <span className="font-semibold text-gray-900">{email}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">Enter 6-Digit Code</label>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none transition-colors"
                    />
                  ))}
                </div>
              </div>

              {error && <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">{error}</p>}

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.join('').length !== 6}
                className="w-full bg-bata-primary hover:bg-bata-dark text-white py-3.5 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify Code'}
              </button>

              <div className="text-center space-y-2">
                <button
                  onClick={() => { setStep(1); setOtp(['','','','','','']); setError('') }}
                  className="text-sm text-gray-500 hover:text-bata-primary transition-colors"
                >
                  ← Change email
                </button>
                <div>
                  <button
                    onClick={handleSendOTP as unknown as React.MouseEventHandler}
                    disabled={loading}
                    className="text-sm text-bata-primary hover:underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </div>

              {!process.env.NEXT_PUBLIC_PRODUCTION && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800 text-center">Dev mode: Check terminal for OTP code</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Password + T&C ── */}
          {step === 3 && (
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Create Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="Min 8 characters, include a number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-bata-primary focus:outline-none"
                  placeholder="Repeat your password"
                />
              </div>

              {wantToSell && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">✅ Signing up as a Seller</p>
                  <p className="text-xs text-green-700 mt-1">Next: Quick face scan to secure your withdrawals.</p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <input
                    id="agreeTerms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-bata-primary focus:ring-bata-primary border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="agreeTerms" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                    I have read and agree to BATA's{' '}
                    <Link href="/terms" target="_blank" className="text-bata-primary font-semibold hover:underline">
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="text-bata-primary font-semibold hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>

              {error && <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="w-full bg-bata-primary hover:bg-bata-dark text-white py-3.5 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading
                  ? 'Creating account...'
                  : wantToSell
                  ? '🎉 Create Seller Account'
                  : 'Complete Signup'}
              </button>

              {!agreedToTerms && (
                <p className="text-center text-xs text-gray-400">
                  Please agree to the Terms & Conditions to continue
                </p>
              )}
            </form>
          )}

          {/* ── Step 4: Face Registration (sellers only) ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔐</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Register Your Face</h2>
                <p className="text-sm text-gray-600">
                  As a seller, your face is used to verify your identity when you withdraw money — keeping your earnings safe.
                </p>
              </div>

              {faceRegistered ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="font-bold text-green-800 text-lg">Face Registered!</p>
                  <p className="text-green-700 text-sm mt-1">Your face ID is securely saved.</p>
                </div>
              ) : (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-sm text-indigo-800 font-medium mb-3">📋 What you'll do:</p>
                  <ul className="text-xs text-indigo-700 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-800 font-bold flex-shrink-0">1</span>
                      Look straight at the camera
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-800 font-bold flex-shrink-0">2</span>
                      Turn your head left, then right
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-800 font-bold flex-shrink-0">3</span>
                      Blink your eyes slowly
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-800 font-bold flex-shrink-0">4</span>
                      Open your mouth wide
                    </li>
                  </ul>
                </div>
              )}

              {error && <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</p>}

              {faceLoading && (
                <div className="text-center py-2">
                  <div className="inline-block w-6 h-6 border-2 border-bata-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 mt-2">Saving face data...</p>
                </div>
              )}

              {faceRegistered ? (
                <button
                  onClick={handleCompleteFaceStep}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-lg font-bold text-lg transition"
                >
                  Continue to Profile Setup →
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowFaceScan(true)}
                    disabled={faceLoading}
                    className="w-full bg-bata-primary hover:bg-bata-dark text-white py-3.5 rounded-lg font-bold text-lg disabled:opacity-50 transition"
                  >
                    {faceLoading ? 'Saving...' : '📸 Start Face Scan'}
                  </button>
                  <button
                    onClick={handleSkipFace}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
                  >
                    Skip for now (not recommended)
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-bata-primary font-semibold hover:underline">Login</Link>
            </p>
          </div>
        </div>
      </div>

      {showFaceScan && (
        <FaceVerification
          mode="register"
          title="🔐 Register Your Face"
          subtitle="Complete all 4 liveness checks to secure your account"
          onSuccess={handleFaceScanSuccess}
          onCancel={() => setShowFaceScan(false)}
        />
      )}
    </div>
  )
}