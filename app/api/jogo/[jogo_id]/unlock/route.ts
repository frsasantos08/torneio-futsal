export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(_req: Request, { params }: { params: { jogo_id: string } }) {
  const supabase = createServiceClient()
  await supabase.from('jogos').update({ admin_em_sessao: null }).eq('id', params.jogo_id)
  return NextResponse.json({ ok: true })
}
