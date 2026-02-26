// app/(admin)/admin/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Flag, Eye, Clock } from 'lucide-react'
import { ReportType, ReportStatus } from '@prisma/client'

interface Report {
  id: string
  type: ReportType
  reason: string
  description: string
  status: ReportStatus
  createdAt: string
  reporter: { id: string; name: string }
  reportedUser?: { id: string; name: string }
  reportedProduct?: { id: string; name: string }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [filterType, setFilterType] = useState<string>('ALL')

  useEffect(() => {
    fetchReports()
  }, [filterStatus, filterType])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams()
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      if (filterType !== 'ALL') params.set('type', filterType)

      const response = await fetch(`/api/admin/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setReports(data.reports)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PRODUCT': return 'bg-blue-500/10 text-blue-400'
      case 'SELLER': return 'bg-green-500/10 text-green-400'
      case 'RIDER': return 'bg-purple-500/10 text-purple-400'
      case 'BUYER': return 'bg-yellow-500/10 text-yellow-400'
      default: return 'bg-gray-500/10 text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ALL">All Status</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="ALL">All Types</option>
          <option value="PRODUCT">Product</option>
          <option value="SELLER">Seller</option>
          <option value="RIDER">Rider</option>
          <option value="BUYER">Buyer</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-2xl">
            <Flag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No reports found</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-red-500/10 rounded-xl">
                    <Flag className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                      <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-semibold">
                        {report.reason}
                      </span>
                    </div>
                    <p className="text-white font-medium mb-1">
                      Reported by: {report.reporter.name}
                    </p>
                    {report.reportedUser && (
                      <p className="text-gray-400 text-sm">Against: {report.reportedUser.name}</p>
                    )}
                    {report.reportedProduct && (
                      <p className="text-gray-400 text-sm">Product: {report.reportedProduct.name}</p>
                    )}
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  report.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                  report.status === 'UNDER_REVIEW' ? 'bg-blue-500/10 text-blue-400' :
                  report.status === 'RESOLVED' ? 'bg-green-500/10 text-green-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  {report.status}
                </span>
              </div>

              <p className="text-gray-400 mb-4">{report.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <span className="text-sm text-gray-500">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/admin/reports/${report.id}`}
                  className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-semibold text-sm flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Review
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}