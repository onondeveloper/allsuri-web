import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, normalizePhone } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const { phone, password } = await req.json()
  if (!phone || !password) return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 401 })

  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single()
  if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  if (normalizePhone(String(order.customerPhone || '')) !== normalizePhone(phone) ||
      String(order.webPassword || '') !== String(password).trim()) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const now = new Date().toISOString()
  await supabaseAdmin.from('orders').update({ status: 'completed' }).eq('id', orderId)

  const jobId = order.matchedJobId
  if (jobId) {
    await supabaseAdmin.from('jobs').update({ status: 'awaiting_confirmation', updated_at: now }).eq('id', jobId)
  }

  const techId = order.technicianId || order.technicianid
  if (techId) {
    await supabaseAdmin.from('notifications').insert({
      userid: techId, title: '공사 완료 확인',
      body: '고객이 공사 완료를 확인했습니다.', type: 'job_complete',
      jobid: jobId, isread: false, createdat: now,
    })
  }

  return NextResponse.json({ success: true, message: '공사 완료가 확인되었습니다.' })
}
