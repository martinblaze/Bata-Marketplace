'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  const [referralCode, setReferralCode] = useState('')
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref.trim().toUpperCase())
  }, [searchParams])

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters'
    if (!/\d/.test(pwd)) return 'Password must contain at least one number'
    return ''
  }

  const validatePhone = (ph: string) => {
    const digits = ph.replace(/\D/g, '')
    if (digits.length < 10) return 'Enter a valid phone number'
    if (digits.length > 15) return 'Enter a valid phone number'
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
          referralCode: referralCode || undefined,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('userName', data.user.name)
        localStorage.setItem('userRole', data.user.role)
        window.dispatchEvent(new Event('auth-change'))
        router.push(data.user.hostelName ? '/marketplace' : '/profile/setup')
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = 3

  const BATAMARTLogo = () => (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}>
          <span className="text-white font-black text-xl">B</span>
        </div>
        <span className="text-2xl font-black text-gray-900">BATAMART</span>
      </div>
      <h1 className="text-xl font-bold text-gray-800">Create Account</h1>
      <p className="text-sm text-gray-500 mt-1">Step {step} of {totalSteps}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <BATAMARTLogo />

        <div className="space-y-4">

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                <div className="flex">
                  <span className="flex items-center px-3 border-2 border-r-0 border-gray-200 rounded-l-lg bg-gray-50 text-gray-500 text-sm font-semibold">
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
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-r-lg focus:border-BATAMART-primary focus:outline-none"
                    placeholder="08012345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                  placeholder="you@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">A verification code will be sent to this email</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Referral Code <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.trim().toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none font-mono tracking-widest uppercase"
                  placeholder="BATAMART-XXXXXX"
                  maxLength={11}
                />
                {referralCode && (
                  <p className="text-xs text-green-600 font-semibold mt-1">🎉 Referral code applied!</p>
                )}
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantToSell}
                    onChange={(e) => setWantToSell(e.target.checked)}
                    className="h-5 w-5 text-BATAMART-primary focus:ring-BATAMART-primary border-gray-300 rounded mt-0.5"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    I want to sell products on BATAMART
                  </span>
                </label>
                {wantToSell && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-1">
                    <p className="font-bold">🎉 Welcome Seller!</p>
                    <ul className="space-y-0.5 list-disc list-inside">
                      <li>List products for sale immediately</li>
                      <li>Get paid securely via escrow</li>
                      <li>Free to list — no fees</li>
                      <li>🔐 PIN required for withdrawals</li>
                    </ul>
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-white font-bold rounded-lg transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-500">
                Code sent to <span className="font-semibold text-gray-800">{email}</span>
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Enter 6-Digit Code</label>
                <div className="flex gap-2 justify-center">
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
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none transition-colors"
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full py-3.5 text-white font-bold rounded-lg transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError('') }}
                  className="text-sm text-gray-500 hover:text-BATAMART-primary transition-colors"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleSendOTP as any}
                  className="text-sm text-BATAMART-primary hover:underline font-semibold"
                >
                  Resend code
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Create Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                  placeholder="Min 8 characters, include a number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                  placeholder="Repeat your password"
                />
              </div>

              {wantToSell && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium">
                  ✅ Signing up as a Seller — You can set your withdrawal PIN after signup.
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-BATAMART-primary focus:ring-BATAMART-primary border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600">
                  I have read and agree to BATAMART's{' '}
                  <Link href="/terms/buyers" className="text-BATAMART-primary hover:underline font-semibold">
                    Terms & Conditions
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-BATAMART-primary hover:underline font-semibold">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="w-full py-3.5 text-white font-bold rounded-lg transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}
              >
                {loading
                  ? 'Creating account...'
                  : wantToSell
                    ? '🎉 Create Seller Account'
                    : 'Complete Signup'}
              </button>

              {!agreedToTerms && (
                <p className="text-xs text-amber-600 text-center">
                  Please agree to the Terms & Conditions to continue
                </p>
              )}
            </form>
          )}

          <p className="text-center text-sm text-gray-500 pt-2">
            Already have an account?{' '}
            <Link href="/login" className="text-BATAMART-primary font-semibold hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-BATAMART-primary border-t-transparent" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}