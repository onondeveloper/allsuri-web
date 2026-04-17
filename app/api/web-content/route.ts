import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 60 // 1분 캐시

export async function GET() {
  const [{ data: settings }, { data: ads }] = await Promise.all([
    supabase.from('web_settings').select('key, value'),
    supabase.from('web_ads').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
  ])

  const settingsMap: Record<string, string> = {}
  ;(settings || []).forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value })

  return NextResponse.json({ settings: settingsMap, ads: ads || [] })
}
