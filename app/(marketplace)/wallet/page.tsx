// app/(marketplace)/wallet/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  hasWithdrawalPin: boolean
}

interface Bank {
  code: string
  name: string
}

const NIGERIAN_BANKS: Bank[] = [
  { code: '999992', name: 'OPay' },
  { code: '999991', name: 'PalmPay' },
  { code: '50211', name: 'Kuda Bank' },
  { code: '50515', name: 'Moniepoint MFB' },
  { code: '565', name: 'Carbon (One Finance)' },
  { code: '566', name: 'VFD Microfinance Bank (VBank)' },
  { code: '035A', name: 'ALAT by WEMA' },
  { code: '125', name: 'Rubies MFB' },
  { code: '51269', name: 'Tangerine Money' },
  { code: '51310', name: 'Sparkle Microfinance Bank' },
  { code: '50126', name: 'Eyowo' },
  { code: '100002', name: 'Paga' },
  { code: '100022', name: 'GoMoney' },
  { code: '311', name: 'Parkway ReadyCash' },
  { code: '100039', name: 'Titan Paystack' },
  { code: '057', name: 'Zenith Bank' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '030', name: 'Heritage Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '302', name: 'TAJ Bank' },
  { code: '303', name: 'Lotus Bank' },
  { code: '104', name: 'Parallex Bank' },
  { code: '105', name: 'PremiumTrust Bank' },
  { code: '102', name: 'Titan Trust Bank' },
  { code: '502', name: 'Rand Merchant Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '00103', name: 'Globus Bank' },
  { code: '559', name: 'Coronation Merchant Bank' },
  { code: '501', name: 'FSDH Merchant Bank' },
  { code: '120001', name: '9mobile 9Payment Service Bank' },
  { code: '120002', name: 'HopePSB' },
  { code: '120003', name: 'MTN MoMo PSB' },
  { code: '120004', name: 'Airtel Smartcash PSB' },
  { code: '801', name: 'Abbey Mortgage Bank' },
  { code: '401', name: 'ASO Savings and Loans' },
  { code: '031', name: 'Living Trust Mortgage Bank' },
  { code: '812', name: 'Gateway Mortgage Bank' },
  { code: '90067', name: 'Refuge Mortgage Bank' },
  { code: '51204', name: 'Above Only MFB' },
  { code: '51312', name: 'Abulesoro MFB' },
  { code: '50926', name: 'Amju Unique MFB' },
  { code: '50083', name: 'Aramoko MFB' },
  { code: '50931', name: 'Bowen Microfinance Bank' },
  { code: '50823', name: 'CEMCS Microfinance Bank' },
  { code: '50171', name: 'Chanelle Microfinance Bank' },
  { code: '50204', name: 'Corestep MFB' },
  { code: '51297', name: 'Crescent MFB' },
  { code: '50263', name: 'Ekimogun MFB' },
  { code: '562', name: 'Ekondo Microfinance Bank' },
  { code: '51314', name: 'Firmus MFB' },
  { code: '51251', name: 'Hackman Microfinance Bank' },
  { code: '50383', name: 'Hasal Microfinance Bank' },
  { code: '51244', name: 'Ibile Microfinance Bank' },
  { code: '50439', name: 'Ikoyi Osun MFB' },
  { code: '50457', name: 'Infinity MFB' },
  { code: '50502', name: 'Kadpoly MFB' },
  { code: '50200', name: 'Kredi Money MFB' },
  { code: '90052', name: 'Lagos Building Investment Company' },
  { code: '50549', name: 'Links MFB' },
  { code: '50563', name: 'Mayfair MFB' },
  { code: '50304', name: 'Mint MFB' },
  { code: '50746', name: 'Petra Microfinance Bank' },
  { code: '50864', name: 'Polyunwana MFB' },
  { code: '51293', name: 'QuickFund MFB' },
  { code: '51113', name: 'Safe Haven MFB' },
  { code: '50800', name: 'Solid Rock MFB' },
  { code: '51253', name: 'Stellas MFB' },
  { code: '51211', name: 'TCF MFB' },
  { code: '50871', name: 'Unical MFB' },
]

const TX_LABEL: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  CREDIT: { label: 'Credit', color: 'text-emerald-700', bg: 'bg-emerald-50', sign: '+' },
  DEBIT: { label: 'Debit', color: 'text-red-600', bg: 'bg-red-50', sign: '−' },
  WITHDRAWAL: { label: 'Withdrawal', color: 'text-red-600', bg: 'bg-red-50', sign: '−' },
  ESCROW: { label: 'Escrow', color: 'text-amber-700', bg: 'bg-amber-50', sign: '' },
}

export default function WalletPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [selectedBank, setSelectedBank] = useState(NIGERIAN_BANKS[0])
  const [bankSearch, setBankSearch] = useState('')
  const [showBankDropdown, setShowBankDropdown] = useState(false)
  const bankRef = useRef<HTMLDivElement>(null)

  const [pendingWithdrawal, setPendingWithdrawal] = useState<any>(null)

  // ── PIN states ─────────────────────────────────────────────────────────────
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

  // ── PIN required modal (no PIN set yet) ───────────────────────────────────
  const [showPinRequired, setShowPinRequired] = useState(false)

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
      const [uR, wR, tR] = await Promise.all([
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } }),
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
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        // If no PIN set yet, prompt them to set one first
        if (!data.user.hasWithdrawalPin) {
          setShowPinRequired(true)
          return
        }
      }
    } catch { /* fall through */ }

    setWithdrawAmount('')
    setAccountNumber('')
    setAccountName('')
    setSelectedBank(NIGERIAN_BANKS[0])
    setBankSearch('')
    setPinError('')
    setShowWithdrawModal(true)
  }

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount < 1000) { alert('Minimum withdrawal is ₦1,000'); return }
    if (wallet && amount > wallet.availableBalance) { alert('Insufficient balance'); return }
    if (!accountNumber || !accountName) { alert('Please fill all fields'); return }
    setPendingWithdrawal({ amount, accountNumber, accountName, bankCode: selectedBank.code })
    setPinError('')
    setPinValue('')
    setShowPinEntry(true)
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
      await executeWithdrawal()
    } catch {
      setPinError('Network error. Please try again.')
    } finally {
      setPinLoading(false)
    }
  }

  const executeWithdrawal = async () => {
    if (!pendingWithdrawal) return
    setWithdrawing(true)
    try {
      const token = localStorage.getItem('token')
      const r = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pendingWithdrawal),
      })
      const d = await r.json()

      if (!r.ok) {
        if (d.error === 'PIN_REQUIRED') {
          setShowWithdrawModal(false)
          setPendingWithdrawal(null)
          setShowPinRequired(true)
          return
        }
        alert(d.error || 'Withdrawal failed')
        setPendingWithdrawal(null)
        return
      }

      // ✅ Success
      setShowWithdrawModal(false)
      setPendingWithdrawal(null)
      fetchWalletData()
      alert(`Withdrawal of ₦${pendingWithdrawal.amount.toLocaleString()} initiated.\nReference: ${d.reference}`)
    } catch {
      alert('Network error. Please try again.')
      setPendingWithdrawal(null)
    } finally {
      setWithdrawing(false)
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin: newPin }),
      })
      const data = await res.json()
      if (res.ok) {
        setSavePinSuccess(true)
        setUser(prev => prev ? { ...prev, hasWithdrawalPin: true } : prev)
        setTimeout(() => {
          setShowSetPin(false)
          setSavePinSuccess(false)
          setNewPin('')
          setConfirmPin('')
        }, 2000)
      } else {
        setSavePinError(data.error || 'Failed to set PIN')
      }
    } catch {
      setSavePinError('Network error. Please try again.')
    } finally {
      setSavePinLoading(false)
    }
  }

  if (loading || !user || !wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-BATAMART-primary border-t-transparent" />
          <p className="text-gray-500 text-sm">Loading wallet...</p>
        </div>
      </div>
    )
  }

  const totalEarned = transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
  const totalWithdrawn = transactions.filter(t => t.type === 'WITHDRAWAL' || t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
              <Link href="/marketplace" className="hover:text-BATAMART-primary">Marketplace</Link>
              <span>/</span>
              <span>Wallet</span>
            </div>
            <h1 className="text-xl font-black text-gray-900">Wallet & Payouts</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setNewPin(''); setConfirmPin(''); setSavePinError(''); setSavePinSuccess(false); setShowSetPin(true) }}
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:border-BATAMART-primary hover:text-BATAMART-primary text-xs sm:text-sm font-semibold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors"
            >
              🔐 {user.hasWithdrawalPin ? 'Change PIN' : 'Set PIN'}
            </button>
            <button
              onClick={openWithdrawModal}
              className="inline-flex items-center gap-1.5 text-white text-xs sm:text-sm font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg transition"
              style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-BATAMART-primary to-BATAMART-secondary rounded-2xl p-5 text-white">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Available Balance</p>
            <p className="text-3xl font-black mb-1">
              ₦{wallet.availableBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-white/60 text-xs mb-3">Ready to withdraw</p>
            <button
              onClick={openWithdrawModal}
              className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition"
            >
              Withdraw →
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Pending (Escrow)</p>
            <p className="text-2xl font-black text-gray-900 mb-1">
              ₦{wallet.pendingBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-gray-400 text-xs">Released after buyer confirms delivery</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Account Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total earned</span>
                <span className="font-bold text-emerald-600">₦{totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total withdrawn</span>
                <span className="font-bold text-red-500">₦{totalWithdrawn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{wallet.role === 'SELLER' ? 'Orders sold' : wallet.role === 'RIDER' ? 'Deliveries' : 'Orders placed'}</span>
                <span className="font-bold text-gray-800">{wallet.completedOrders}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.hasWithdrawalPin ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {user.hasWithdrawalPin ? '✓ PIN Set' : '! No PIN'}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-gray-900">Transaction History</h2>
            <span className="text-xs text-gray-400">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-500">No transactions yet</p>
              <p className="text-xs text-gray-400 mt-1">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((tx) => {
                    const meta = TX_LABEL[tx.type] || TX_LABEL.CREDIT
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800 text-sm">{tx.description}</p>
                          <p className="text-xs text-gray-400 font-mono">{tx.reference}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-600">{new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`font-black text-sm ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {tx.type === 'ESCROW' ? '🔒 ' : meta.sign}₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-400">Bal: ₦{tx.balanceAfter.toLocaleString()}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Withdraw Modal ── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-gray-900">Withdraw Funds</h2>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  🔐 PIN verification required
                </p>
              </div>
              <button
                onClick={() => { setShowWithdrawModal(false); setPendingWithdrawal(null); setPinError('') }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (NGN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
                  <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" min="1000" max={wallet.availableBalance} className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-BATAMART-primary focus:border-transparent" required />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">Minimum: ₦1,000</span>
                  <button type="button" onClick={() => setWithdrawAmount(String(wallet.availableBalance))} className="text-xs text-BATAMART-primary font-semibold hover:underline">Max: ₦{wallet.availableBalance.toLocaleString()}</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bank ({NIGERIAN_BANKS.length} supported)</label>
                <div ref={bankRef}>
                  {!showBankDropdown ? (
                    <button type="button" onClick={() => { setBankSearch(''); setShowBankDropdown(true) }} className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg text-sm hover:border-BATAMART-primary transition text-left">
                      {selectedBank.name}
                      <span className="text-gray-400">▼</span>
                    </button>
                  ) : (
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                        <input type="text" value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} placeholder="Search bank..." className="w-full pl-10 pr-4 py-3 border-b border-gray-200 text-sm focus:outline-none" autoFocus />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredBanks.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-400">No bank found</p>
                        ) : (
                          filteredBanks.map((bank) => (
                            <button key={bank.code} type="button" onClick={() => { setSelectedBank(bank); setBankSearch(''); setShowBankDropdown(false) }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 transition ${selectedBank.code === bank.code ? 'text-BATAMART-primary font-semibold bg-blue-50' : 'text-gray-800'}`}>
                              {bank.name}
                              {selectedBank.code === bank.code && <span className="text-BATAMART-primary">✓</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Account Number</label>
                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="10-digit account number" maxLength={10} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-BATAMART-primary focus:border-transparent" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Account Name</label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="As it appears on your bank account" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-BATAMART-primary focus:border-transparent" required />
              </div>

              {withdrawAmount && parseFloat(withdrawAmount) >= 1000 && accountNumber.length >= 10 && accountName && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                  <p className="font-bold text-gray-700">Withdrawal Summary</p>
                  <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold">₦{parseFloat(withdrawAmount).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-semibold">{selectedBank.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Account No.</span><span className="font-mono font-semibold">{accountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Account Name</span><span className="font-semibold">{accountName}</span></div>
                </div>
              )}

              <p className="text-xs text-gray-400 flex items-center gap-1">🔢 Your 6-digit PIN will be required to authorise this withdrawal.</p>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowWithdrawModal(false); setPendingWithdrawal(null); setPinError('') }} className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={withdrawing} className="flex-1 py-3 text-white rounded-lg text-sm font-bold transition disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}>
                  {withdrawing ? 'Processing...' : 'Enter PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PIN Entry Modal ── */}
      {showPinEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-2">🔢</div>
              <h3 className="text-lg font-black text-gray-900">Enter Withdrawal PIN</h3>
              <p className="text-sm text-gray-400">Enter your 6-digit PIN to authorise</p>
            </div>
            <div className="flex justify-center gap-2 mb-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < pinValue.length ? 'bg-BATAMART-primary scale-110' : 'bg-gray-200'}`} />
              ))}
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinValue}
              onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:border-BATAMART-primary focus:outline-none"
              placeholder="••••••"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm text-center font-medium">{pinError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowPinEntry(false); setPinValue(''); setPinError(''); setPendingWithdrawal(null) }} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handlePinSubmit} disabled={pinLoading || pinValue.length !== 6} className="flex-1 py-3 text-white rounded-xl text-sm font-bold transition disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}>
                {pinLoading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Set / Change PIN Modal ── */}
      {showSetPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-2">🔐</div>
              <h3 className="text-lg font-black text-gray-900">{user.hasWithdrawalPin ? 'Change Withdrawal PIN' : 'Set Withdrawal PIN'}</h3>
              <p className="text-sm text-gray-400">A 6-digit PIN to secure your withdrawals</p>
            </div>

            {savePinSuccess ? (
              <div className="text-center py-4 space-y-2">
                <div className="text-5xl">✅</div>
                <p className="font-bold text-gray-900">PIN {user.hasWithdrawalPin ? 'Updated' : 'Set'}!</p>
                <p className="text-sm text-gray-400">You can now use your PIN for withdrawals.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">New PIN</label>
                  <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:border-BATAMART-primary focus:outline-none" placeholder="••••••" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm PIN</label>
                  <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:border-BATAMART-primary focus:outline-none" placeholder="••••••" />
                </div>
                {savePinError && <p className="text-red-500 text-sm font-medium">{savePinError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setShowSetPin(false); setNewPin(''); setConfirmPin(''); setSavePinError('') }} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleSetPinSubmit} disabled={savePinLoading || newPin.length !== 6 || confirmPin.length !== 6} className="flex-1 py-3 text-white rounded-xl text-sm font-bold transition disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}>
                    {savePinLoading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'Save PIN'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PIN Required Modal (no PIN set yet) ── */}
      {showPinRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="text-5xl">🔐</div>
            <h3 className="text-lg font-black text-gray-900">Set a Withdrawal PIN</h3>
            <p className="text-sm text-gray-500">You need to set a 6-digit PIN before you can withdraw funds. This keeps your earnings safe.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPinRequired(false)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button
                onClick={() => { setShowPinRequired(false); setNewPin(''); setConfirmPin(''); setSavePinError(''); setSavePinSuccess(false); setShowSetPin(true) }}
                className="flex-1 py-3 text-white rounded-xl text-sm font-bold transition"
                style={{ background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)' }}
              >
                Set PIN Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}