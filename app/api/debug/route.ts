export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const jogoId = url.searchParams.get('id')
  const supabase = createServiceClient()

  const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role ✅' : 'anon_key ❌'

  if (!jogoId) {
    return NextResponse.json({ keyType, erro: 'Passa ?id=UUID do jogo' })
  }

  // Ler colunas da tabela historico_acoes via uma linha de amostra
  const { data: sample, error: sampleErr } = await supabase
    .from('historico_acoes').select('*').limit(1)

  // Tentar insert de teste
  const { data: inserted, error: insertErr } = await supabase
    .from('historico_acoes').insert({
      jogo_id: jogoId,
      tipo: 'teste',
      equipa: 'a',
      valor_novo: 99,
      admin_id: 'debug'
    }).select()

  // Limpar o registo de teste
  if (inserted?.[0]?.id) {
    await supabase.from('historico_acoes').delete().eq('id', inserted[0].id)
  }

  // Verificar classificacao_grupos
  const { data: classif, error: classifErr } = await supabase
    .from('classificacao_grupos').select('*').limit(3)

  // Verificar equipas
  const { data: equipas, error: equipasErr } = await supabase
    .from('equipas').select('id, nome, codigo, grupo').limit(5)

  return NextResponse.json({
    keyType,
    historico_insert_ok: !insertErr,
    historico_insert_erro: insertErr?.message ?? null,
    classificacao_rows: classif?.length ?? 0,
    classificacao_erro: classifErr?.message ?? null,
    classificacao_amostra: classif?.[0] ? Object.keys(classif[0]) : [],
    classificacao_data: classif?.slice(0,2) ?? [],
    equipas_rows: equipas?.length ?? 0,
    equipas_amostra: equipas?.[0] ?? null,
  })
}
