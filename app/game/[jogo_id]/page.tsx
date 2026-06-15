'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { resolveNomeEquipa } from '@/lib/constants'
import type { Jogo, HistoricoAcao } from '@/lib/constants'
import { subscribeJogo } from '@/lib/realtime'
import HistoricoAcoes from '@/components/HistoricoAcoes'

function saveLocal(jogoId: string, data: object) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`jogo_local_${jogoId}`, JSON.stringify(data))
  }
}

export default function LiveGamePage() {
  const params = useParams()
  const router = useRouter()
  const jogoId = params.jogo_id as string

  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [historico, setHistorico] = useState<HistoricoAcao[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [lockWarning, setLockWarning] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [vermelhoPopup, setVermelhoPopup] = useState<'a' | 'b' | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)  // 5s para conseguir ler
  }

  const loadEstado = useCallback(async () => {
    try {
      const data = await api.jogoEstado(jogoId)
      setJogo(data.jogo)
      setHistorico(data.historico ?? [])
      saveLocal(jogoId, data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [jogoId])

  // Carregar sessão após hidratação (evita hydration mismatch server/client)
  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s) router.push('/')
  }, [router])

  // Carregar jogo e subscrições (independente da sessão)
  useEffect(() => {
    loadEstado()
    api.lockJogo(jogoId).then((res) => {
      if (res.locked) setLockWarning(`Jogo aberto por ${res.by}`)
    }).catch(() => {})

    const unsub = subscribeJogo(jogoId, () => { loadEstado() })

    const handleUnload = () => api.unlockJogo(jogoId)
    window.addEventListener('beforeunload', handleUnload)

    const handleOnline = async () => {
      const raw = localStorage.getItem(`jogo_local_${jogoId}`)
      if (raw) { await loadEstado(); localStorage.removeItem(`jogo_local_${jogoId}`) }
    }
    window.addEventListener('online', handleOnline)

    return () => {
      unsub()
      api.unlockJogo(jogoId).catch(() => {})
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('online', handleOnline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogoId])

  const doAction = async (fn: () => Promise<unknown>, label: string) => {
    console.log('[doAction] START', label, 'actionLoading:', actionLoading, 'isDecoller:', jogo?.status)
    if (actionLoading) { console.log('[doAction] BLOCKED by actionLoading'); return }
    setActionLoading(true)
    try {
      console.log('[doAction] calling fn...')
      const result = await fn()
      console.log('[doAction] fn result:', result)
      await new Promise(r => setTimeout(r, 300))
      await loadEstado()
      showToast(`✅ ${label}`)
    } catch (e: unknown) {
      console.error('[doAction] ERROR:', e)
      showToast(`❌ ${e instanceof Error ? e.message : 'Erro'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleIniciar = async () => {
    if (actionLoading) return
    setActionLoading(true)
    try {
      await api.iniciarJogo(jogoId)
      // Forçar estado local imediatamente
      setJogo(prev => prev ? { ...prev, status: 'decorrer' as const } : prev)
      // Confirmar com DB (retry até 2s)
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 250))
        const data = await api.jogoEstado(jogoId).catch(() => null)
        if (data?.jogo?.status === 'decorrer') {
          setJogo(data.jogo)
          setHistorico(data.historico ?? [])
          break
        }
      }
      showToast('✅ Jogo iniciado!')
    } catch (e: unknown) {
      showToast(`❌ ${e instanceof Error ? e.message : 'Erro ao iniciar'}`)
    } finally {
      setActionLoading(false)
    }
  }
  const handleFinalizar = () => {
    if (!confirm('Finalizar o jogo?')) return
    doAction(async () => {
      await api.finalizar(jogoId)
      router.push(`/game/${jogoId}/resultado`)
    }, 'Jogo finalizado!')
  }

  const handleReabrir = () => {
    if (!confirm('Reabrir jogo para edição?\n\nA classificação deste jogo será revertida e recalculada ao finalizar novamente.')) return
    doAction(() => api.reabrirJogo(jogoId), 'Jogo reaberto!')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>A carregar...</div>
  }

  if (!jogo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        Jogo não encontrado.{' '}
        <button onClick={() => router.push('/')} className="ml-2 underline" style={{ color: 'var(--accent)' }}>Voltar</button>
      </div>
    )
  }

  const isDecoller = jogo.status === 'decorrer'
  const isFinalizado = jogo.status === 'finalizado'
  const nomeA = resolveNomeEquipa(jogo.equipa_a_nome)
  const nomeB = resolveNomeEquipa(jogo.equipa_b_nome)
  const numJogo = jogo.numero_jogo ?? ''

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto pb-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-white shadow-xl"
             style={{ background: '#1a2332', border: '1px solid var(--accent)' }}>
          {toast}
        </div>
      )}

      {/* Lock Warning */}
      {lockWarning && (
        <div className="mb-3 px-4 py-2 rounded-lg text-sm font-semibold text-yellow-300"
             style={{ background: '#2a1a00', border: '1px solid #ca8a04' }}>
          ⚠️ {lockWarning}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { api.unlockJogo(jogoId).catch(() => {}); router.push('/') }}
                className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          ← Voltar
        </button>
        <div className="flex items-center gap-2">
          {numJogo && <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>Jogo {numJogo}</span>}
          {jogo.grupo && <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                               style={{ background: 'var(--border)', color: 'var(--muted)' }}>
            Grupo {jogo.grupo}
          </span>}
          {isDecoller && <span className="badge-decorrer">🔴 DECORRER</span>}
          {isFinalizado && <span className="badge-finalizado">FINALIZADO</span>}
          {jogo.status === 'pendente' && <span className="badge-pendente">PENDENTE</span>}
        </div>
      </div>

      {/* Score */}
      <div className="card p-4 mb-4 text-center">
        {/* Nomes */}
        <div className="grid grid-cols-3 items-center gap-2 mb-1">
          <div className="font-extrabold text-white text-base leading-tight">{nomeA}</div>
          <div />
          <div className="font-extrabold text-white text-base leading-tight">{nomeB}</div>
        </div>
        {/* Score */}
        <div className="score-display mb-1">{jogo.golos_a} – {jogo.golos_b}</div>
        {/* Cartões e Faltas */}
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            🟨{jogo.amarelos_a} 🟥{jogo.vermelhos_a} ⚠️{jogo.faltas_a}
          </div>
          <div />
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            🟨{jogo.amarelos_b} 🟥{jogo.vermelhos_b} ⚠️{jogo.faltas_b}
          </div>
        </div>
      </div>

      {/* Iniciar */}
      {jogo.status === 'pendente' && (
        <button onClick={handleIniciar} disabled={actionLoading} className="btn-primary w-full mb-4 text-lg">
          ▶ Iniciar Jogo
        </button>
      )}

      {/* Botões de Ação */}
      {!isFinalizado && (
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            {(['a', 'b'] as const).map((eq) => {
              const nome = eq === 'a' ? nomeA : nomeB
              return (
                <div key={eq} className="space-y-2">
                  <div className="text-xs font-bold text-center mb-2 truncate" style={{ color: 'var(--accent)' }}>
                    {nome}
                  </div>
                  <button onClick={() => doAction(() => api.golo(jogoId, eq), `⚽ Golo ${nome}`)}
                          disabled={actionLoading || !isDecoller} className="btn-golo">
                    ⚽ GOLO
                  </button>
                  <button onClick={() => doAction(() => api.cartao(jogoId, eq, 'amarelo'), `🟨 Amarelo ${nome}`)}
                          disabled={actionLoading || !isDecoller} className="btn-amarelo">
                    🟨 AMARELO
                  </button>
                  <button onClick={() => setVermelhoPopup(eq)}
                          disabled={actionLoading || !isDecoller} className="btn-vermelho">
                    🟥 VERMELHO
                  </button>
                  <button onClick={() => doAction(() => api.falta(jogoId, eq), `⚠️ Falta ${nome}`)}
                          disabled={actionLoading || !isDecoller} className="btn-falta">
                    ⚠️ FALTA
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex justify-center">
            <button onClick={() => doAction(() => api.desfazer(jogoId), 'Ação desfeita')}
                    disabled={actionLoading || !isDecoller || historico.length === 0}
                    className="btn-desfazer">
              ↶ Desfazer Última Ação
            </button>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="card p-4 mb-4">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>
          Últimas Ações ({historico.length})
        </h3>
        <HistoricoAcoes historico={historico} equipaANome={jogo.equipa_a_nome} equipaBNome={jogo.equipa_b_nome} />
      </div>

      {/* Finalizar */}
      {isDecoller && (
        <button onClick={handleFinalizar} disabled={actionLoading}
                className="w-full py-4 rounded-xl font-extrabold text-lg transition-colors"
                style={{ background: '#7c3aed', color: 'white' }}>
          🏁 Finalizar Jogo
        </button>
      )}

      {isFinalizado && (
        <div className="flex flex-col gap-3">
          <button onClick={() => router.push(`/game/${jogoId}/resultado`)} className="btn-primary w-full text-lg">
            Ver Resultado Final →
          </button>
          <button onClick={handleReabrir} disabled={actionLoading}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-colors"
                  style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308', border: '1px solid rgba(234,179,8,0.35)' }}>
            ✏️ Reabrir para Edição
          </button>
        </div>
      )}

      {/* Popup Vermelho */}
      {vermelhoPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.75)' }}
             onClick={() => setVermelhoPopup(null)}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
               style={{ background: '#0f1c2e', border: '2px solid rgba(239,68,68,0.4)' }}
               onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🟥</div>
              <h3 className="text-lg font-extrabold text-white">Vermelho</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {vermelhoPopup === 'a' ? (jogo?.equipa_a ?? 'Equipa A') : (jogo?.equipa_b ?? 'Equipa B')}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  doAction(() => api.cartao(jogoId, vermelhoPopup, 'vermelho_direto'), `🟥 Vermelho Direto`)
                  setVermelhoPopup(null)
                }}
                className="w-full py-4 rounded-xl font-extrabold text-white text-base transition-all"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1.5px solid rgba(239,68,68,0.5)' }}>
                🟥 Direto
                <div className="text-xs font-normal mt-0.5" style={{ color: '#fca5a5' }}>100 pontos de disciplina</div>
              </button>
              <button
                onClick={() => {
                  doAction(() => api.cartao(jogoId, vermelhoPopup, 'vermelho_acumulacao'), `🟨🟥 2ª Advertência`)
                  setVermelhoPopup(null)
                }}
                className="w-full py-4 rounded-xl font-extrabold text-white text-base transition-all"
                style={{ background: 'rgba(234,179,8,0.15)', border: '1.5px solid rgba(234,179,8,0.4)' }}>
                🟨🟥 2ª Advertência
                <div className="text-xs font-normal mt-0.5" style={{ color: '#fde68a' }}>50 pontos de disciplina</div>
              </button>
              <button onClick={() => setVermelhoPopup(null)}
                      className="w-full py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
