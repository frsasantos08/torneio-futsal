export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST() {
  const supabase = createServiceClient()

  // 1. Buscar todos os jogos de grupos finalizados
  const { data: jogos, error: jogosErr } = await supabase
    .from('jogos')
    .select('*')
    .eq('fase', 'grupos')
    .eq('status', 'finalizado')

  if (jogosErr) return NextResponse.json({ error: jogosErr.message }, { status: 500 })

  // 2. Buscar todas as linhas da classificação
  const { data: linhas, error: linhasErr } = await supabase
    .from('classificacao_grupos')
    .select('*')

  if (linhasErr) return NextResponse.json({ error: linhasErr.message }, { status: 500 })

  // 3. Calcular totais por equipa a partir dos jogos
  const totais: Record<string, {
    jogos_jogados: number, vitorias: number, empates: number, derrotas: number,
    golos_marcados: number, golos_sofridos: number,
    amarelos: number, vermelhos: number, faltas: number, pontos: number,
  }> = {}

  const init = () => ({
    jogos_jogados: 0, vitorias: 0, empates: 0, derrotas: 0,
    golos_marcados: 0, golos_sofridos: 0,
    amarelos: 0, vermelhos: 0, faltas: 0, pontos: 0,
  })

  for (const j of jogos ?? []) {
    if (!j.equipa_a_id || !j.equipa_b_id) continue

    const pontosA = j.golos_a > j.golos_b ? 3 : j.golos_a === j.golos_b ? 1 : 0
    const pontosB = j.golos_b > j.golos_a ? 3 : j.golos_a === j.golos_b ? 1 : 0

    if (!totais[j.equipa_a_id]) totais[j.equipa_a_id] = init()
    if (!totais[j.equipa_b_id]) totais[j.equipa_b_id] = init()

    const a = totais[j.equipa_a_id]
    a.jogos_jogados++
    a.vitorias   += pontosA === 3 ? 1 : 0
    a.empates    += pontosA === 1 ? 1 : 0
    a.derrotas   += pontosA === 0 ? 1 : 0
    a.golos_marcados += j.golos_a ?? 0
    a.golos_sofridos += j.golos_b ?? 0
    a.amarelos   += j.amarelos_a ?? 0
    a.vermelhos  += j.vermelhos_a ?? 0
    a.faltas     += j.faltas_a ?? 0
    a.pontos     += pontosA

    const b = totais[j.equipa_b_id]
    b.jogos_jogados++
    b.vitorias   += pontosB === 3 ? 1 : 0
    b.empates    += pontosB === 1 ? 1 : 0
    b.derrotas   += pontosB === 0 ? 1 : 0
    b.golos_marcados += j.golos_b ?? 0
    b.golos_sofridos += j.golos_a ?? 0
    b.amarelos   += j.amarelos_b ?? 0
    b.vermelhos  += j.vermelhos_b ?? 0
    b.faltas     += j.faltas_b ?? 0
    b.pontos     += pontosB
  }

  // 4. Calcular posição dentro de cada grupo (por pontos → DG → GM)
  const gruposMap: Record<string, string[]> = {}
  for (const linha of linhas ?? []) {
    const g = linha.grupo as string
    if (!gruposMap[g]) gruposMap[g] = []
    gruposMap[g].push(linha.equipa_id)
  }

  const posicoes: Record<string, number> = {}
  for (const grupo of Object.keys(gruposMap)) {
    const equipasOrdenadas = gruposMap[grupo].sort((a, b) => {
      const ta = totais[a] ?? init()
      const tb = totais[b] ?? init()
      if (tb.pontos !== ta.pontos) return tb.pontos - ta.pontos
      const dgA = ta.golos_marcados - ta.golos_sofridos
      const dgB = tb.golos_marcados - tb.golos_sofridos
      if (dgB !== dgA) return dgB - dgA
      return tb.golos_marcados - ta.golos_marcados
    })
    equipasOrdenadas.forEach((id, idx) => { posicoes[id] = idx + 1 })
  }

  // 5. Atualizar cada linha da classificação
  const erros: string[] = []
  const amostra = linhas?.[0] ? Object.keys(linhas[0]) : []
  const temFaltas    = amostra.includes('faltas')
  const temAmarelos  = amostra.includes('amarelos')
  const temVermelhos = amostra.includes('vermelhos')

  for (const linha of linhas ?? []) {
    const t = totais[linha.equipa_id] ?? init()

    const update: Record<string, number> = {
      posicao:        posicoes[linha.equipa_id] ?? 0,
      jogos_jogados:  t.jogos_jogados,
      vitorias:       t.vitorias,
      empates:        t.empates,
      derrotas:       t.derrotas,
      golos_marcados: t.golos_marcados,
      golos_sofridos: t.golos_sofridos,
      pontos:         t.pontos,
    }
    if (temAmarelos)  update.amarelos  = t.amarelos
    if (temVermelhos) update.vermelhos = t.vermelhos
    if (temFaltas)    update.faltas    = t.faltas

    const { error } = await supabase
      .from('classificacao_grupos')
      .update(update)
      .eq('equipa_id', linha.equipa_id)

    if (error) erros.push(`${linha.equipa_id}: ${error.message}`)
  }

  return NextResponse.json({
    ok: erros.length === 0,
    jogos_processados: jogos?.length ?? 0,
    equipas_atualizadas: (linhas?.length ?? 0) - erros.length,
    erros: erros.length > 0 ? erros : undefined,
  })
}
