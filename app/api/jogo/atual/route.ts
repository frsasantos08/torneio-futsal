export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const torneioId = searchParams.get('torneio_id')

  let query = supabase
    .from('jogos')
    .select('*')
    .eq('status', 'decorrer')
    .order('data_hora')
    .limit(1)
    .maybeSingle()

  if (torneioId) {
    query = (query as any).eq('torneio_id', torneioId)
  } else {
    query = (query as any).is('torneio_id', null)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
