export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const torneioId: string | null = body.torneio_id ?? null

  // 1. Buscar equipas para resolver slot → uuid
  let equipasQ = supabase.from('equipas').select('id, slot, grupo, nome')
  if (torneioId) equipasQ = equipasQ.eq('torneio_id', torneioId)
  const { data: equipasRows } = await equipasQ
  const slotToId: Record<string, string> = {}
  const nomeToId: Record<string, string> = {}
  const idToNome: Record<string, string> = {}
  for (const e of equipasRows ?? []) {
    slotToId[e.slot] = e.id
    if (e.nome) nomeToId[e.nome.trim()] = e.id
    idToNome[e.id] = e.nome ?? e.slot
  }

  // 2. Buscar jogos de grupos finalizados
  let jogosQ = supabase.from('jogos').select('*').eq('fase', 'grupos').eq('status', 'finalizado')
  if (torneioId) jogosQ = jogosQ.eq('torneio_id', torneioId)
  const { data: jogos, error: jogosErr } = await jogosQ
  if (jogosErr) return NextResponse.json({ error: jogosErr.message }, { status: 500 })

  // 3. Buscar linhas de classificação (auto-inicializar se não existirem)
  let linhasQ = supabase.from('classificacao_grupos').select('*')
  if (torneioId) linhasQ = linhasQ.eq('torneio_id', torneioId)
  let { data: linhas, error: linhasErr } = await linhasQ
  if (linhasErr) return NextResponse.json({ error: linhasErr.message }, { status: 500 })

  if ((!linhas || linhas.length === 0) && torneioId) {
    for (const e of equipasRows ?? []) {
      await supabase.from('classificacao_grupos').upsert({
        equipa_id: e.id, grupo: e.grupo, torneio_id: torneioId,
        jogos_jogados: 0, vitorias: 0, empates: 0, derrotas: 0,
        golos_marcados: 0, golos_sofridos: 0, pontos: 0, posicao: 0,
        nome: e.nome ?? e.slot,
      }, { onConflict: 'equipa_id,torneio_id' })
    }
    const { data: novasLinhas } = await supabase.from('classificacao_grupos').select('*').eq('torneio_id', torneioId)
    linhas = novasLinhas
  }

  // 4. Calcular totais por equipa (resolver UUID por slot se equipa_a_id for null)
  const init = () => ({
    jogos_jogados: 0, vitorias: 0, empates: 0, derrotas: 0,
    golos_marcados: 0, golos_sofridos: 0,
    amarelos: 0, vermelhos: 0, faltas: 0, pontos: 0,
    vermelho_direto: 0, vermelho_acumulacao: 0,
  })
  const totais: Record<string, ReturnType<typeof init>> = {}

  for (const j of jogos ?? []) {
    const idA = j.equipa_a_id ?? slotToId[j.equipa_a_nome] ?? nomeToId[j.equipa_a_nome?.trim()] ?? null
    const idB = j.equipa_b_id ?? slotToId[j.equipa_b_nome] ?? nomeToId[j.equipa_b_nome?.trim()] ?? null
    if (!idA || !idB) continue

    const pontosA = j.golos_a > j.golos_b ? 3 : j.golos_a === j.golos_b ? 1 : 0
    const pontosB = j.golos_b > j.golos_a ? 3 : j.golos_a === j.golos_b ? 1 : 0

    if (!totais[idA]) totais[idA] = init()
    if (!totais[idB]) totais[idB] = init()

    const a = totais[idA]
    a.jogos_jogados++
    a.vitorias   += pontosA === 3 ? 1 : 0
    a.empates    += pontosA === 1 ? 1 : 0
    a.derrotas   += pontosA === 0 ? 1 : 0
    a.golos_marcados += j.golos_a ?? 0
    a.golos_sofridos += j.golos_b ?? 0
    a.amarelos          += j.amarelos_a ?? 0
    a.vermelhos         += j.vermelhos_a ?? 0
    a.faltas            += j.faltas_a ?? 0
    a.pontos            += pontosA
    a.vermelho_direto   += j.vermelho_direto_a ?? 0
    a.vermelho_acumulacao += j.vermelho_acumulacao_a ?? 0

    const b = totais[idB]
    b.jogos_jogados++
    b.vitorias   += pontosB === 3 ? 1 : 0
    b.empates    += pontosB === 1 ? 1 : 0
    b.derrotas   += pontosB === 0 ? 1 : 0
    b.golos_marcados += j.golos_b ?? 0
    b.golos_sofridos += j.golos_a ?? 0
    b.amarelos          += j.amarelos_b ?? 0
    b.vermelhos         += j.vermelhos_b ?? 0
    b.faltas            += j.faltas_b ?? 0
    b.pontos            += pontosB
    b.vermelho_direto   += j.vermelho_direto_b ?? 0
    b.vermelho_acumulacao += j.vermelho_acumulacao_b ?? 0
  }

  // 5. Calcular posições por grupo
  const gruposMap: Record<string, string[]> = {}
  for (const l of linhas ?? []) {
    ;(gruposMap[l.grupo] ??= []).push(l.equipa_id)
  }
  const posicoes: Record<string, number> = {}
  for (const grupo of Object.keys(gruposMap)) {
    gruposMap[grupo]
      .sort((a, b) => {
        const ta = totais[a] ?? init()
        const tb = totais[b] ?? init()
        if (tb.pontos !== ta.pontos) return tb.pontos - ta.pontos
        const dgA = ta.golos_marcados - ta.golos_sofridos
        const dgB = tb.golos_marcados - tb.golos_sofridos
        if (dgB !== dgA) return dgB - dgA
        return tb.golos_marcados - ta.golos_marcados
      })
      .forEach((id, idx) => { posicoes[id] = idx + 1 })
  }

  // 6. Atualizar cada linha
  const erros: string[] = []
  for (const linha of linhas ?? []) {
    const t = totais[linha.equipa_id] ?? init()
    const vOutros = Math.max(0, t.vermelhos - t.vermelho_direto - t.vermelho_acumulacao)
    const pontosDisc = t.faltas * 1 + t.amarelos * 20 + t.vermelho_acumulacao * 50 + (t.vermelho_direto + vOutros) * 100
    const { error } = await supabase.from('classificacao_grupos').update({
      posicao:           posicoes[linha.equipa_id] ?? 0,
      jogos_jogados:     t.jogos_jogados,
      vitorias:          t.vitorias,
      empates:           t.empates,
      derrotas:          t.derrotas,
      golos_marcados:    t.golos_marcados,
      golos_sofridos:    t.golos_sofridos,
      pontos:            t.pontos,
      amarelos:          t.amarelos,
      vermelhos:         t.vermelhos,
      faltas:            t.faltas,
      pontos_disciplina: pontosDisc,
      nome: idToNome[linha.equipa_id] ?? null,
    }).eq('equipa_id', linha.equipa_id).eq('torneio_id', linha.torneio_id)
    if (error) erros.push(`${linha.equipa_id}: ${error.message}`)
  }

  return NextResponse.json({
    ok: erros.length === 0,
    jogos_processados: jogos?.length ?? 0,
    equipas_atualizadas: (linhas?.length ?? 0) - erros.length,
    erros: erros.length > 0 ? erros : undefined,
  })
}
