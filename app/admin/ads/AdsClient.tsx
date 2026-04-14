'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type Ad = {
  id: string
  title: string | null
  image_url: string
  link_url: string | null
  is_active: boolean
  created_at: string
}

type AdForm = {
  title: string
  image_url: string
  link_url: string
  is_active: boolean
}

const EMPTY_FORM: AdForm = { title: '', image_url: '', link_url: '', is_active: true }

export default function AdsClient({ initialAds }: { initialAds: Ad[] }) {
  const [ads, setAds] = useState(initialAds)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AdForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(ad: Ad) {
    setForm({
      title: ad.title || '',
      image_url: ad.image_url,
      link_url: ad.link_url || '',
      is_active: ad.is_active,
    })
    setEditingId(ad.id)
    setShowForm(true)
  }

  async function saveAd() {
    if (!form.image_url.trim()) { alert('이미지 URL을 입력해주세요'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim() || null,
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim() || null,
      is_active: form.is_active,
    }

    if (editingId) {
      const { data, error } = await supabase.from('ads').update(payload).eq('id', editingId).select().single()
      if (!error && data) {
        setAds((prev) => prev.map((a) => (a.id === editingId ? data : a)))
      }
    } else {
      const { data, error } = await supabase.from('ads').insert(payload).select().single()
      if (!error && data) {
        setAds((prev) => [data, ...prev])
      }
    }
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY_FORM)
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('ads').update({ is_active: !current }).eq('id', id)
    if (!error) {
      setAds((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !current } : a)))
    }
  }

  async function deleteAd(id: string) {
    if (!confirm('이 광고를 삭제하시겠습니까?')) return
    setDeleting(id)
    const { error } = await supabase.from('ads').delete().eq('id', id)
    if (!error) setAds((prev) => prev.filter((a) => a.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      {/* Add Button */}
      <div className="mb-4">
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          + 광고 추가
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-bold text-gray-900 mb-5">{editingId ? '광고 수정' : '광고 추가'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 (선택)</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="광고 제목"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이미지 URL <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                {form.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="preview" className="mt-2 w-full h-32 object-cover rounded-xl border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">링크 URL (선택)</label>
                <input
                  type="url"
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">활성화</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={saveAd}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:bg-blue-400"
              >
                {saving ? '저장중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ads Grid */}
      {ads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center text-gray-400">
          등록된 광고가 없습니다
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className={`bg-white rounded-2xl border p-4 transition-all ${ad.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.image_url}
                alt={ad.title || '광고'}
                className="w-full h-36 object-cover rounded-xl mb-3 bg-gray-100"
              />
              <div className="font-medium text-gray-800 truncate mb-0.5">{ad.title || '(제목 없음)'}</div>
              {ad.link_url && (
                <a
                  href={ad.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 truncate block hover:underline"
                >
                  {ad.link_url}
                </a>
              )}
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => toggleActive(ad.id, ad.is_active)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    ad.is_active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {ad.is_active ? '● 활성' : '○ 비활성'}
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(ad)}
                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteAd(ad.id)}
                    disabled={deleting === ad.id}
                    className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting === ad.id ? '...' : '삭제'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
