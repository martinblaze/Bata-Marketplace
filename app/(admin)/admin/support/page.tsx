// app/(admin)/admin/support/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, MessageSquare, CheckCircle, Clock, Eye, X } from 'lucide-react'

interface Ticket {
  id: string
  name: string
  email: string
  category: string
  message: string
  status: string
  adminNotes: string | null
  createdAt: string
  resolvedAt: string | null
  user: { id: string; name: string } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  PAYMENT_ISSUE: '💳 Payment Issue',
  ORDER_PROBLEM: '📦 Order Problem',
  ACCOUNT_ISSUE: '👤 Account Issue',
  DISPUTE_HELP:  '⚖️ Dispute Help',
  SELLER_ISSUE:  '🛍️ Seller Issue',
  RIDER_ISSUE:   '🚴 Rider Issue',
  BUG_REPORT:    '🐛 Bug Report',
  OTHER:         '💬 Other',
}

const STATUS_STYLES: Record<string, string> = {
  OPEN:      'bg-yellow-500/10 text-yellow-400',
  IN_REVIEW: 'bg-blue-500/10 text-blue-400',
  RESOLVED:  'bg-green-500/10 text-green-400',
  CLOSED:    'bg-gray-500/10 text-gray-400',
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTickets() }, [])

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/support', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTicket = async (ticketId: string, status: string) => {
    setSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, adminNotes: notes }),
      })
      if (res.ok) {
        await fetchTickets()
        setSelected(null)
        setNotes('')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const filtered = tickets.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.message.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus
    return matchSearch && matchStatus
  })

  const openCount     = tickets.filter(t => t.status === 'OPEN').length
  const inReviewCount = tickets.filter(t => t.status === 'IN_REVIEW').length
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open',      count: openCount,     color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'In Review', count: inReviewCount, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: 'Resolved',  count: resolvedCount, color: 'text-green-400',  bg: 'bg-green-500/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-gray-400 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Ticket list */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filtered.map(ticket => (
              <div key={ticket.id}
                className="p-5 hover:bg-gray-700/30 transition-colors cursor-pointer"
                onClick={() => { setSelected(ticket); setNotes(ticket.adminNotes || '') }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-white font-semibold">{ticket.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[ticket.status]}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{ticket.email}</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{ticket.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                    <Eye className="w-4 h-4 text-gray-500 mt-2 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-white font-bold text-lg">{selected.name}</h2>
                <p className="text-gray-400 text-sm">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[selected.status]}`}>
                  {selected.status.replace('_', ' ')}
                </span>
                <span className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                  {CATEGORY_LABELS[selected.category]}
                </span>
                {selected.user && (
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs">
                    Registered user
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Message</p>
                <div className="bg-gray-900 rounded-xl p-4 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Admin Notes (internal)</p>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleUpdateTicket(selected.id, 'IN_REVIEW')}
                  disabled={saving || selected.status === 'IN_REVIEW'}
                  className="flex-1 px-4 py-2.5 bg-blue-500/10 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-500/20 disabled:opacity-40 transition-colors"
                >
                  <Clock className="w-4 h-4 inline mr-1.5" />
                  Mark In Review
                </button>
                <button
                  onClick={() => handleUpdateTicket(selected.id, 'RESOLVED')}
                  disabled={saving || selected.status === 'RESOLVED'}
                  className="flex-1 px-4 py-2.5 bg-green-500/10 text-green-400 rounded-xl text-sm font-semibold hover:bg-green-500/20 disabled:opacity-40 transition-colors"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1.5" />
                  Mark Resolved
                </button>
                <a
                  href={`mailto:${selected.email}?subject=Re: Your BATA Support Request`}
                  className="w-full text-center px-4 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl text-sm font-semibold hover:bg-indigo-500/20 transition-colors"
                >
                  ✉️ Reply via Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}