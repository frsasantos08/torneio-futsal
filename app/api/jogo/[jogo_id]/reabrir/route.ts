export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const { data: jogo } = await supabase.from('jogos').select('*').eq('id', jogoId).single()
  if (!jogo) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  if (jogo.status !== 'finalizado') return NextResponse.json({ error: 'Jogo não está finalizado' }, { status: 400 })

  // Voltar status a decorrer
  await supabase.from('jogos')
    .update({ status: 'decorrer', admin_em_sessao: adminId })
    .eq('id', jogoId)

  // Recalcular classificação sem este jogo (agora está decorrer, não finalizado)
  if (jogo.fase === 'grupos' && jogo.torneio_id) {
    const baseUrl = req.headers.get('x-forwarded-proto')
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}`
      : 'http://localhost:3000'

    await fetch(`${baseUrl}/api/classificacao/recalcular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ torneio_id: jogo.torneio_id }),
    }).catch(e => console.error('[reabrir] recalcular error:', e))
  }

  await supabase.from('admin_logs').insert({
    admin_id: adminId, acao: 'reabrir_jogo', jogo_id: jogoId,
    detalhes: { motivo: 'edição manual' },
  })

  return NextResponse.json({ ok: true })
}
