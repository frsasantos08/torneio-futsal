export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const torneioId = searchParams.get('torneio_id')

  const classifQuery = supabase.from('classificacao_grupos').select('*').order('grupo').order('pontos', { ascending: false })
  let equipasQuery = supabase.from('equipas').select('id, nome, slot')

  if (torneioId) {
    classifQuery.eq('torneio_id', torneioId)
    equipasQuery = equipasQuery.eq('torneio_id', torneioId)
  }

  const [{ data, error }, { data: equipasData }] = await Promise.all([classifQuery, equipasQuery])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mapa equipa_id -> nome (a partir da tabela equipas)
  const equipaMap: Record<string, string> = {}
  for (const e of equipasData ?? []) {
    // Usar nome se diferente do slot (nome real), senão usar slot
    equipaMap[e.id] = (e.nome && e.nome !== e.slot) ? e.nome : e.slot
  }

  const grupos: Record<string, object[]> = {}
  for (const row of data ?? []) {
    const grupo = (row.grupo as string) ?? 'A'
    const nome = equipaMap[row.equipa_id] ?? row.equipa_id
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
