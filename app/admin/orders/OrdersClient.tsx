'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type Order = {
  id: string
  title: string
  description: string
  address: string
  visitDate: string
  status: string
  category: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  isAnonymous: boolean
  createdAt: string
  images: string[]
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '접수', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'in_progress', label: '진행중', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: '완료', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: '취소', color: 'bg-red-100 text-red-700' },
]

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) || { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${opt.color}`}>{opt.label}</span>
}

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  async function updateStatus(id: string, status: string) {
    setLoading(id)
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    }
    setLoading(null)
  }

  async function deleteOrder(id: string) {
    if (!confirm('이 견적 요청을 삭제하시겠습니까?')) return
    setLoading(id)
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) {
      setOrders((prev) => prev.filter((o) => o.id !== id))
    }
    setLoading(null)
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[{ value: 'all', label: `전체 (${orders.length})` }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: `${s.label} (${orders.filter(o => o.status === s.value).length})` }))].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">해당 상태의 견적이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['접수일', '카테고리', '제목', '고객명', '연락처', '주소', '상태', '관리'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <>
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{order.category}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 max-w-[180px] truncate">{order.title}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.customerName}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{order.customerPhone}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate text-xs">{order.address}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <select
                            value={order.status}
                            disabled={loading === order.id}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            disabled={loading === order.id}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-detail`} className="bg-blue-50 border-b border-blue-100">
                        <td colSpan={8} className="px-6 py-4 text-sm text-gray-700">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <div className="font-semibold text-gray-800 mb-2">상세 내용</div>
                              <p className="text-gray-600 text-sm leading-relaxed">{order.description}</p>
                              {order.customerEmail && (
                                <p className="text-gray-500 text-xs mt-2">이메일: {order.customerEmail}</p>
                              )}
                              <p className="text-gray-500 text-xs mt-1">방문 희망일: {order.visitDate}</p>
                            </div>
                            {order.images && order.images.length > 0 && (
                              <div>
                                <div className="font-semibold text-gray-800 mb-2">첨부 사진 ({order.images.length}장)</div>
                                <div className="flex gap-2 flex-wrap">
                                  {order.images.map((url, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      key={i}
                                      src={url}
                                      alt={`첨부 ${i + 1}`}
                                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
