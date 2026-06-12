export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('torneios').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Buscar admins do torneio
  const { data: torneioAdmins } = await supabase
    .from('torneio_admins').select('admin_id').eq('torneio_id', params.id)

  return NextResponse.json({
    ...data,
    admins: torneioAdmins?.map(a => ({ id: a.admin_id })) ?? [],
  })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { admins, ...torneioData } = body

  const { data, error } = await supabase
    .from('torneios').update(torneioData).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualizar admins se fornecidos
  if (admins !== undefined) {
    await supabase.from('torneio_admins').delete().eq('torneio_id', params.id)
    if (admins.length > 0) {
      await supabase.from('torneio_admins').insert(
        admins.map((aid: string) => ({ torneio_id: params.id, admin_id: aid }))
      )
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('torneios').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
