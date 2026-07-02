export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()

  // Tentar primeiro torneio com status 'ativo'
  const { data: ativo } = await supabase
    .from('torneios').select('id').eq('status', 'ativo').order('data_inicio', { ascending: false }).limit(1).single()
  if (ativo?.id) return NextResponse.json({ torneio_id: ativo.id })

  // Fallback: config manual
  const { data: cfg } = await supabase
    .from('configs').select('valor').eq('chave', 'torneio_ativo').single()
  return NextResponse.json({ torneio_id: cfg?.valor ?? null })
}

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const { torneio_id } = await req.json()

  const { error } = await supabase.from('configs').upsert(
    { chave: 'torneio_ativo', valor: torneio_id },
    { onConflict: 'chave' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, torneio_id })
}
