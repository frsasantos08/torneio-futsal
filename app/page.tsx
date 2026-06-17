'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getSession } from '@/lib/auth'
import type { Jogo } from '@/lib/constants'
import { resolveNomeEquipa, STATUS_LABELS } from '@/lib/constants'
import { subscribeAllJogos } from '@/lib/realtime'
import LoginModal from '@/components/LoginModal'

function fmtHora(dt: string) {
  return new Date(dt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

function fmtDia(dt: string) {
  return new Date(dt).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

type Tab = 'proximos' | 'concluidos'

export default function HomePage() {
  const router = useRouter()
  const [proximos, setProximos] = useState<Jogo[]>([])
  const [concluidos, setConcluidos] = useState<Jogo[]>([])
  const [jogoAtual, setJogoAtual] = useState<Jogo | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('proximos')
  const [showLogin, setShowLogin] = useState(false)
  const [pendingJogoId, setPendingJogoId] = useState<string | null>(null)
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)

  const [torneioId, setTorneioId] = useState<string | null>(null)
  const [torneioInfo, setTorneioInfo] = useState<{ nome: string; data_inicio: string; data_fim: string } | null>(null)

  const load = async () => {
    try {
      // Buscar torneio ativo primeiro
      const cfg = await fetch('/api/config/torneio-ativo').then(r => r.json()).catch(() => null)
      const tid = cfg?.torneio_id ?? null
      setTorneioId(tid)

      if (tid) {
        fetch(`/api/torneio/${tid}`).then(r => r.json()).then(t => {
          if (t?.nome) setTorneioInfo({ nome: t.nome, data_inicio: t.data_inicio, data_fim: t.data_fim })
        })
      }

      const param = tid ? `?torneio_id=${tid}` : ''
      const [prox, atual, todos] = await Promise.all([
        fetch(`/api/jogo/proximos${param}`).then(r => r.json()).catch(() => []),
        fetch(`/api/jogo/atual${param}`).then(r => r.json()).catch(() => null),
        fetch(`/api/jogo/todos${param}`).then(r => r.json()).catch(() => []),
      ])
      setProximos(Array.isArray(prox) ? prox : [])
      setJogoAtual(atual?.id ? atual : null)
      const finalizados = (Array.isArray(todos) ? todos as Jogo[] : []).filter(j => j.status === 'finalizado')
        .sort((a, b) => (b.numero_jogo ?? 0) - (a.numero_jogo ?? 0))
      setConcluidos(finalizados)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSession(getSession())
  }, [])

  useEffect(() => {
    load()
    const unsub = subscribeAllJogos((updated) => {
      if (updated.status === 'finalizado') {
        setProximos(prev => prev.filter(j => j.id !== updated.id))
        setConcluidos(prev => {
          const sem = prev.filter(j => j.id !== updated.id)
          return [updated, ...sem].sort((a, b) => (b.numero_jogo ?? 0) - (a.numero_jogo ?? 0))
        })
        setJogoAtual(prev => prev?.id === updated.id ? null : prev)
      } else {
        setProximos(prev => {
          const existe = prev.find(j => j.id === updated.id)
          return existe ? prev.map(j => j.id === updated.id ? updated : j) : [...prev, updated]
        })
        setConcluidos(prev => prev.filter(j => j.id !== updated.id))
        if (updated.status === 'decorrer') setJogoAtual(updated)
      }
    })

    // Re-carregar dados quando o utilizador volta à página (tab ou janela)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Poll a cada 30s como fallback caso o realtime falhe
    const poll = setInterval(load, 30000)

    return () => {
      unsub()
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(poll)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [recalcMsg, setRecalcMsg] = useState<string | null>(null)

  const handleRecalcular = async () => {
    if (!confirm('Recalcular classificação do zero com base em todos os jogos finalizados?')) return
    try {
      const res = await fetch('/api/classificacao/recalcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session?.admin_id ?? '' },
        body: JSON.stringify({ torneio_id: torneioId }),
      })
      const data = await res.json()
      setRecalcMsg(data.ok
        ? `✅ Classificação recalculada! ${data.jogos_processados} jogos, ${data.equipas_atualizadas} equipas`
        : `❌ Erros: ${data.erros?.join(', ')}`)
      setTimeout(() => setRecalcMsg(null), 5000)
    } catch {
      setRecalcMsg('❌ Erro ao recalcular')
      setTimeout(() => setRecalcMsg(null), 4000)
    }
  }

  const handleAbrirJogo = (jogoId: string) => {
    if (!session) {
      setPendingJogoId(jogoId)
      setShowLogin(true)
      return
    }
    router.push(`/game/${jogoId}`)
  }

  const onLoginSuccess = () => {
    setSession(getSession())
    setShowLogin(false)
    if (pendingJogoId) {
      router.push(`/game/${pendingJogoId}`)
      setPendingJogoId(null)
    }
  }

  const badgeClass = (status: string) =>
    status === 'decorrer' ? 'badge-decorrer' : status === 'finalizado' ? 'badge-finalizado' : 'badge-pendente'

  const JogoCard = ({ jogo, concluido = false }: { jogo: Jogo; concluido?: boolean }) => (
    <div key={jogo.id} className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
            Jogo {jogo.numero_jogo ?? jogo.id.slice(0, 4)}
          </span>
          {jogo.grupo && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--border)', color: 'var(--muted)' }}>
              Grupo {jogo.grupo}
            </span>
          )}
          <span className={badgeClass(jogo.status)}>
            {STATUS_LABELS[jogo.status as keyof typeof STATUS_LABELS]}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {fmtDia(jogo.data_hora)} {fmtHora(jogo.data_hora)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-bold text-white">{resolveNomeEquipa(jogo.equipa_a_nome)}</div>
        </div>
        <div className="text-center px-3">
          {jogo.status !== 'pendente' ? (
            <span className="text-2xl font-extrabold" style={{ color: 'var(--accent)' }}>
              {jogo.golos_a} – {jogo.golos_b}
            </span>
          ) : (
            <span className="text-xl font-bold" style={{ color: 'var(--muted)' }}>vs</span>
          )}
        </div>
        <div className="flex-1 text-right">
          <div className="font-bold text-white">{resolveNomeEquipa(jogo.equipa_b_nome)}</div>
        </div>
      </div>

      {/* Cartões / Faltas (só concluídos) */}
      {concluido && (
        <div className="flex justify-between mt-1 px-1">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            🟨{jogo.amarelos_a ?? 0} 🟥{jogo.vermelhos_a ?? 0} ⚠️{jogo.faltas_a ?? 0}
          </span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            🟨{jogo.amarelos_b ?? 0} 🟥{jogo.vermelhos_b ?? 0} ⚠️{jogo.faltas_b ?? 0}
          </span>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {!concluido && jogo.status !== 'finalizado' && (
          <button
            onClick={() => handleAbrirJogo(jogo.id)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--border)', color: 'var(--text)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#000' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
          >
            {jogo.status === 'decorrer' ? 'Continuar Jogo' : 'Iniciar Jogo'}
          </button>
        )}
        {concluido && (
          <>
            <button
              onClick={() => router.push(`/game/${jogo.id}/resultado`)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--border)', color: 'var(--muted)' }}
            >
              Ver Resultado
            </button>
            <button
              onClick={() => handleAbrirJogo(jogo.id)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)' }}
            >
              ✏️ Editar
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-extrabold text-white">⚽ {torneioInfo?.nome ?? 'Torneio Futsal'}</h1>
          {torneioInfo && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {new Date(torneioInfo.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}
              {' – '}
              {new Date(torneioInfo.data_fim).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <a href="/tv" className="text-xs px-3 py-2 rounded-lg border font-semibold"
             style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            📺 TV
          </a>
          {session && (
            <>
              <button onClick={handleRecalcular}
                      className="text-xs px-3 py-2 rounded-lg border font-semibold"
                      style={{ borderColor: 'rgba(234,179,8,0.4)', color: '#eab308' }}
                      title="Recalcular classificação do zero">
                🔄
              </button>
              <a href="/admin" className="text-xs px-3 py-2 rounded-lg border font-semibold"
                 style={{ borderColor: 'rgba(59,130,246,0.4)', color: '#60a5fa' }}>
                ⚙️ Admin
              </a>
            </>
          )}
          {!session ? (
            <button onClick={() => setShowLogin(true)} className="btn-primary text-sm py-2">
              Login
            </button>
          ) : (
            <span className="text-xs px-3 py-2 rounded-lg font-semibold"
                  style={{ background: 'var(--card)', color: 'var(--accent)' }}>
              {session.nome}
            </span>
          )}
        </div>
      </div>

      {/* Mensagem recalcular */}
      {recalcMsg && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm font-semibold"
             style={{ background: recalcMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${recalcMsg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: recalcMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>
          {recalcMsg}
        </div>
      )}

      {/* Jogo A Decorrer */}
      {jogoAtual && (
        <div className="card p-4 mb-6" style={{ borderColor: '#dc2626' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-decorrer">🔴 A DECORRER</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="font-extrabold text-lg text-white">{resolveNomeEquipa(jogoAtual.equipa_a_nome)}</div>
            </div>
            <div className="text-center px-4">
              <div className="score-display">{jogoAtual.golos_a} – {jogoAtual.golos_b}</div>
            </div>
            <div className="text-center flex-1">
              <div className="font-extrabold text-lg text-white">{resolveNomeEquipa(jogoAtual.equipa_b_nome)}</div>
            </div>
          </div>
          <button onClick={() => handleAbrirJogo(jogoAtual.id)} className="btn-primary w-full mt-3 text-sm">
            Gerir Jogo
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 rounded-xl p-1" style={{ background: 'var(--card)' }}>
        <button
          onClick={() => setTab('proximos')}
          className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
          style={{
            background: tab === 'proximos' ? 'var(--accent)' : 'transparent',
            color: tab === 'proximos' ? '#000' : 'var(--muted)',
          }}
        >
          Próximos{proximos.length > 0 ? ` (${proximos.length})` : ''}
        </button>
        <button
          onClick={() => setTab('concluidos')}
          className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
          style={{
            background: tab === 'concluidos' ? 'var(--accent)' : 'transparent',
            color: tab === 'concluidos' ? '#000' : 'var(--muted)',
          }}
        >
          Concluídos{concluidos.length > 0 ? ` (${concluidos.length})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: 'var(--muted)' }}>A carregar...</div>
      ) : tab === 'proximos' ? (
        <div className="space-y-3">
          {proximos.map(jogo => <JogoCard key={jogo.id} jogo={jogo} />)}
          {proximos.length === 0 && (
            <div className="text-center py-10" style={{ color: 'var(--muted)' }}>
              Todos os jogos terminados! 🏆
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {concluidos.map(jogo => <JogoCard key={jogo.id} jogo={jogo} concluido />)}
          {concluidos.length === 0 && (
            <div className="text-center py-10" style={{ color: 'var(--muted)' }}>
              Ainda não há jogos concluídos.
            </div>
          )}
        </div>
      )}

      {showLogin && <LoginModal onSuccess={onLoginSuccess} onClose={() => setShowLogin(false)} />}
    </div>
  )
}
