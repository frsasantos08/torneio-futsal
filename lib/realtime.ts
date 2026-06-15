import { supabase } from './supabase'
import type { Jogo, ClassificacaoEquipa } from './constants'

type JogoCallback = (jogo: Jogo) => void
type ClassificacaoCallback = (rows: ClassificacaoEquipa[]) => void

export function subscribeJogo(jogoId: string, onUpdate: (jogo: Jogo) => void) {
  const channel = supabase
    .channel(`jogo_${jogoId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'jogos', filter: `id=eq.${jogoId}` },
      (payload) => onUpdate(payload.new as Jogo)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function subscribeAllJogos(onUpdate: JogoCallback) {
  const channel = supabase
    .channel('all_jogos')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jogos' },
      (payload) => onUpdate(payload.new as Jogo)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function subscribeClassificacao(onUpdate: ClassificacaoCallback) {
  const channel = supabase
    .channel('classificacao')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'classificacao_grupos' },
      async () => {
        const { data } = await supabase
          .from('classificacao_grupos')
          .select('*')
          .order('grupo')
          .order('pontos', { ascending: false })
        if (data) onUpdate(data as ClassificacaoEquipa[])
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
