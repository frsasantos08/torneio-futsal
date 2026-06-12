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

  const updates: Record<string, unknown> = {}

  if (nome !== undefined) {
    updates.nome = nome.trim() || null
    updates.confirmada = (nome.trim().length > 0)
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

  // ── Atualizar nome nos jogos em tempo real ──────────────────────────────────
  // Quando o admin atribui um nome ao slot, substitui o código (ex: "A2") pelo
  // nome real (ex: "MARCOPINTA") em todos os jogos deste torneio.
  // A TV tem subscribeAllJogos activo e vai reflectir a mudança imediatamente.
  if (nome !== undefined && data?.slot) {
    const slot = data.slot as string
    const nomeNovo = (nome.trim() || slot) // se apagou o nome, volta ao slot

    await Promise.all([
      supabase.from('jogos')
        .update({ equipa_a_nome: nomeNovo })
        .eq('torneio_id', params.id)
        .eq('equipa_a_nome', slot),
      supabase.from('jogos')
        .update({ equipa_b_nome: nomeNovo })
        .eq('torneio_id', params.id)
        .eq('equipa_b_nome', slot),
    ])
  }

  return NextResponse.json(data)
}
