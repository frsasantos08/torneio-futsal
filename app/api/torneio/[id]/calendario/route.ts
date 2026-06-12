export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  getGruposLetras, getSlotsGrupo, gerarParesRoundRobin,
  interleaveJogos, generateTimeSlots, type Pausa,
} from '@/lib/torneio'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('jogos').select('*').eq('torneio_id', params.id).order('numero_jogo')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  // Buscar config do torneio
  const { data: t, error: tErr } = await supabase
    .from('torneios').select('*').eq('id', params.id).single()
  if (tErr || !t) return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 })

  // Apagar jogos existentes deste torneio (regerar)
  const body = await req.json().catch(() => ({}))
  if (body.regenerar) {
    await supabase.from('jogos').delete().eq('torneio_id', params.id)
  } else {
    const { data: existentes } = await supabase.from('jogos').select('id').eq('torneio_id', params.id)
    if (existentes && existentes.length > 0)
      return NextResponse.json({ error: 'Calendário já gerado. Usa regenerar:true para recriar.' }, { status: 400 })
  }

  const pausas: Pausa[] = t.pausas_dia2 ?? []
  const letras = getGruposLetras(t.num_grupos)

  // Gerar pares round-robin por grupo
  const paresGrupos = letras.map(grupo => ({
    grupo,
    pares: gerarParesRoundRobin(getSlotsGrupo(grupo, t.equipas_por_grupo)),
  }))

  // Intercalar jogos dos diferentes grupos
  const jogosGrupos = interleaveJogos(paresGrupos)

  // Slots de tempo disponíveis
  const dia1 = t.data_inicio
  const dia2 = t.data_fim
  const slotsDia1 = generateTimeSlots(dia1, t.dia1_inicio, t.dia1_fim, t.duracao_jogo, t.intervalo_jogos, [])
  const slotsDia2 = generateTimeSlots(dia2, t.dia2_inicio, t.dia2_fim, t.duracao_jogo, t.intervalo_jogos, pausas)

  // Distribuir: dia 1 → primeiros N jogos, dia 2 → restantes + eliminatórias
  const totalGrupos = jogosGrupos.length
  const slotsDisponiveis = [...slotsDia1, ...slotsDia2]

  if (slotsDisponiveis.length < totalGrupos) {
    return NextResponse.json({
      error: `Slots insuficientes: ${slotsDisponiveis.length} disponíveis para ${totalGrupos} jogos de grupos`
    }, { status: 400 })
  }

  const jogosParaInserir: object[] = []
  let numJogo = 1

  // Jogos de grupos
  for (let i = 0; i < jogosGrupos.length; i++) {
    const { grupo, slotA, slotB } = jogosGrupos[i]
    const dia = i < slotsDia1.length ? 1 : 2
    jogosParaInserir.push({
      torneio_id: params.id,
      numero_jogo: numJogo++,
      fase: 'grupos',
      grupo,
      equipa_a_nome: slotA,
      equipa_b_nome: slotB,
      equipa_a_id: null,
      equipa_b_id: null,
      golos_a: 0, golos_b: 0,
      amarelos_a: 0, amarelos_b: 0,
      vermelhos_a: 0, vermelhos_b: 0,
      faltas_a: 0, faltas_b: 0,
      vermelho_direto_a: 0, vermelho_direto_b: 0,
      vermelho_acumulacao_a: 0, vermelho_acumulacao_b: 0,
      status: 'pendente',
      data_hora: slotsDisponiveis[i],
    })
  }

  // Encontrar primeiro slot disponível no dia 2 após os jogos de grupos
  const slotsUsadosDia2 = jogosGrupos.length - slotsDia1.length
  const proxSlotIdx = Math.max(0, slotsUsadosDia2)
  const slotsDia2Disponiveis = slotsDia2.slice(proxSlotIdx)

  // Jogos de eliminatórias (placeholders)
  const eliminatorias = gerarEliminatorias(t.formato, numJogo)
  for (let i = 0; i < eliminatorias.length; i++) {
    const slot = slotsDia2Disponiveis[i]
    if (!slot) break
    jogosParaInserir.push({
      torneio_id: params.id,
      numero_jogo: eliminatorias[i].numero,
      fase: eliminatorias[i].fase,
      grupo: null,
      equipa_a_nome: eliminatorias[i].placeholder_a,
      equipa_b_nome: eliminatorias[i].placeholder_b,
      equipa_a_id: null, equipa_b_id: null,
      golos_a: 0, golos_b: 0,
      amarelos_a: 0, amarelos_b: 0,
      vermelhos_a: 0, vermelhos_b: 0,
      faltas_a: 0, faltas_b: 0,
      vermelho_direto_a: 0, vermelho_direto_b: 0,
      vermelho_acumulacao_a: 0, vermelho_acumulacao_b: 0,
      status: 'pendente',
      data_hora: slot,
    })
  }

  const { error: insertErr } = await supabase.from('jogos').insert(jogosParaInserir)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, jogos: jogosParaInserir.length })
}

// PUT — editar hora de um jogo específico
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { jogo_id, data_hora } = await req.json()

  const { error } = await supabase
    .from('jogos').update({ data_hora }).eq('id', jogo_id).eq('torneio_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gerarEliminatorias(formato: number, startNum: number) {
  const jogos: { numero: number; fase: string; placeholder_a: string; placeholder_b: string }[] = []
  let n = startNum

  if (formato === 10 || formato === 12) {
    // Meias-finais (1 mão)
    jogos.push({ numero: n++, fase: 'meias', placeholder_a: '1º Grupo A', placeholder_b: '2º Grupo B' })
    jogos.push({ numero: n++, fase: 'meias', placeholder_a: '1º Grupo B', placeholder_b: '2º Grupo A' })
    // 3º e 4º lugar
    jogos.push({ numero: n++, fase: '3_4_lugar', placeholder_a: 'Perdedor MF1', placeholder_b: 'Perdedor MF2' })
    // Final
    jogos.push({ numero: n++, fase: 'final', placeholder_a: 'Vencedor MF1', placeholder_b: 'Vencedor MF2' })
  } else if (formato === 8) {
    // Meias-finais (2 mãos — por isso 4 jogos)
    jogos.push({ numero: n++, fase: 'meias_1', placeholder_a: '1º Grupo A', placeholder_b: '2º Grupo B' })
    jogos.push({ numero: n++, fase: 'meias_1', placeholder_a: '1º Grupo B', placeholder_b: '2º Grupo A' })
    jogos.push({ numero: n++, fase: 'meias_2', placeholder_a: '2º Grupo B', placeholder_b: '1º Grupo A' })
    jogos.push({ numero: n++, fase: 'meias_2', placeholder_a: '2º Grupo A', placeholder_b: '1º Grupo B' })
    // 3º e 4º lugar
    jogos.push({ numero: n++, fase: '3_4_lugar', placeholder_a: 'Perdedor MF', placeholder_b: 'Perdedor MF' })
    // Final
    jogos.push({ numero: n++, fase: 'final', placeholder_a: 'Vencedor MF', placeholder_b: 'Vencedor MF' })
  }

  return jogos
}
