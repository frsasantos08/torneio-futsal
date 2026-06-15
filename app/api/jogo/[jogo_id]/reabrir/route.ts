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

  // Reverter contribuição deste jogo na classificação (apenas fase de grupos)
  if (jogo.fase === 'grupos') {
    // Resolver UUIDs via slot se equipa_a_id for null
    let idA = jogo.equipa_a_id as string | null
    let idB = jogo.equipa_b_id as string | null
    if ((!idA || !idB) && jogo.torneio_id) {
      const nomes = [jogo.equipa_a_nome, jogo.equipa_b_nome].filter(Boolean)
      const { data: eqs } = await supabase.from('equipas')
        .select('id, slot')
        .eq('torneio_id', jogo.torneio_id)
        .in('slot', nomes)
      if (eqs) {
        const map = Object.fromEntries(eqs.map((e: { id: string; slot: string }) => [e.slot, e.id]))
        if (!idA) idA = map[jogo.equipa_a_nome] ?? null
        if (!idB) idB = map[jogo.equipa_b_nome] ?? null
      }
    }

    if (idA && idB) {
      const pontosA = jogo.golos_a > jogo.golos_b ? 3 : jogo.golos_a === jogo.golos_b ? 1 : 0
      const pontosB = jogo.golos_b > jogo.golos_a ? 3 : jogo.golos_a === jogo.golos_b ? 1 : 0

      const reverterEquipa = async (equipaId: string, gM: number, gS: number, pts: number, amarelosEq: number, vermelhosEq: number, faltasEq: number) => {
        let lerQ = supabase.from('classificacao_grupos').select('*').eq('equipa_id', equipaId)
        if (jogo.torneio_id) lerQ = lerQ.eq('torneio_id', jogo.torneio_id)
        else lerQ = lerQ.is('torneio_id', null)
        const { data: atual } = await lerQ.single()
        if (!atual) return

        const updates: Record<string, number> = {
          jogos_jogados:  Math.max(0, (atual.jogos_jogados ?? 0) - 1),
          vitorias:       Math.max(0, (atual.vitorias ?? 0) - (pts === 3 ? 1 : 0)),
          empates:        Math.max(0, (atual.empates ?? 0) - (pts === 1 ? 1 : 0)),
          derrotas:       Math.max(0, (atual.derrotas ?? 0) - (pts === 0 ? 1 : 0)),
          golos_marcados: Math.max(0, (atual.golos_marcados ?? 0) - gM),
          golos_sofridos: Math.max(0, (atual.golos_sofridos ?? 0) - gS),
          pontos:         Math.max(0, (atual.pontos ?? 0) - pts),
          amarelos:       Math.max(0, (atual.amarelos  ?? 0) - amarelosEq),
          vermelhos:      Math.max(0, (atual.vermelhos ?? 0) - vermelhosEq),
          faltas:         Math.max(0, (atual.faltas    ?? 0) - faltasEq),
        }

        let updQ = supabase.from('classificacao_grupos').update(updates).eq('equipa_id', equipaId)
        if (jogo.torneio_id) updQ = updQ.eq('torneio_id', jogo.torneio_id)
        else updQ = updQ.is('torneio_id', null)
        await updQ
      }

      await Promise.all([
        reverterEquipa(idA, jogo.golos_a, jogo.golos_b, pontosA, jogo.amarelos_a ?? 0, jogo.vermelhos_a ?? 0, jogo.faltas_a ?? 0),
        reverterEquipa(idB, jogo.golos_b, jogo.golos_a, pontosB, jogo.amarelos_b ?? 0, jogo.vermelhos_b ?? 0, jogo.faltas_b ?? 0),
      ])
    }
  }

  // Voltar status a decorrer
  await supabase.from('jogos')
    .update({ status: 'decorrer', admin_em_sessao: adminId })
    .eq('id', jogoId)

  await supabase.from('admin_logs').insert({
    admin_id: adminId, acao: 'reabrir_jogo', jogo_id: jogoId,
    detalhes: { motivo: 'edição manual' },
  })

  return NextResponse.json({ ok: true })
}
