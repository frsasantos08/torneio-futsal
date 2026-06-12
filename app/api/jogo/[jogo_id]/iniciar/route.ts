export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const keyUsed = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon_fallback'
  console.log('[iniciar] using key:', keyUsed, '| jogoId:', jogoId)

  const { data: jogo } = await supabase.from('jogos').select('status').eq('id', jogoId).single()
  if (jogo?.status === 'finalizado') return NextResponse.json({ error: 'Jogo já finalizado' }, { status: 400 })

  const { data: updated, error: updateErr } = await supabase
    .from('jogos')
    .update({ status: 'decorrer' })
    .eq('id', jogoId)
    .select('id, status')

  console.log('[iniciar] update result:', { updated, updateErr })

  if (updateErr) {
    console.error('[iniciar] update error:', updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  if (!updated || updated.length === 0) {
    console.error('[iniciar] update matched 0 rows for id:', jogoId)
    return NextResponse.json({ error: 'Update não afetou nenhuma linha' }, { status: 500 })
  }

  supabase.from('admin_logs').insert({ admin_id: adminId, acao: 'iniciar_jogo', jogo_id: jogoId }).then(({ error }) => {
    if (error) console.error('[iniciar] admin_logs error:', error)
  })
  return NextResponse.json({ ok: true })
}
