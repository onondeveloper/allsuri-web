import { NextResponse } from 'next/server'

// 추천 업체 목록 (allsuriapp admin API를 통해 조회)
export const revalidate = 300 // 5분 캐시

const ADMIN_API = process.env.ALLSURIAPP_API_URL || 'https://allsuri.app/api/admin'
const ADMIN_TOKEN = process.env.ALLSURIAPP_ADMIN_TOKEN || 'allsuri-admin-2024'

export async function GET() {
  try {
    const res = await fetch(`${ADMIN_API}/featured-businesses/public`, {
      headers: { 'admin-token': ADMIN_TOKEN },
      next: { revalidate: 300 },
    })
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch {
    return NextResponse.json([])
  }
}
