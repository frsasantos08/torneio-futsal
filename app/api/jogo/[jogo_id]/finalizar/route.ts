export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const { data: jogo } = await supabase.from('jogos').select('*').eq('id', jogoId).single()
  if (!jogo) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  if (jogo.status === 'finalizado') return NextResponse.json({ error: 'Já finalizado' }, { status: 400 })

  // Finalizar o jogo
  const { error: jogoErr } = await supabase.from('jogos')
    .update({ status: 'finalizado', admin_em_sessao: null })
    .eq('id', jogoId)
  if (jogoErr) return NextResponse.json({ error: 'Erro ao finalizar jogo: ' + jogoErr.message }, { status: 500 })

  // Recalcular classificação em background (fire-and-forget para não bloquear a resposta)
  if (jogo.fase === 'grupos' && jogo.torneio_id) {
    const baseUrl = req.headers.get('x-forwarded-proto')
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}`
      : 'http://localhost:3000'

    fetch(`${baseUrl}/api/classificacao/recalcular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ torneio_id: jogo.torneio_id }),
    }).catch(e => console.error('[finalizar] recalcular error:', e))
    // Sem await — responde imediatamente após gravar o jogo
  }

  await supabase.from('admin_logs').insert({
    admin_id: adminId, acao: 'finalizar_jogo', jogo_id: jogoId,
    detalhes: { golos_a: jogo.golos_a, golos_b: jogo.golos_b },
  }).then(() => {})

  return NextResponse.json({ ok: true })
}
