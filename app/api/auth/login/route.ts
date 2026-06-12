export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const { password, admin_id } = await req.json()

  if (!password || !admin_id) {
    return NextResponse.json({ error: 'ID e password obrigatórios' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Procurar admin na tabela
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, nome, password, role')
    .eq('id', admin_id)
    .single()

  if (error || !admin) {
    return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 401 })
  }

  if (admin.password !== password) {
    return NextResponse.json({ error: 'Password incorreta' }, { status: 401 })
  }

  const token = Buffer.from(`${admin_id}:${Date.now()}:${Math.random()}`).toString('base64')

  await supabase.from('admin_logs').insert({
    admin_id,
    acao: 'login',
    detalhes: { role: admin.role, timestamp: new Date().toISOString() },
  }).then(() => {})

  return NextResponse.json({
    token,
    admin_id: admin.id,
    role: admin.role,
    nome: admin.nome,
  })
}
