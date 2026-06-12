export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: Request, { params }: { params: { jogo_id: string } }) {
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const { data: jogo } = await supabase.from('jogos').select('admin_em_sessao').eq('id', jogoId).single()
  if (jogo?.admin_em_sessao && jogo.admin_em_sessao !== adminId) {
    return NextResponse.json({ locked: true, by: jogo.admin_em_sessao })
  }
  await supabase.from('jogos').update({ admin_em_sessao: adminId }).eq('id', jogoId)
  return NextResponse.json({ locked: false })
}
