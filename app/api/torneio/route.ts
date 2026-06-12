export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getFormatoConfig } from '@/lib/torneio'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('torneios').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const body = await req.json()
  const adminId = req.headers.get('X-Admin-Id') ?? 'unknown'

  const { formato, admins: adminsLista, ...rest } = body
  const { numGrupos, equipasPorGrupo } = getFormatoConfig(formato)

  const { data: torneio, error } = await supabase.from('torneios').insert({
    ...rest,
    formato,
    num_grupos: numGrupos,
    equipas_por_grupo: equipasPorGrupo,
    criado_por: adminId,
    status: 'rascunho',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Criar slots de equipas vazios
  const letras = ['A', 'B', 'C'].slice(0, numGrupos)
  const equipas = letras.flatMap(grupo =>
    Array.from({ length: equipasPorGrupo }, (_, i) => ({
      torneio_id: torneio.id,
      slot: `${grupo}${i + 1}`,
      grupo,
      nome: '',
      confirmada: false,
    }))
  )
  await supabase.from('equipas').insert(equipas)

  // Criar registos de classificação vazios
  const classif = letras.flatMap(grupo =>
    Array.from({ length: equipasPorGrupo }, (_, i) => {
      const slot = `${grupo}${i + 1}`
      return {
        torneio_id: torneio.id,
        equipa_id: null as unknown as string, // será preenchido quando equipa for confirmada
        grupo,
        posicao: i + 1,
        pontos: 0, jogos_jogados: 0, vitorias: 0, empates: 0, derrotas: 0,
        golos_marcados: 0, golos_sofridos: 0,
        amarelos: 0, vermelhos: 0, faltas: 0, pontos_disciplina: 0,
        vermelho_direto: 0, vermelho_acumulacao: 0,
      }
    })
  )
  // Apenas cria classificações quando equipas forem atribuídas

  // Atribuir admins ao torneio se fornecidos
  if (adminsLista?.length) {
    await supabase.from('torneio_admins').insert(
      adminsLista.map((aid: string) => ({ torneio_id: torneio.id, admin_id: aid }))
    )
  }

  return NextResponse.json(torneio)
}
