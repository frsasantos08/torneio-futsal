export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const { equipa } = await req.json() as { equipa: 'a' | 'b' }
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const { data: jogo } = await supabase.from('jogos').select('*').eq('id', jogoId).single()
  if (!jogo) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  if (jogo.status === 'finalizado') return NextResponse.json({ error: 'Jogo finalizado' }, { status: 400 })

  const field = `faltas_${equipa}`
  const novoValor = (jogo[field] ?? 0) + 1

  await supabase.from('jogos').update({ [field]: novoValor }).eq('id', jogoId)

  const { error: histErr } = await supabase.from('historico_acoes').insert({ jogo_id: jogoId, tipo: 'falta', equipa, valor_anterior: novoValor - 1, valor_novo: novoValor })
  if (histErr) console.error('[falta] historico insert error:', histErr.message)
  supabase.from('admin_logs').insert({ admin_id: adminId, acao: 'falta', jogo_id: jogoId, detalhes: { equipa, novo_valor: novoValor } }).then(() => {})

  return NextResponse.json({ ok: true, [field]: novoValor })
}
