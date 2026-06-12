export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PUT(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const { data: admin } = await supabase.from('admins').select('role').eq('id', adminId).single()
  if (admin?.role !== 'superadmin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const allowed = ['golos_a','golos_b','amarelos_a','amarelos_b','vermelhos_a','vermelhos_b','faltas_a','faltas_b']
  const updates: Record<string, number> = {}
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'number' && body[key] >= 0) updates[key] = body[key]
  }

  await supabase.from('jogos').update({ ...updates }).eq('id', jogoId)
  await supabase.from('admin_logs').insert({ admin_id: adminId, acao: 'corrigir_jogo', jogo_id: jogoId, detalhes: updates })

  return NextResponse.json({ ok: true })
}
