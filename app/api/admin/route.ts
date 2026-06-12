export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('admins').select('id, nome, role').order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const { nome, password, role = 'admin' } = await req.json()

  if (!nome || !password) return NextResponse.json({ error: 'Nome e password obrigatórios' }, { status: 400 })

  // Gerar ID a partir do nome (minúsculas, sem espaços, sem acentos)
  const id = nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)

  const { data, error } = await supabase.from('admins').insert({ id, nome, password, role }).select('id, nome, role').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
