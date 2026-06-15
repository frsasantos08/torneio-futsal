export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: { jogo_id: string } }) {
  const supabase = createServiceClient()
  const jogoId = params.jogo_id

  const [jogoRes, historicoRes] = await Promise.all([
    supabase.from('jogos').select('*').eq('id', jogoId).single(),
    supabase.from('historico_acoes').select('*').eq('jogo_id', jogoId)
      .order('timestamp', { ascending: false }).limit(10),
  ])

  if (jogoRes.error) return NextResponse.json({ error: jogoRes.error.message }, { status: 404 })
  return NextResponse.json(
    { jogo: jogoRes.data, historico: historicoRes.data ?? [] },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  )
}
