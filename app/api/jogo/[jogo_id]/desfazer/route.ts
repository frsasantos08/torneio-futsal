export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const { data: jogo } = await supabase.from('jogos').select('*').eq('id', jogoId).single()
  if (!jogo) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  if (jogo.resultado_confirmado) return NextResponse.json({ error: 'Resultado confirmado' }, { status: 400 })

  const { data: ultimaAcao } = await supabase
    .from('historico_acoes').select('*').eq('jogo_id', jogoId)
    .order('timestamp', { ascending: false }).limit(1).maybeSingle()

  if (!ultimaAcao) return NextResponse.json({ error: 'Sem ações para desfazer' }, { status: 400 })

  // vermelho_direto e vermelho_acumulacao decrementam o mesmo campo
  const tipoNormalizado = (ultimaAcao.tipo as string).startsWith('vermelho') ? 'vermelho' : ultimaAcao.tipo
  const fieldMap: Record<string, string> = {
    golo: `golos_${ultimaAcao.equipa}`,
    amarelo: `amarelos_${ultimaAcao.equipa}`,
    vermelho: `vermelhos_${ultimaAcao.equipa}`,
    falta: `faltas_${ultimaAcao.equipa}`,
  }
  const field = fieldMap[tipoNormalizado]
  if (!field) return NextResponse.json({ error: 'Tipo desconhecido' }, { status: 400 })

  const valorAtual = (jogo[field] as number) ?? 0
  if (valorAtual <= 0) return NextResponse.json({ error: 'Valor já é zero' }, { status: 400 })

  await supabase.from('jogos').update({ [field]: valorAtual - 1 }).eq('id', jogoId)
  await supabase.from('historico_acoes').delete().eq('id', ultimaAcao.id)
  await supabase.from('admin_logs').insert({
    admin_id: adminId, acao: 'desfazer', jogo_id: jogoId,
    detalhes: { acao_desfeita: ultimaAcao.tipo, equipa: ultimaAcao.equipa },
  })

  return NextResponse.json({ ok: true, desfeito: ultimaAcao.tipo, equipa: ultimaAcao.equipa })
}
