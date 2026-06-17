export const GRUPOS = ['A', 'B', 'C'] as const

// Nomes hardcoded removidos — os nomes vêm diretamente da BD (equipa_a_nome / equipa_b_nome)
export const EQUIPAS: Record<string, { nome: string; grupo: string }> = {}

/** Devolve o nome tal como está na BD — já não faz conversão de slot para nome */
export function resolveNomeEquipa(codigo?: string | null): string {
  if (!codigo) return '?'
  return codigo
}

export type JogoStatus = 'pendente' | 'decorrer' | 'finalizado'
export type Equipa = 'a' | 'b'
export type TipoAcao = 'golo' | 'amarelo' | 'vermelho' | 'vermelho_direto' | 'vermelho_acumulacao' | 'falta'

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
  pontos_disciplina?: number
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
  vermelho_direto: '🟥',
  vermelho_acumulacao: '🟨🟥',
  falta: '⚠️',
}

export const MAX_DESFAZER = 10
