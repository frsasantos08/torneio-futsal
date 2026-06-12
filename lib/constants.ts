export const GRUPOS = ['A', 'B', 'C'] as const

// Mapa de código de equipa → nome completo
// equipa_a_nome no Supabase tem valores como "A1", "B2", etc.
export const EQUIPAS: Record<string, { nome: string; grupo: string }> = {
  A1: { nome: 'ALGERIZ',      grupo: 'A' },
  A2: { nome: 'MARCOPINTA',   grupo: 'A' },
  A3: { nome: 'TÁ-LENTO',     grupo: 'A' },
  A4: { nome: 'OS PRIMOS',    grupo: 'A' },
  B1: { nome: 'CAÇADORES',    grupo: 'B' },
  B2: { nome: 'FERREIROS',    grupo: 'B' },
  B3: { nome: 'MOTOR FC',     grupo: 'B' },
  B4: { nome: 'FAMÍLIA',      grupo: 'B' },
  C1: { nome: 'PENEDONES',    grupo: 'C' },
  C2: { nome: 'BENFIQUISTAS', grupo: 'C' },
  C3: { nome: 'OS AMIGOS',    grupo: 'C' },
  C4: { nome: 'LAST MINUTE',  grupo: 'C' },
}

/** Resolve o nome de exibição: "A1" → "ALGERIZ", ou devolve o valor tal como está */
export function resolveNomeEquipa(codigo?: string | null): string {
  if (!codigo) return '?'
  return EQUIPAS[codigo]?.nome ?? codigo
}

export type JogoStatus = 'pendente' | 'decorrer' | 'finalizado'
export type Equipa = 'a' | 'b'
export type TipoAcao = 'golo' | 'amarelo' | 'vermelho' | 'falta'

// Schema real do Supabase (id = UUID, equipas por nome-código)
export interface Jogo {
  id: string              // UUID
  numero_jogo?: number    // inteiro para display
  fase: string
  grupo?: string
  equipa_a_id?: string    // UUID da equipa A
  equipa_b_id?: string    // UUID da equipa B
  equipa_a_nome?: string  // ex: "A1"
  equipa_b_nome?: string  // ex: "A2"
  golos_a: number
  golos_b: number
  amarelos_a: number
  amarelos_b: number
  vermelhos_a: number
  vermelhos_b: number
  faltas_a: number
  faltas_b: number
  status: JogoStatus
  resultado_confirmado: boolean
  admin_em_sessao?: string | null
  data_hora: string
  updated_at: string
  created_at?: string
}

export interface HistoricoAcao {
  id: string
  jogo_id: string   // UUID
  tipo: TipoAcao
  equipa: Equipa
  valor_novo: number
  admin_id: string
  timestamp: string
}

export interface ClassificacaoEquipa {
  id?: string
  equipa_id: string
  equipa_nome?: string   // nome ou código
  grupo: string
  jogos_disputados: number
  vitorias: number
  empates: number
  derrotas: number
  golos_marcados: number
  golos_sofridos: number
  diferenca_golos?: number
  amarelos?: number
  vermelhos?: number
  faltas?: number
  pontos: number
}

export const STATUS_LABELS: Record<JogoStatus, string> = {
  pendente: 'Pendente',
  decorrer: 'A Decorrer',
  finalizado: 'Finalizado',
}

export const ACAO_ICONS: Record<TipoAcao, string> = {
  golo: '⚽',
  amarelo: '🟨',
  vermelho: '🟥',
  falta: '⚠️',
}

export const MAX_DESFAZER = 10
