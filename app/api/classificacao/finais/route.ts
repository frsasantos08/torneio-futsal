export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { EQUIPAS } from '@/lib/constants'

export async function GET() {
  const supabase = createServiceClient()
  const { data: jogosFinais } = await supabase
    .from('jogos')
    .select('*')
    .in('fase', ['meias', 'terceiro', 'final'])
    .order('id')

  const { data: classificacao } = await supabase
    .from('classificacao_grupos')
    .select('*')
    .order('grupo')
    .order('pontos', { ascending: false })
    .order('diferenca_golos', { ascending: false })
    .order('golos_marcados', { ascending: false })

  const primeiros: Record<string, string> = {}
  const segundos: Record<string, string> = {}
  const grupos: Record<string, typeof classificacao> = {}

  for (const row of classificacao ?? []) {
    ;(grupos[row.grupo] ??= []).push(row)
  }

  for (const [grupo, equipas] of Object.entries(grupos)) {
    if (equipas?.[0]) primeiros[grupo] = equipas[0].equipa_id
    if (equipas?.[1]) segundos[grupo] = equipas[1].equipa_id
  }

  const enrich = (id?: string) => id ? { id, nome: EQUIPAS[id]?.nome ?? id } : null

  return NextResponse.json({
    jogos: jogosFinais?.map(j => ({
      ...j,
      nome_a: j.equipa_a ? EQUIPAS[j.equipa_a]?.nome : null,
      nome_b: j.equipa_b ? EQUIPAS[j.equipa_b]?.nome : null,
    })),
    classificados: {
      A: { primeiro: enrich(primeiros.A), segundo: enrich(segundos.A) },
      B: { primeiro: enrich(primeiros.B), segundo: enrich(segundos.B) },
      C: { primeiro: enrich(primeiros.C), segundo: enrich(segundos.C) },
    },
  })
}

