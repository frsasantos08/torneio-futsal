export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { calcularPontosDisciplina } from '@/lib/torneio'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const [{ data: classif }, { data: equipas }] = await Promise.all([
    supabase.from('classificacao_grupos').select('*').eq('torneio_id', params.id),
    supabase.from('equipas').select('*').eq('torneio_id', params.id),
  ])

  // Mapa equipa_id → nome
  const nomeMap: Record<string, string> = {}
  for (const eq of equipas ?? []) {
    if (eq.id) nomeMap[eq.id] = eq.nome || eq.slot || eq.id
  }

  const rows = (classif ?? []).map(r => {
    const nome = nomeMap[r.equipa_id] || r.equipa_id
    const pd = calcularPontosDisciplina(
      r.faltas ?? 0,
      r.amarelos ?? 0,
      r.vermelho_direto ?? 0,
      r.vermelho_acumulacao ?? 0,
    )
    return {
      equipa_id: r.equipa_id,
      nome,
      grupo: r.grupo,
      pontos: r.pontos ?? 0,
      golos_marcados: r.golos_marcados ?? 0,
      golos_sofridos: r.golos_sofridos ?? 0,
      dg: (r.golos_marcados ?? 0) - (r.golos_sofridos ?? 0),
      amarelos: r.amarelos ?? 0,
      vermelhos: (r.vermelho_direto ?? 0) + (r.vermelho_acumulacao ?? 0),
      faltas: r.faltas ?? 0,
      pontos_disciplina: pd,
      jogos_jogados: r.jogos_jogados ?? 0,
    }
  })

  // Melhor ataque: mais golos marcados (desempate: DG → classificação)
  const melhorAtaque = [...rows]
    .sort((a, b) => b.golos_marcados - a.golos_marcados || b.dg - a.dg || b.pontos - a.pontos)
    .map((r, i) => ({ ...r, posicao: i + 1 }))

  // Melhor defesa: menos golos sofridos (desempate: classificação → DG)
  const melhorDefesa = [...rows]
    .sort((a, b) => a.golos_sofridos - b.golos_sofridos || b.pontos - a.pontos || b.dg - a.dg)
    .map((r, i) => ({ ...r, posicao: i + 1 }))

  // Disciplina: menor pontuação (menor = melhor)
  const disciplina = [...rows]
    .sort((a, b) => a.pontos_disciplina - b.pontos_disciplina || b.pontos - a.pontos)
    .map((r, i) => ({ ...r, posicao: i + 1 }))

  // Classificação geral: pontos → DG → GM
  const classificacaoGeral = [...rows]
    .sort((a, b) => b.pontos - a.pontos || b.dg - a.dg || b.golos_marcados - a.golos_marcados)
    .map((r, i) => ({ ...r, posicao: i + 1 }))

  return NextResponse.json({ melhorAtaque, melhorDefesa, disciplina, classificacaoGeral })
}
