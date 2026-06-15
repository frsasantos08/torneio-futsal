export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const { equipa } = await req.json() as { equipa: 'a' | 'b' }
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const { data: jogo, error: fetchErr } = await supabase
    .from('jogos').select('*').eq('id', jogoId).single()

  if (fetchErr || !jogo) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  if (jogo.status === 'finalizado') return NextResponse.json({ error: 'Jogo finalizado' }, { status: 400 })
  if (jogo.resultado_confirmado) return NextResponse.json({ error: 'Resultado confirmado' }, { status: 400 })

  const field = equipa === 'a' ? 'golos_a' : 'golos_b'
  const novoValor = (jogo[field] ?? 0) + 1

  const { data: updated, error: updateErr } = await supabase
    .from('jogos').update({ [field]: novoValor }).eq('id', jogoId).select('id')

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  if (!updated || updated.length === 0) return NextResponse.json({ error: 'Jogo não encontrado para update' }, { status: 404 })

  const { error: histErr } = await supabase.from('historico_acoes').insert({ jogo_id: jogoId, tipo: 'golo', equipa, admin_id: adminId, valor_anterior: novoValor - 1, valor_novo: novoValor })
  if (histErr) console.error('[golo] historico insert error:', histErr.message)
  supabase.from('admin_logs').insert({ admin_id: adminId, acao: 'golo', jogo_id: jogoId, detalhes: { equipa, novo_valor: novoValor } }).then(() => {})

  return NextResponse.json({ ok: true, [field]: novoValor })
}
