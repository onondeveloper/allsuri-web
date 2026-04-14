'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type Post = {
  id: string
  title: string
  content: string
  authorid: string
  author_name: string | null
  tags: string[] | null
  upvotes: number | null
  commentscount: number | null
  createdat: string
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

export default function CommunityClient({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.author_name || '').toLowerCase().includes(search.toLowerCase())
  )

  async function deletePost(id: string) {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return
    setDeleting(id)
    const { error } = await supabase.from('community_posts').delete().eq('id', id)
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== id))
    }
    setDeleting(null)
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목 또는 작성자 검색..."
          className="w-full max-w-sm border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">게시글이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['작성일', '제목', '작성자', '태그', '👍', '💬', '관리'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{timeAgo(post.createdat)}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-[240px]">
                      <div className="truncate font-medium">{post.title}</div>
                      <div className="text-gray-400 text-xs truncate mt-0.5">{post.content.slice(0, 60)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{post.author_name || '익명'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(post.tags || []).slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">#{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{post.upvotes || 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{post.commentscount || 0}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deletePost(post.id)}
                        disabled={deleting === post.id}
                        className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting === post.id ? '삭제중...' : '삭제'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
