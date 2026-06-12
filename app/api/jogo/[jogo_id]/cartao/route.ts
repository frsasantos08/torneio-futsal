export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

type TipoCartao = 'amarelo' | 'vermelho' | 'vermelho_direto' | 'vermelho_acumulacao'

export async function POST(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const { equipa, tipo } = await req.json() as { equipa: 'a' | 'b'; tipo: TipoCartao }
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const { data: jogo } = await supabase.from('jogos').select('*').eq('id', jogoId).single()
  if (!jogo) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  if (jogo.status === 'finalizado') return NextResponse.json({ error: 'Jogo finalizado' }, { status: 400 })

  const updates: Record<string, number> = {}

  if (tipo === 'amarelo') {
    const field = `amarelos_${equipa}`
    updates[field] = (jogo[field] ?? 0) + 1
  } else if (tipo === 'vermelho' || tipo === 'vermelho_direto') {
    // Vermelho direto conta como vermelho no placar
    const field = `vermelhos_${equipa}`
    updates[field] = (jogo[field] ?? 0) + 1
    // Registo específico para disciplina se a coluna existir
    if (`vermelho_direto_${equipa}` in jogo) {
      updates[`vermelho_direto_${equipa}`] = (jogo[`vermelho_direto_${equipa}`] ?? 0) + 1
    }
  } else if (tipo === 'vermelho_acumulacao') {
    // 2ª advertência: conta como vermelho no placar + amarelo na disciplina
    const fieldV = `vermelhos_${equipa}`
    updates[fieldV] = (jogo[fieldV] ?? 0) + 1
    if (`vermelho_acumulacao_${equipa}` in jogo) {
      updates[`vermelho_acumulacao_${equipa}`] = (jogo[`vermelho_acumulacao_${equipa}`] ?? 0) + 1
    }
  }

  await supabase.from('jogos').update(updates).eq('id', jogoId)

  await supabase.from('historico_acoes').insert({
    jogo_id: jogoId, tipo, equipa,
    valor_anterior: jogo[`vermelhos_${equipa}`] ?? 0,
    valor_novo: updates[`vermelhos_${equipa}`] ?? jogo[`vermelhos_${equipa}`] ?? 0,
  })

  supabase.from('admin_logs').insert({
    admin_id: adminId, acao: tipo, jogo_id: jogoId, detalhes: { equipa, updates },
  }).then(() => {})

  return NextResponse.json({ ok: true, ...updates })
}
