export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('equipas').select('*').eq('torneio_id', params.id).order('slot')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { equipa_id, nome, confirmada: confirmadaOverride } = body

  if (!equipa_id) return NextResponse.json({ error: 'equipa_id obrigatório' }, { status: 400 })

  // Buscar estado actual ANTES de atualizar (para saber o nome antigo nos jogos)
  const { data: equipaAtual } = await supabase
    .from('equipas').select('slot, nome').eq('id', equipa_id).single()
  // Nome que está actualmente nos jogos: pode ser o slot (1ª vez) ou um nome anterior
  const nomeAtualNosJogos = equipaAtual?.nome?.trim() || equipaAtual?.slot || null

  const updates: Record<string, unknown> = {}
  if (nome !== undefined) {
    const nomeTrimmed = nome.trim()
    const nomeReal = (nomeTrimmed && nomeTrimmed !== equipaAtual?.slot) ? nomeTrimmed : null
    updates.nome = nomeReal
    updates.confirmada = nomeReal !== null
  }
  if (confirmadaOverride !== undefined) {
    updates.confirmada = confirmadaOverride
  }

  const { data, error } = await supabase
    .from('equipas')
    .update(updates)
    .eq('id', equipa_id)
    .eq('torneio_id', params.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualizar nome nos jogos usando o nome ANTIGO como critério de pesquisa
  if (nome !== undefined && equipaAtual?.slot) {
    const slot = equipaAtual.slot
    const nomeNovo = nome.trim() || slot

    // Atualizar jogos onde o nome ainda é o slot ou o nome anterior
    const criterios = Array.from(new Set([slot, nomeAtualNosJogos].filter(Boolean))) as string[]

    await Promise.all(
      criterios.flatMap(nomeVelho => [
        supabase.from('jogos')
          .update({ equipa_a_nome: nomeNovo })
          .eq('torneio_id', params.id)
          .eq('equipa_a_nome', nomeVelho),
        supabase.from('jogos')
          .update({ equipa_b_nome: nomeNovo })
          .eq('torneio_id', params.id)
          .eq('equipa_b_nome', nomeVelho),
      ])
    )
  }

  return NextResponse.json(data)
}
