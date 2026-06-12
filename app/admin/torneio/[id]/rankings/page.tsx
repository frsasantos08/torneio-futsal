'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'

type EquipaRanking = { posicao: number; equipa_nome: string; valor: number; extra?: string }

type Rankings = {
  melhorAtaque: EquipaRanking[]
  melhorDefesa: EquipaRanking[]
  disciplina: EquipaRanking[]
  classificacaoGeral: EquipaRanking[]
}

type Tab = 'ataque' | 'defesa' | 'disciplina' | 'geral'

export default function RankingsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [rankings, setRankings] = useState<Rankings | null>(null)
  const [tab, setTab] = useState<Tab>('geral')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s) { router.push('/admin'); return }
    loadRankings(s.admin_id)
  }, [params.id, router])

  const loadRankings = useCallback(async (adminId: string) => {
    const res = await fetch(`/api/torneio/${params.id}/rankings`, {
      headers: { 'X-Admin-Id': adminId }, cache: 'no-store',
    })
    const data = await res.json()
    setRankings(data)
    setLoading(false)
  }, [params.id])

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'geral', label: 'Geral', icon: '🏆' },
    { key: 'ataque', label: 'Ataque', icon: '⚽' },
    { key: 'defesa', label: 'Defesa', icon: '🛡️' },
    { key: 'disciplina', label: 'Disciplina', icon: '📋' },
  ]

  const getData = (): EquipaRanking[] => {
    if (!rankings) return []
    return {
      ataque: rankings.melhorAtaque,
      defesa: rankings.melhorDefesa,
      disciplina: rankings.disciplina,
      geral: rankings.classificacaoGeral,
    }[tab] ?? []
  }

  const getLabel = () => ({
    ataque: 'Golos Marcados',
    defesa: 'Golos Sofridos',
    disciplina: 'Pts Disciplina',
    geral: 'Pontos',
  }[tab])

  const medalha = (pos: number) => ({ 1: '🥇', 2: '🥈', 3: '🥉' }[pos] ?? `${pos}º`)

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6 pt-2">
        <button onClick={() => router.back()} className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>← Voltar</button>
        <h1 className="text-lg font-extrabold text-white">📊 Rankings</h1>
        <button onClick={() => session && loadRankings(session.admin_id)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: 'var(--border)', color: 'var(--muted)' }}>
          🔄
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold"
                  style={{
                    background: tab === t.key ? 'var(--accent)' : 'var(--border)',
                    color: tab === t.key ? '#000' : 'var(--muted)',
                  }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>A carregar...</div>
      ) : (
        <div className="space-y-2">
          {getData().map((eq, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="text-2xl w-10 text-center flex-shrink-0">{medalha(eq.posicao)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{eq.equipa_nome}</div>
                {eq.extra && <div className="text-xs" style={{ color: 'var(--muted)' }}>{eq.extra}</div>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-extrabold" style={{ color: 'var(--accent)' }}>{eq.valor}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{getLabel()}</div>
              </div>
            </div>
          ))}
          {getData().length === 0 && (
            <div className="card p-8 text-center" style={{ color: 'var(--muted)' }}>
              Sem dados disponíveis ainda.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
