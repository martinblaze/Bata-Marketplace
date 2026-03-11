// app/(marketplace)/wallet/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const FaceVerification = dynamic(() => import('@/components/ui/FaceVerification'), { ssr: false })

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  reference: string
  createdAt: string
  balanceBefore: number
  balanceAfter: number
}

interface WalletData {
  availableBalance: number
  pendingBalance: number
  completedOrders: number
  role: string
}

interface User {
  id: string
  name: string
  phone: string
  email?: string
  hasFaceId: boolean
  hasWithdrawalPin: boolean
}

interface Bank {
  code: string
  name: string
}

const NIGERIAN_BANKS: Bank[] = [
  { code: '999992', name: 'OPay' },
  { code: '999991', name: 'PalmPay' },
  { code: '50211',  name: 'Kuda Bank' },
  { code: '50515',  name: 'Moniepoint MFB' },
  { code: '565',    name: 'Carbon (One Finance)' },
  { code: '566',    name: 'VFD Microfinance Bank (VBank)' },
  { code: '035A',   name: 'ALAT by WEMA' },
  { code: '125',    name: 'Rubies MFB' },
  { code: '51269',  name: 'Tangerine Money' },
  { code: '51310',  name: 'Sparkle Microfinance Bank' },
  { code: '50126',  name: 'Eyowo' },
  { code: '100002', name: 'Paga' },
  { code: '100022', name: 'GoMoney' },
  { code: '311',    name: 'Parkway ReadyCash' },
  { code: '100039', name: 'Titan Paystack' },
  { code: '057',    name: 'Zenith Bank' },
  { code: '058',    name: 'Guaranty Trust Bank (GTBank)' },
  { code: '033',    name: 'United Bank for Africa (UBA)' },
  { code: '011',    name: 'First Bank of Nigeria' },
  { code: '044',    name: 'Access Bank' },
  { code: '063',    name: 'Access Bank (Diamond)' },
  { code: '050',    name: 'Ecobank Nigeria' },
  { code: '070',    name: 'Fidelity Bank' },
  { code: '214',    name: 'First City Monument Bank (FCMB)' },
  { code: '030',    name: 'Heritage Bank' },
  { code: '082',    name: 'Keystone Bank' },
  { code: '076',    name: 'Polaris Bank' },
  { code: '101',    name: 'Providus Bank' },
  { code: '221',    name: 'Stanbic IBTC Bank' },
  { code: '068',    name: 'Standard Chartered Bank' },
  { code: '232',    name: 'Sterling Bank' },
  { code: '032',    name: 'Union Bank of Nigeria' },
  { code: '215',    name: 'Unity Bank' },
  { code: '035',    name: 'Wema Bank' },
  { code: '023',    name: 'Citibank Nigeria' },
  { code: '100',    name: 'Suntrust Bank' },
  { code: '302',    name: 'TAJ Bank' },
  { code: '303',    name: 'Lotus Bank' },
  { code: '104',    name: 'Parallex Bank' },
  { code: '105',    name: 'PremiumTrust Bank' },
  { code: '102',    name: 'Titan Trust Bank' },
  { code: '502',    name: 'Rand Merchant Bank' },
  { code: '301',    name: 'Jaiz Bank' },
  { code: '00103',  name: 'Globus Bank' },
  { code: '559',    name: 'Coronation Merchant Bank' },
  { code: '501',    name: 'FSDH Merchant Bank' },
  { code: '120001', name: '9mobile 9Payment Service Bank' },
  { code: '120002', name: 'HopePSB' },
  { code: '120003', name: 'MTN MoMo PSB' },
  { code: '120004', name: 'Airtel Smartcash PSB' },
  { code: '801',    name: 'Abbey Mortgage Bank' },
  { code: '401',    name: 'ASO Savings and Loans' },
  { code: '031',    name: 'Living Trust Mortgage Bank' },
  { code: '812',    name: 'Gateway Mortgage Bank' },
  { code: '90067',  name: 'Refuge Mortgage Bank' },
  { code: '51204',  name: 'Above Only MFB' },
  { code: '51312',  name: 'Abulesoro MFB' },
  { code: '50926',  name: 'Amju Unique MFB' },
  { code: '50083',  name: 'Aramoko MFB' },
  { code: '50931',  name: 'Bowen Microfinance Bank' },
  { code: '50823',  name: 'CEMCS Microfinance Bank' },
  { code: '50171',  name: 'Chanelle Microfinance Bank' },
  { code: '50204',  name: 'Corestep MFB' },
  { code: '51297',  name: 'Crescent MFB' },
  { code: '50263',  name: 'Ekimogun MFB' },
  { code: '562',    name: 'Ekondo Microfinance Bank' },
  { code: '51314',  name: 'Firmus MFB' },
  { code: '51251',  name: 'Hackman Microfinance Bank' },
  { code: '50383',  name: 'Hasal Microfinance Bank' },
  { code: '51244',  name: 'Ibile Microfinance Bank' },
  { code: '50439',  name: 'Ikoyi Osun MFB' },
  { code: '50457',  name: 'Infinity MFB' },
  { code: '50502',  name: 'Kadpoly MFB' },
  { code: '50200',  name: 'Kredi Money MFB' },
  { code: '90052',  name: 'Lagos Building Investment Company' },
  { code: '50549',  name: 'Links MFB' },
  { code: '50563',  name: 'Mayfair MFB' },
  { code: '50304',  name: 'Mint MFB' },
  { code: '50746',  name: 'Petra Microfinance Bank' },
  { code: '50864',  name: 'Polyunwana MFB' },
  { code: '51293',  name: 'QuickFund MFB' },
  { code: '51113',  name: 'Safe Haven MFB' },
  { code: '50800',  name: 'Solid Rock MFB' },
  { code: '51253',  name: 'Stellas MFB' },
  { code: '51211',  name: 'TCF MFB' },
  { code: '50871',  name: 'Unical MFB' },
]

const TX_LABEL: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  CREDIT:     { label: 'Credit',     color: 'text-emerald-700', bg: 'bg-emerald-50',  sign: '+' },
  DEBIT:      { label: 'Debit',      color: 'text-red-600',     bg: 'bg-red-50',      sign: '−' },
  WITHDRAWAL: { label: 'Withdrawal', color: 'text-red-600',     bg: 'bg-red-50',      sign: '−' },
  ESCROW:     { label: 'Escrow',     color: 'text-amber-700',   bg: 'bg-amber-50',    sign: '' },
}

type AuthMethod = 'face' | 'pin'

export default function WalletPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)

  const [authToken, setAuthToken] = useState<string>('')

  // ── faceToken: short-lived proof that THIS user's face was just verified ────
  // Received from FaceVerification component after backend confirms a match.
  // Sent along with the withdrawal request and consumed server-side (single-use).
  const [faceToken, setFaceToken] = useState<string | null>(null)

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [selectedBank, setSelectedBank] = useState<Bank>(NIGERIAN_BANKS[0])
  const [bankSearch, setBankSearch] = useState('')
  const [showBankDropdown, setShowBankDropdown] = useState(false)
  const bankRef = useRef<HTMLDivElement>(null)

  const [showFaceVerify, setShowFaceVerify] = useState(false)
  const [faceError, setFaceError] = useState('')
  const [pendingWithdrawal, setPendingWithdrawal] = useState<{
    amount: number; accountNumber: string; accountName: string; bankCode: string
  } | null>(null)

  const [showFaceIdRequired, setShowFaceIdRequired] = useState(false)
  const [showFaceRegister, setShowFaceRegister] = useState(false)
  const [faceRegisterLoading, setFaceRegisterLoading] = useState(false)
  const [faceRegisterError, setFaceRegisterError] = useState('')
  const [faceRegisterSuccess, setFaceRegisterSuccess] = useState(false)

  const [authMethod, setAuthMethod] = useState<AuthMethod>('face')
  const [showPinEntry, setShowPinEntry] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  const [showSetPin, setShowSetPin] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [savePinLoading, setSavePinLoading] = useState(false)
  const [savePinError, setSavePinError] = useState('')
  const [savePinSuccess, setSavePinSuccess] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bankRef.current && !bankRef.current.contains(e.target as Node)) {
        setShowBankDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { fetchWalletData() }, [])

  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      setAuthToken(token)
      const [uR, wR, tR] = await Promise.all([
        fetch('/api/auth/me',             { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wallet',              { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wallet/transactions', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [u, w, t] = await Promise.all([uR.json(), wR.json(), tR.json()])
      if (uR.ok) setUser(u.user)
      if (wR.ok) setWallet(w.wallet)
      if (tR.ok) setTransactions(t.transactions || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filteredBanks = bankSearch.trim()
    ? NIGERIAN_BANKS.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
    : NIGERIAN_BANKS

  const openWithdrawModal = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        if (!data.user.hasFaceId && !data.user.hasWithdrawalPin) {
          setFaceRegisterSuccess(false)
          setFaceRegisterError('')
          setShowFaceIdRequired(true)
          return
        }
      }
    } catch { /* fall through */ }

    setWithdrawAmount('')
    setAccountNumber('')
    setAccountName('')
    setSelectedBank(NIGERIAN_BANKS[0])
    setBankSearch('')
    setFaceError('')
    setPinError('')
    setFaceToken(null) // clear any previous face token when opening modal
    setAuthMethod('face')
    setShowWithdrawModal(true)
  }

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount < 1000) { alert('Minimum withdrawal is ₦1,000'); return }
    if (!wallet || amount > wallet.availableBalance) { alert('Insufficient balance'); return }
    if (!accountNumber || !accountName) { alert('Please fill all fields'); return }
    setPendingWithdrawal({ amount, accountNumber, accountName, bankCode: selectedBank.code })
    setFaceError('')
    setPinError('')
    if (authMethod === 'pin') {
      setPinValue('')
      setShowPinEntry(true)
    } else if (!user?.hasFaceId) {
      setShowWithdrawModal(false)
      setFaceRegisterSuccess(false)
      setFaceRegisterError('')
      setShowFaceIdRequired(true)
    } else {
      setShowFaceVerify(true)
    }
  }

  // ── Face verified ─────────────────────────────────────────────────────────
  // FaceVerification calls /api/auth/verify-face internally. On success it now
  // returns (descriptor, faceToken). We store the faceToken in state and
  // immediately proceed to executeWithdrawal which sends it to /api/wallet/withdraw.
  const handleFaceVerified = async (_descriptor?: Float32Array, token?: string) => {
    setShowFaceVerify(false)
    // Store the short-lived face token for use in the withdrawal call
    const resolvedToken = token ?? null
    setFaceToken(resolvedToken)

    if (!user?.hasWithdrawalPin) {
      setShowWithdrawModal(false)
      setShowSetPin(true)
    }
    await executeWithdrawal(resolvedToken)
  }

  const handleFaceCancelled = () => {
    setShowFaceVerify(false)
    setFaceToken(null)
    if (user?.hasWithdrawalPin) {
      setFaceError('')
      setAuthMethod('pin')
      setPinValue('')
      setShowPinEntry(true)
    } else {
      setPendingWithdrawal(null)
      setFaceError('Verification cancelled. Please try again.')
    }
  }

  const handlePinSubmit = async () => {
    if (pinValue.length !== 6) { setPinError('Enter your 6-digit PIN'); return }
    setPinLoading(true)
    setPinError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/wallet/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin: pinValue }),
      })
      const data = await res.json()
      if (!res.ok) { setPinError(data.error || 'Incorrect PIN'); setPinValue(''); return }
      setShowPinEntry(false)
      // PIN path does not use faceToken — pass null explicitly
      await executeWithdrawal(null)
    } catch {
      setPinError('Network error. Please try again.')
    } finally {
      setPinLoading(false)
    }
  }

  // ── executeWithdrawal ─────────────────────────────────────────────────────
  // Accepts the faceToken directly as a parameter (instead of reading from
  // state) so it always uses the freshest value even before React re-renders.
  const executeWithdrawal = async (resolvedFaceToken: string | null) => {
    if (!pendingWithdrawal) return
    setWithdrawing(true)
    try {
      const token = localStorage.getItem('token')

      // Build the body — include faceToken only when auth method is face
      const body: Record<string, unknown> = { ...pendingWithdrawal }
      if (resolvedFaceToken) {
        body.faceToken = resolvedFaceToken
      }

      const r = await fetch('/api/wallet/withdraw', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      })
      const d = await r.json()

      if (!r.ok) {
        if (d.error === 'FACE_ID_REQUIRED') {
          setShowWithdrawModal(false)
          setPendingWithdrawal(null)
          setFaceToken(null)
          setFaceRegisterSuccess(false)
          setFaceRegisterError('')
          setShowFaceIdRequired(true)
          return
        }
        if (d.error === 'FACE_VERIFICATION_REQUIRED') {
          // Token expired or missing — clear it and force a fresh face scan
          setFaceToken(null)
          setPendingWithdrawal(null)
          setShowWithdrawModal(false)
          alert(d.message || 'Face verification required. Please scan your face again.')
          setAuthMethod('face')
          setShowWithdrawModal(true)
          return
        }
        alert(d.error || 'Withdrawal failed')
        setPendingWithdrawal(null)
        return
      }

      // ✅ Success
      setShowWithdrawModal(false)
      setShowSetPin(false)
      setPendingWithdrawal(null)
      setFaceToken(null)
      fetchWalletData()
      alert(`Withdrawal of ₦${pendingWithdrawal.amount.toLocaleString()} initiated.\nReference: ${d.reference}`)
    } catch {
      alert('Network error. Please try again.')
      setPendingWithdrawal(null)
      setFaceToken(null)
    } finally {
      setWithdrawing(false)
    }
  }

  const handleFaceRegisterSuccess = async (descriptor?: Float32Array) => {
    setShowFaceRegister(false)
    if (!descriptor) { setFaceRegisterError('Could not capture face data. Please try again.'); return }
    setFaceRegisterLoading(true)
    setFaceRegisterError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/save-face', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ descriptor: Array.from(descriptor) }),
      })
      const data = await res.json()
      if (res.ok) {
        setFaceRegisterSuccess(true)
        setUser(prev => prev ? { ...prev, hasFaceId: true } : prev)
      } else {
        setFaceRegisterError(data.error || 'Failed to save face data. Please try again.')
      }
    } catch {
      setFaceRegisterError('Network error. Please try again.')
    } finally {
      setFaceRegisterLoading(false)
    }
  }

  const handleSetPinSubmit = async () => {
    if (!/^\d{6}$/.test(newPin)) { setSavePinError('PIN must be exactly 6 digits'); return }
    if (newPin !== confirmPin) { setSavePinError('PINs do not match'); return }
    setSavePinLoading(true)
    setSavePinError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/wallet/set-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ pin: newPin }),
      })
      const data = await res.json()
      if (res.ok) {
        setSavePinSuccess(true)
        setUser(prev => prev ? { ...prev, hasWithdrawalPin: true } : prev)
        setTimeout(() => { setShowSetPin(false); setSavePinSuccess(false); setNewPin(''); setConfirmPin('') }, 2000)
      } else {
        setSavePinError(data.error || 'Failed to set PIN')
      }
    } catch {
      setSavePinError('Network error. Please try again.')
    } finally {
      setSavePinLoading(false)
    }
  }

  const closeFaceIdRequiredModal = () => {
    setShowFaceIdRequired(false)
    setFaceRegisterSuccess(false)
    setFaceRegisterError('')
  }

  if (loading || !user || !wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-bata-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 tracking-wide">Loading wallet...</p>
        </div>
      </div>
    )
  }

  const totalEarned    = transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
  const totalWithdrawn = transactions.filter(t => t.type === 'WITHDRAWAL' || t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
              <Link href="/marketplace" className="hover:text-bata-primary transition">Marketplace</Link>
              <span>/</span>
              <span className="text-gray-700 font-medium">Wallet</span>
            </div>
            <h1 className="text-base sm:text-xl font-semibold text-gray-900 leading-tight">Wallet & Payouts</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setNewPin(''); setConfirmPin(''); setSavePinError(''); setSavePinSuccess(false); setShowSetPin(true) }}
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:border-bata-primary hover:text-bata-primary text-xs sm:text-sm font-semibold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {user.hasWithdrawalPin ? 'Change PIN' : 'Set PIN'}
            </button>
            <button
              onClick={openWithdrawModal}
              className="inline-flex items-center gap-1.5 bg-bata-primary hover:bg-bata-dark text-white text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9l-5 5-5-5" />
              </svg>
              Withdraw
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Available Balance</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums">
              ₦{wallet.availableBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1.5">Ready to withdraw</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button onClick={openWithdrawModal} className="text-sm font-semibold text-bata-primary hover:underline">Withdraw →</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Pending (Escrow)</p>
            <p className="text-2xl sm:text-3xl font-bold text-amber-600 tabular-nums">
              ₦{wallet.pendingBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1.5">Released after buyer confirms delivery</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
                In transit
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Account Summary</p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total earned</span>
                <span className="text-sm font-semibold text-emerald-600">₦{totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total withdrawn</span>
                <span className="text-sm font-semibold text-gray-700">₦{totalWithdrawn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  {wallet.role === 'SELLER' ? 'Orders sold' : wallet.role === 'RIDER' ? 'Deliveries' : 'Orders placed'}
                </span>
                <span className="text-sm font-bold text-gray-900">{wallet.completedOrders}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${user.hasFaceId ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {user.hasFaceId ? '✓' : '✗'} Face ID
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${user.hasWithdrawalPin ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {user.hasWithdrawalPin ? '✓' : '!'} PIN
              </span>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Transaction History</h2>
              <p className="text-xs text-gray-400 mt-0.5">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">No transactions yet</p>
              <p className="text-xs text-gray-400 mt-1">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-3 text-right">Amount</div>
              </div>
              {transactions.map((tx) => {
                const meta = TX_LABEL[tx.type] || TX_LABEL.CREDIT
                return (
                  <div key={tx.id} className="grid grid-cols-1 md:grid-cols-12 px-6 py-4 hover:bg-gray-50 transition-colors items-center">
                    <div className="col-span-5 mb-2 md:mb-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{tx.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{tx.reference}</p>
                    </div>
                    <div className="col-span-2 mb-2 md:mb-0">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="col-span-2 mb-2 md:mb-0">
                      <p className="text-sm text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="col-span-3 text-left md:text-right">
                      <p className={`text-sm font-bold tabular-nums ${meta.color}`}>
                        {tx.type === 'ESCROW' ? '🔒 ' : meta.sign}₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 tabular-nums">Bal: ₦{tx.balanceAfter.toLocaleString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Withdraw Modal ── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95vh] sm:max-h-[92vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Withdraw Funds</h3>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <svg className="w-3 h-3 text-bata-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                  Identity verification required
                </p>
              </div>
              <button
                onClick={() => { setShowWithdrawModal(false); setPendingWithdrawal(null); setFaceToken(null); setFaceError(''); setPinError('') }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              {faceError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <p className="text-red-700 font-medium">{faceError}</p>
                    <div className="flex gap-3 mt-1.5">
                      <button onClick={() => { setFaceError(''); if (pendingWithdrawal) setShowFaceVerify(true) }} className="text-red-600 underline text-xs">
                        Try face scan again
                      </button>
                      {user.hasWithdrawalPin && (
                        <button onClick={() => { setFaceError(''); setAuthMethod('pin'); setPinValue(''); setShowPinEntry(true) }} className="text-bata-primary underline text-xs font-semibold">
                          Use PIN instead
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {user.hasWithdrawalPin && (
                <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-5">
                  <button type="button" onClick={() => setAuthMethod('face')} className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition ${authMethod === 'face' ? 'bg-bata-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                    <span>👤</span> Face ID
                  </button>
                  <button type="button" onClick={() => setAuthMethod('pin')} className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition ${authMethod === 'pin' ? 'bg-bata-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                    <span>🔢</span> PIN
                  </button>
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount <span className="text-gray-400 font-normal">(NGN)</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₦</span>
                    <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" min="1000" max={wallet.availableBalance} className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bata-primary focus:border-transparent" required />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-gray-400">Minimum: ₦1,000</p>
                    <button type="button" onClick={() => setWithdrawAmount(String(wallet.availableBalance))} className="text-xs text-bata-primary font-semibold hover:underline">Max: ₦{wallet.availableBalance.toLocaleString()}</button>
                  </div>
                </div>

                <div ref={bankRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank <span className="text-gray-400 font-normal">({NIGERIAN_BANKS.length} supported)</span></label>
                  {!showBankDropdown ? (
                    <button type="button" onClick={() => { setBankSearch(''); setShowBankDropdown(true) }} className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg text-sm hover:border-bata-primary transition text-left group">
                      <span className="font-medium text-gray-900">{selectedBank.name}</span>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-bata-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                    </button>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} placeholder="Search bank..." className="w-full pl-10 pr-4 py-3 border-2 border-bata-primary rounded-lg text-sm focus:outline-none" autoFocus />
                      </div>
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                        {filteredBanks.length === 0 ? (
                          <p className="text-center text-gray-400 py-5 text-sm">No bank found</p>
                        ) : (
                          filteredBanks.map((bank) => (
                            <button key={bank.code + bank.name} type="button" onClick={() => { setSelectedBank(bank); setBankSearch(''); setShowBankDropdown(false) }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 transition ${selectedBank.code === bank.code ? 'text-bata-primary font-semibold bg-blue-50' : 'text-gray-800'}`}>
                              <span>{bank.name}</span>
                              {selectedBank.code === bank.code && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="10-digit account number" maxLength={10} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-bata-primary focus:border-transparent" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
                  <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="As it appears on your bank account" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bata-primary focus:border-transparent" required />
                </div>

                {withdrawAmount && parseFloat(withdrawAmount) >= 1000 && accountNumber.length >= 10 && accountName && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Withdrawal Summary</p>
                    </div>
                    <div className="px-4 py-3 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-semibold text-gray-900">₦{parseFloat(withdrawAmount).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-medium text-gray-900 text-right max-w-[55%]">{selectedBank.name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Account No.</span><span className="font-mono text-gray-900">{accountNumber}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Account Name</span><span className="font-medium text-gray-900">{accountName}</span></div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-bata-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                  <span>{authMethod === 'pin' ? 'Your 6-digit PIN will be required to authorise this withdrawal.' : 'A face scan will be required to authorise this withdrawal.'}</span>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setShowWithdrawModal(false); setPendingWithdrawal(null); setFaceToken(null); setFaceError(''); setPinError('') }} className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={withdrawing} className="flex-1 py-3 bg-bata-primary hover:bg-bata-dark text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap">
                    {withdrawing ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</>) : (<><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>{authMethod === 'pin' ? 'Enter PIN' : 'Face Scan'}</>)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── PIN Entry Modal ── */}
      {showPinEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-bata-primary to-bata-dark px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><span className="text-3xl">🔢</span></div>
              <h3 className="text-xl font-bold text-white">Enter Withdrawal PIN</h3>
              <p className="text-white/70 text-sm mt-1">Enter your 6-digit PIN to authorise</p>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="flex justify-center gap-3 mb-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pinValue.length ? 'bg-bata-primary border-bata-primary' : 'border-gray-300'}`} />
                ))}
              </div>
              <input type="password" inputMode="numeric" maxLength={6} value={pinValue} onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && handlePinSubmit()} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:border-bata-primary focus:outline-none" placeholder="••••••" autoFocus />
              {pinError && <p className="text-sm text-red-600 text-center font-medium">{pinError}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowPinEntry(false); setPinValue(''); setPinError(''); setPendingWithdrawal(null) }} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handlePinSubmit} disabled={pinLoading || pinValue.length !== 6} className="flex-1 py-3 bg-bata-primary hover:bg-bata-dark text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {pinLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm'}
                </button>
              </div>
              {user.hasFaceId && (
                <button onClick={() => { setShowPinEntry(false); setPinValue(''); setAuthMethod('face'); setShowFaceVerify(true) }} className="w-full text-sm text-gray-400 hover:text-bata-primary transition text-center">
                  Use Face ID instead →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Set / Change PIN Modal ── */}
      {showSetPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3"><span className="text-3xl">🔐</span></div>
              <h3 className="text-xl font-bold text-white">{user.hasWithdrawalPin ? 'Change Withdrawal PIN' : 'Set Withdrawal PIN'}</h3>
              <p className="text-gray-400 text-sm mt-1">A 6-digit backup for when Face ID fails</p>
            </div>
            <div className="px-6 py-6 space-y-4">
              {savePinSuccess ? (
                <div className="text-center space-y-3 py-2">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <p className="font-bold text-gray-900">PIN {user.hasWithdrawalPin ? 'Updated' : 'Set'}!</p>
                  <p className="text-sm text-gray-500">You can now use your PIN as a backup for withdrawals.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New PIN</label>
                    <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:border-bata-primary focus:outline-none" placeholder="••••••" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm PIN</label>
                    <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:border-bata-primary focus:outline-none" placeholder="••••••" />
                  </div>
                  {savePinError && <p className="text-sm text-red-600 font-medium">{savePinError}</p>}
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => { setShowSetPin(false); setNewPin(''); setConfirmPin(''); setSavePinError('') }} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                      {pendingWithdrawal ? 'Skip for now' : 'Cancel'}
                    </button>
                    <button onClick={handleSetPinSubmit} disabled={savePinLoading || newPin.length !== 6 || confirmPin.length !== 6} className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center">
                      {savePinLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save PIN'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Face ID Required Modal ── */}
      {showFaceIdRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-4xl">🔐</span></div>
              <h3 className="text-xl font-bold text-white">Face ID Required</h3>
              <p className="text-indigo-100 text-sm mt-1">Secure your withdrawals with Face ID</p>
            </div>
            <div className="px-6 py-6 space-y-4">
              {faceRegisterSuccess ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Face ID Registered!</p>
                    <p className="text-gray-500 text-sm mt-1">Your face has been saved. You can now withdraw funds securely.</p>
                  </div>
                  <button onClick={() => { closeFaceIdRequiredModal(); openWithdrawModal() }} className="w-full bg-bata-primary hover:bg-bata-dark text-white py-3 rounded-xl font-bold transition">Continue to Withdraw →</button>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 text-sm text-center">To protect your earnings, BATA requires a one-time Face ID registration before you can withdraw funds.</p>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">What you'll do:</p>
                    {['Look straight at the camera', 'Turn your head right', 'Turn your head left'].map((step, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="w-5 h-5 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-800 font-bold text-xs flex-shrink-0">{i + 1}</span>
                        <span className="text-sm text-indigo-800">{step}</span>
                      </div>
                    ))}
                  </div>
                  {faceRegisterError && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{faceRegisterError}</div>}
                  {faceRegisterLoading ? (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <div className="w-5 h-5 border-2 border-bata-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-500">Saving your Face ID...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <button onClick={() => { setFaceRegisterError(''); setShowFaceRegister(true) }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                        <span>📸</span> Register Face ID Now
                      </button>
                      <button onClick={closeFaceIdRequiredModal} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition">Cancel</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Face verification for withdrawal ── */}
      {showFaceVerify && (
        <FaceVerification
          mode="verify"
          title="Verify Your Identity"
          subtitle="Complete the 3 checks to authorise this withdrawal"
          authToken={authToken}
          onSuccess={handleFaceVerified}
          onCancel={handleFaceCancelled}
        />
      )}

      {/* Face registration for users without Face ID */}
      {showFaceRegister && (
        <FaceVerification
          mode="register"
          title="🔐 Register Your Face"
          subtitle="Complete the 3 checks to secure your withdrawals"
          onSuccess={handleFaceRegisterSuccess}
          onCancel={() => {
            setShowFaceRegister(false)
            setFaceRegisterError('Registration cancelled. You need Face ID to withdraw funds.')
          }}
        />
      )}
    </div>
  )
}