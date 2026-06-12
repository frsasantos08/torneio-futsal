export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const torneioId = searchParams.get('torneio_id')

  const classifQuery = supabase.from('classificacao_grupos').select('*').order('grupo').order('pontos', { ascending: false })
  const jogosQuery = supabase.from('jogos').select('equipa_a_id, equipa_a_nome, equipa_b_id, equipa_b_nome')

  if (torneioId) {
    classifQuery.eq('torneio_id', torneioId)
    jogosQuery.eq('torneio_id', torneioId)
  } else {
    classifQuery.is('torneio_id', null)
    jogosQuery.is('torneio_id', null)
  }

  const [{ data, error }, { data: jogosData }] = await Promise.all([classifQuery, jogosQuery])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mapa equipa_id -> nome (a partir dos jogos)
  const equipaMap: Record<string, string> = {}
  for (const j of jogosData ?? []) {
    if (j.equipa_a_id && j.equipa_a_nome) equipaMap[j.equipa_a_id] = j.equipa_a_nome
    if (j.equipa_b_id && j.equipa_b_nome) equipaMap[j.equipa_b_id] = j.equipa_b_nome
  }

  // Importar resolveNomeEquipa para converter código em nome completo
  const { resolveNomeEquipa } = await import('@/lib/constants')

  const grupos: Record<string, object[]> = { A: [], B: [], C: [] }
  for (const row of data ?? []) {
    const grupo = (row.grupo as string) ?? 'A'
    const codigo = equipaMap[row.equipa_id] ?? null  // ex: "A1"
    const nome = resolveNomeEquipa(codigo)             // ex: "ALGERIZ"
    ;(grupos[grupo] ??= []).push({
      ...row,
      nome,
      // Normalizar nomes de colunas para o frontend
      jogos_disputados: row.jogos_jogados ?? 0,
      vitorias: row.vitorias ?? 0,
      empates: row.empates ?? 0,
      derrotas: row.derrotas ?? 0,
      golos_marcados: row.golos_marcados ?? 0,
      golos_sofridos: row.golos_sofridos ?? 0,
      amarelos: row.amarelos ?? 0,
      vermelhos: row.vermelhos ?? 0,
      faltas: row.faltas ?? 0,
      pontos: row.pontos ?? 0,
    })
  }

  // Ordenar cada grupo
  for (const g of Object.keys(grupos)) {
    grupos[g].sort((a: object, b: object) => {
      const aa = a as Record<string, number>
      const bb = b as Record<string, number>
      if (bb.pontos !== aa.pontos) return (bb.pontos ?? 0) - (aa.pontos ?? 0)
      const diffA = (aa.golos_marcados ?? 0) - (aa.golos_sofridos ?? 0)
      const diffB = (bb.golos_marcados ?? 0) - (bb.golos_sofridos ?? 0)
      if (diffB !== diffA) return diffB - diffA
      return (bb.golos_marcados ?? 0) - (aa.golos_marcados ?? 0)
    })
  }

  return NextResponse.json(grupos)
}
