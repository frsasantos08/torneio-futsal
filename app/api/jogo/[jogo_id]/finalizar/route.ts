export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Recalcula posicao dentro de um grupo com base nos totais actuais
async function recalcularPosicoes(supabase: SupabaseClient, grupo: string, torneioId: string | null) {
  let q = supabase
    .from('classificacao_grupos').select('equipa_id, pontos, golos_marcados, golos_sofridos')
    .eq('grupo', grupo)
  if (torneioId) q = q.eq('torneio_id', torneioId)
  else q = q.is('torneio_id', null)
  const { data: linhas } = await q
  if (!linhas?.length) return

  linhas.sort((a, b) => {
    if (b.pontos !== a.pontos) return (b.pontos ?? 0) - (a.pontos ?? 0)
    const dgA = (a.golos_marcados ?? 0) - (a.golos_sofridos ?? 0)
    const dgB = (b.golos_marcados ?? 0) - (b.golos_sofridos ?? 0)
    if (dgB !== dgA) return dgB - dgA
    return (b.golos_marcados ?? 0) - (a.golos_marcados ?? 0)
  })

  await Promise.all(linhas.map((l, i) => {
    let q = supabase.from('classificacao_grupos').update({ posicao: i + 1 }).eq('equipa_id', l.equipa_id)
    if (torneioId) q = q.eq('torneio_id', torneioId)
    else q = q.is('torneio_id', null)
    return q
  }))
}

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

  // Atualiza classificação para jogos de grupos
  if (jogo.fase === 'grupos' && jogo.equipa_a_id && jogo.equipa_b_id) {
    const pontosA = jogo.golos_a > jogo.golos_b ? 3 : jogo.golos_a === jogo.golos_b ? 1 : 0
    const pontosB = jogo.golos_b > jogo.golos_a ? 3 : jogo.golos_a === jogo.golos_b ? 1 : 0

    const updateEquipa = async (
      equipaId: string, _equipaNome: string, gM: number, gS: number, pts: number,
      amarelosEq: number, vermelhosEq: number, faltasEq: number,
    ) => {
      // Ler linha existente
      let lerQ = supabase.from('classificacao_grupos').select('*').eq('equipa_id', equipaId)
      if (jogo.torneio_id) lerQ = lerQ.eq('torneio_id', jogo.torneio_id)
      else lerQ = lerQ.is('torneio_id', null)
      const { data: atual } = await lerQ.single()

      if (atual) {
        // Linha existe — atualizar incrementalmente
        const updates: Record<string, number | string> = {
          jogos_jogados:  (atual.jogos_jogados ?? 0) + 1,
          vitorias:       (atual.vitorias ?? 0) + (pts === 3 ? 1 : 0),
          empates:        (atual.empates  ?? 0) + (pts === 1 ? 1 : 0),
          derrotas:       (atual.derrotas ?? 0) + (pts === 0 ? 1 : 0),
          golos_marcados: (atual.golos_marcados ?? 0) + gM,
          golos_sofridos: (atual.golos_sofridos ?? 0) + gS,
          pontos:         (atual.pontos ?? 0) + pts,
          amarelos:       (atual.amarelos  ?? 0) + amarelosEq,
          vermelhos:      (atual.vermelhos ?? 0) + vermelhosEq,
          faltas:         (atual.faltas    ?? 0) + faltasEq,
        }
        let updQ = supabase.from('classificacao_grupos').update(updates).eq('equipa_id', equipaId)
        if (jogo.torneio_id) updQ = updQ.eq('torneio_id', jogo.torneio_id)
        else updQ = updQ.is('torneio_id', null)
        const { error: updateErr } = await updQ
        if (updateErr) console.error('[finalizar] erro ao atualizar classificação de', equipaId, updateErr.message)
      } else {
        // Linha não existe — criar (upsert)
        const newRow: Record<string, unknown> = {
          equipa_id:      equipaId,
          grupo:          jogo.grupo,
          torneio_id:     jogo.torneio_id ?? null,
          jogos_jogados:  1,
          vitorias:       pts === 3 ? 1 : 0,
          empates:        pts === 1 ? 1 : 0,
          derrotas:       pts === 0 ? 1 : 0,
          golos_marcados: gM,
          golos_sofridos: gS,
          pontos:         pts,
          posicao:        0,
          amarelos:       amarelosEq,
          vermelhos:      vermelhosEq,
          faltas:         faltasEq,
        }
        const { error: insertErr } = await supabase.from('classificacao_grupos').insert(newRow)
        if (insertErr) console.error('[finalizar] erro ao inserir classificação de', equipaId, insertErr.message)
      }
    }

    await Promise.all([
      updateEquipa(jogo.equipa_a_id, jogo.equipa_a_nome ?? '', jogo.golos_a, jogo.golos_b, pontosA, jogo.amarelos_a ?? 0, jogo.vermelhos_a ?? 0, jogo.faltas_a ?? 0),
      updateEquipa(jogo.equipa_b_id, jogo.equipa_b_nome ?? '', jogo.golos_b, jogo.golos_a, pontosB, jogo.amarelos_b ?? 0, jogo.vermelhos_b ?? 0, jogo.faltas_b ?? 0),
    ])
  }

  // Recalcular posições no grupo após finalizar
  if (jogo.fase === 'grupos') {
    await recalcularPosicoes(supabase, jogo.grupo, jogo.torneio_id ?? null)
  }

  await supabase.from('admin_logs').insert({
    admin_id: adminId, acao: 'finalizar_jogo', jogo_id: jogoId,
    detalhes: { golos_a: jogo.golos_a, golos_b: jogo.golos_b },
  }).then(() => {})

  return NextResponse.json({ ok: true })
}
