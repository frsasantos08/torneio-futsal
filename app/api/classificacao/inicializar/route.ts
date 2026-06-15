export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const { torneio_id } = await req.json() as { torneio_id: string }

  if (!torneio_id) return NextResponse.json({ error: 'torneio_id obrigatório' }, { status: 400 })

  // Recolher todas as equipas únicas dos jogos de grupos deste torneio
  const { data: jogos, error } = await supabase
    .from('jogos')
    .select('equipa_a_id, equipa_b_id, grupo')
    .eq('torneio_id', torneio_id)
    .eq('fase', 'grupos')
    .not('equipa_a_id', 'is', null)
    .not('equipa_b_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mapa equipa_id -> grupo
  const equipas: Record<string, string> = {}
  for (const j of jogos ?? []) {
    if (j.equipa_a_id) equipas[j.equipa_a_id] = j.grupo ?? 'A'
    if (j.equipa_b_id) equipas[j.equipa_b_id] = j.grupo ?? 'A'
  }

  if (Object.keys(equipas).length === 0) {
    return NextResponse.json({ error: 'Sem equipas encontradas nos jogos de grupos' }, { status: 400 })
  }

  // Para cada equipa, inserir linha se ainda não existir
  let criadas = 0
  let existentes = 0

  for (const [equipaId, grupo] of Object.entries(equipas)) {
    const { data: existe } = await supabase
      .from('classificacao_grupos')
      .select('id')
      .eq('equipa_id', equipaId)
      .eq('torneio_id', torneio_id)
      .maybeSingle()

    if (existe) { existentes++; continue }

    const { error: insertErr } = await supabase.from('classificacao_grupos').insert({
      equipa_id: equipaId,
      grupo,
      torneio_id,
      jogos_jogados: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golos_marcados: 0,
      golos_sofridos: 0,
      pontos: 0,
      posicao: 0,
    })

    if (insertErr) {
      console.error('[inicializar] erro ao inserir equipa', equipaId, insertErr.message)
    } else {
      criadas++
    }
  }

  return NextResponse.json({ ok: true, criadas, existentes, total: Object.keys(equipas).length })
}
