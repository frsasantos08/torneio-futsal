// ============================================
// Tipos e helpers para o sistema de torneios
// ============================================

export type FormatoTorneio = 8 | 10 | 12

export interface Pausa {
  hora: string       // "12:00"
  duracao: number    // minutos
  descricao: string
}

export interface Torneio {
  id: string
  nome: string
  logo_url?: string
  organizador: string
  data_inicio: string  // "2026-06-20"
  data_fim: string
  formato: FormatoTorneio
  num_grupos: number
  equipas_por_grupo: number
  dia1_inicio: string  // "09:00"
  dia1_fim: string
  dia2_inicio: string
  dia2_fim: string
  duracao_jogo: number    // minutos por slot
  intervalo_jogos: number // minutos entre jogos
  pausas_dia2: Pausa[]
  status: 'rascunho' | 'ativo' | 'finalizado'
  criado_por?: string
  created_at?: string
}

export interface EquipaTorneio {
  id: string
  torneio_id: string
  nome: string
  slot: string     // "A1", "B3"
  grupo: string    // "A", "B"
  confirmada: boolean
}

export type TipoTrofeu = 'melhor_ataque' | 'melhor_defesa' | 'disciplina' | 'copofonia' | '1lugar' | '2lugar' | '3lugar'

export interface Trofeu {
  id: string
  torneio_id: string
  tipo: TipoTrofeu
  equipa_id?: string
  equipa_nome?: string
  confirmado: boolean
  confirmado_por?: string
  notas?: string
  visivel_tv: boolean
}

export interface RankingEntry {
  equipa_id: string
  nome: string
  grupo: string
  valor: number
  detalhe?: string  // ex: "23 golos marcados"
}

export const TROFEU_LABELS: Record<TipoTrofeu, { label: string; icon: string; desc: string }> = {
  melhor_ataque:  { label: 'Melhor Ataque',     icon: '🏹', desc: 'Equipa com mais golos marcados na fase de grupos' },
  melhor_defesa:  { label: 'Melhor Defesa',     icon: '🛡️', desc: 'Equipa com menos golos sofridos na fase de grupos' },
  disciplina:     { label: 'Taça de Disciplina',icon: '🎖️', desc: 'Melhor pontuação de disciplina (§6.2.1)' },
  copofonia:      { label: 'Copofonia',          icon: '🍺', desc: 'Atribuído manualmente pelo organizador' },
  '1lugar':       { label: '1º Lugar',           icon: '🥇', desc: 'Vencedor do torneio' },
  '2lugar':       { label: '2º Lugar',           icon: '🥈', desc: 'Finalista do torneio' },
  '3lugar':       { label: '3º Lugar',           icon: '🥉', desc: 'Vencedor do 3.º/4.º lugar' },
}

export const TROFEU_ORDEM: TipoTrofeu[] = [
  '1lugar','2lugar','3lugar','melhor_ataque','melhor_defesa','disciplina','copofonia'
]

// ── Configuração por formato ──────────────────────────────────────────────────

export function getFormatoConfig(formato: FormatoTorneio): { numGrupos: number; equipasPorGrupo: number } {
  if (formato === 8)  return { numGrupos: 2, equipasPorGrupo: 4 }
  if (formato === 10) return { numGrupos: 2, equipasPorGrupo: 5 }
  return { numGrupos: 3, equipasPorGrupo: 4 }
}

export function getGruposLetras(numGrupos: number): string[] {
  return ['A', 'B', 'C'].slice(0, numGrupos)
}

export function getSlotsGrupo(grupo: string, equipasPorGrupo: number): string[] {
  return Array.from({ length: equipasPorGrupo }, (_, i) => `${grupo}${i + 1}`)
}

export function getTodosSlots(numGrupos: number, equipasPorGrupo: number): string[] {
  const letras = getGruposLetras(numGrupos)
  return letras.flatMap(l => getSlotsGrupo(l, equipasPorGrupo))
}

// ── Geração de pares round-robin ──────────────────────────────────────────────

/**
 * Gera todos os pares round-robin para um grupo e ordena-os de forma a que
 * nenhuma equipa jogue em duas posições consecutivas (garantindo descanso mínimo).
 * Usa o método berger (circle method) para n par, e com bye para n ímpar.
 */
export function gerarParesRoundRobin(slots: string[]): [string, string][] {
  const n = slots.length
  const pares: [string, string][] = []

  // Circle method: adiciona um "bye" se n for ímpar
  const teams = n % 2 === 0 ? [...slots] : [...slots, 'BYE']
  const N = teams.length // par

  // Gera rounds usando rotação (fix teams[0], rotate the rest)
  for (let round = 0; round < N - 1; round++) {
    // Build current round pairings
    const roundPares: [string, string][] = []
    for (let i = 0; i < N / 2; i++) {
      const home = i === 0 ? teams[0] : teams[1 + ((round + i - 1) % (N - 1))]
      const away = teams[1 + ((round + N - 1 - i - 1) % (N - 1))]
      if (home !== 'BYE' && away !== 'BYE') {
        roundPares.push([home, away])
      }
    }
    pares.push(...roundPares)
  }

  // Reordena para evitar equipas consecutivas (greedy com look-ahead)
  return ordenarSemConsecutivos(pares)
}

/**
 * Reordena uma lista de jogos de forma a minimizar (idealmente eliminar)
 * casos em que a mesma equipa aparece em jogos consecutivos.
 * Usa greedy com heurística "escolhe o par que deixa mais opções a seguir".
 */
function ordenarSemConsecutivos(pares: [string, string][]): [string, string][] {
  const remaining = [...pares]
  const result: [string, string][] = []

  while (remaining.length > 0) {
    const [lastA, lastB] = result.length > 0 ? result[result.length - 1] : ['__', '__']

    // Candidatos válidos: não partilham equipas com o jogo anterior
    const validos = remaining
      .map((p, i) => ({ p, i }))
      .filter(({ p: [a, b] }) => a !== lastA && a !== lastB && b !== lastA && b !== lastB)

    let escolhido: number

    if (validos.length === 0) {
      // Sem opção perfeita: escolhe o próximo disponível
      escolhido = 0
    } else if (validos.length === 1) {
      escolhido = validos[0].i
    } else {
      // Heurística: escolhe o par que deixa mais pares válidos a seguir
      let bestScore = -1
      let bestIdx = validos[0].i
      for (const { p: [a, b], i } of validos) {
        const restantes = remaining.filter((_, j) => j !== i)
        const score = restantes.filter(([fa, fb]) =>
          fa !== a && fa !== b && fb !== a && fb !== b
        ).length
        if (score > bestScore) { bestScore = score; bestIdx = i }
      }
      escolhido = bestIdx
    }

    result.push(remaining.splice(escolhido, 1)[0])
  }

  return result
}

// Intercala jogos de diferentes grupos (já ordenados internamente)
export function interleaveJogos(
  jogosPorGrupo: { grupo: string; pares: [string, string][] }[]
): { grupo: string; slotA: string; slotB: string }[] {

  // Cada grupo já tem os seus jogos ordenados sem consecutivos
  // Intercala round-robin entre grupos: 1 jogo de A, 1 de B, 1 de A, ...
  const filas = jogosPorGrupo.map(g => ({ grupo: g.grupo, pares: [...g.pares] }))
  const resultado: { grupo: string; slotA: string; slotB: string }[] = []

  let grupoIdx = 0
  while (filas.some(f => f.pares.length > 0)) {
    // Avança para o próximo grupo com jogos disponíveis
    let tentativas = 0
    while (filas[grupoIdx % filas.length].pares.length === 0) {
      grupoIdx++
      tentativas++
      if (tentativas > filas.length) break
    }
    const fila = filas[grupoIdx % filas.length]
    if (fila.pares.length === 0) break
    const [slotA, slotB] = fila.pares.shift()!
    resultado.push({ grupo: fila.grupo, slotA, slotB })
    grupoIdx++
  }

  return resultado
}

// ── Slots de tempo ────────────────────────────────────────────────────────────

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

export function buildDateTime(dateStr: string, timeMin: number): string {
  // Guarda como string local sem conversão UTC (evita desfasamento de fuso horário)
  const h = String(Math.floor(timeMin / 60)).padStart(2, '0')
  const m = String(timeMin % 60).padStart(2, '0')
  return `${dateStr}T${h}:${m}:00`
}

export function generateTimeSlots(
  dateStr: string,
  inicioStr: string,
  fimStr: string,
  duracaoJogo: number,
  intervaloJogos: number,
  pausas: Pausa[] = []
): string[] {
  const slots: string[] = []
  const slotTotal = duracaoJogo + intervaloJogos
  const inicio = timeToMin(inicioStr)
  const fim = timeToMin(fimStr)
  let current = inicio

  while (current + duracaoJogo <= fim) {
    let pulado = false

    for (const pausa of pausas) {
      const pInicio = timeToMin(pausa.hora)
      const pFim = pInicio + pausa.duracao
      if (current >= pInicio && current < pFim) {
        current = pFim; pulado = true; break
      }
      if (current < pInicio && current + duracaoJogo > pInicio) {
        current = pFim; pulado = true; break
      }
    }

    if (!pulado) {
      slots.push(buildDateTime(dateStr, current))
      current += slotTotal
    }
  }

  return slots
}

// ── Disciplina ────────────────────────────────────────────────────────────────
// Menor pontuação = melhor disciplina

export function calcularPontosDisciplina(
  faltas: number,
  amarelos: number,
  vermelhosDireto: number,
  vermelhosAcumulacao: number
): number {
  return (faltas * 1) + (amarelos * 20) + (vermelhosDireto * 100) + (vermelhosAcumulacao * 50)
}
