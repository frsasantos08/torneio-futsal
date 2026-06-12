export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('trofeus').select('*').eq('torneio_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const body = await req.json()
  const { tipo, equipa_id, equipa_nome, confirmado, visivel_tv, notas } = body

  const update: Record<string, unknown> = {
    equipa_id: equipa_id ?? null,
    equipa_nome: equipa_nome ?? null,
    notas: notas ?? null,
  }

  if (confirmado !== undefined) {
    update.confirmado = confirmado
    if (confirmado) {
      update.confirmado_por = adminId
      update.confirmado_em = new Date().toISOString()
    }
  }

  if (visivel_tv !== undefined) update.visivel_tv = visivel_tv

  // Upsert
  const { data, error } = await supabase
    .from('trofeus')
    .upsert({ torneio_id: params.id, tipo, ...update }, { onConflict: 'torneio_id,tipo' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
