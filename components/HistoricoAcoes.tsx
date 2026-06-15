'use client'

import { ACAO_ICONS, resolveNomeEquipa } from '@/lib/constants'
import type { HistoricoAcao } from '@/lib/constants'

interface Props {
  historico: HistoricoAcao[]
  equipaANome?: string
  equipaBNome?: string
}

function fmtTime(ts: string) {
  return ts ? new Date(ts).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--'
}

export default function HistoricoAcoes({ historico, equipaANome, equipaBNome }: Props) {
  if (historico.length === 0) {
    return <div className="text-center py-4 text-sm" style={{ color: 'var(--muted)' }}>Sem ações registadas</div>
  }

  return (
    <div className="space-y-1 max-h-52 overflow-y-auto">
      {historico.map((acao) => (
        <div key={acao.id}
             className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
             style={{ background: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">{ACAO_ICONS[acao.tipo]}</span>
            <span className="font-semibold text-white capitalize">{acao.tipo}</span>
            <span className="font-bold" style={{ color: 'var(--accent)' }}>
              {resolveNomeEquipa(acao.equipa === 'a' ? equipaANome : equipaBNome)}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{fmtTime(acao.timestamp)}</span>
        </div>
      ))}
    </div>
  )
}
