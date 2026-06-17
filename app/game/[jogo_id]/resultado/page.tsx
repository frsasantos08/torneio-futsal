'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isSuperAdmin } from '@/lib/auth'
import { resolveNomeEquipa } from '@/lib/constants'
import type { Jogo } from '@/lib/constants'

export default function ResultadoPage() {
  const params = useParams()
  const router = useRouter()
  const jogoId = params.jogo_id as string

  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmado, setConfirmado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  // Correção (superadmin)
  const [editMode, setEditMode] = useState(false)
  const [editVals, setEditVals] = useState<Record<string, number>>({})


  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // Tentar até 8x com 700ms de intervalo (máx ~5.6s de espera)
      for (let i = 0; i < 8; i++) {
        try {
          const data = await api.jogoEstado(jogoId)
          if (cancelled) return
          const status = data.jogo?.status
          const golos = `${data.jogo?.golos_a}-${data.jogo?.golos_b}`
          setDebugInfo(`Tentativa ${i+1}/8: status=${status} golos=${golos}`)
          if (status === 'finalizado') {
            setJogo(data.jogo)
            setConfirmado(data.jogo?.resultado_confirmado ?? false)
            setLoading(false)
            return
          }
        } catch (e) {
          if (cancelled) return
          setDebugInfo(`Tentativa ${i+1}/8: ERRO - ${e instanceof Error ? e.message : String(e)}`)
        }
        // Ainda não finalizado — aguardar antes de tentar de novo
        await new Promise(r => setTimeout(r, 700))
        if (cancelled) return
      }
      // Esgotaram as tentativas: carregar o que existir
      try {
        const data = await api.jogoEstado(jogoId)
        if (!cancelled) {
          setDebugInfo(`Final: status=${data.jogo?.status} golos=${data.jogo?.golos_a}-${data.jogo?.golos_b}`)
          setJogo(data.jogo)
          setConfirmado(data.jogo?.resultado_confirmado ?? false)
        }
      } catch { /* ignorar */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [jogoId])

  const handleConfirmar = async () => {
    setSaving(true)
    try {
      // Só finaliza se ainda estiver em decorrer; se já finalizado, apenas redireciona
      if (jogo?.status === 'decorrer') {
        await api.finalizar(jogoId)
      }
      setConfirmado(true)
      setTimeout(() => router.push('/'), 1500)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao confirmar')
    } finally {
      setSaving(false)
    }
  }

  const handleCorrigir = async () => {
    setSaving(true)
    try {
      await api.corrigirJogo(jogoId, editVals)
      const data = await api.jogoEstado(jogoId)
      setJogo(data.jogo)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ color: 'var(--muted)' }}>
      <div>A aguardar resultado...</div>
      {debugInfo && <div className="text-xs font-mono px-3 py-1 rounded" style={{ background: 'var(--card)', color: '#60a5fa' }}>{debugInfo}</div>}
    </div>
  )
  if (!jogo) return null

  const nomeA = resolveNomeEquipa(jogo.equipa_a_nome)
  const nomeB = resolveNomeEquipa(jogo.equipa_b_nome)
  const vencedor = jogo.golos_a > jogo.golos_b ? nomeA : jogo.golos_b > jogo.golos_a ? nomeB : 'Empate'

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/')} className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          ← Início
        </button>
        <span className="badge-finalizado">RESULTADO FINAL</span>
      </div>

      {/* Score */}
      <div className="card p-6 text-center mb-6">
        {/* Nomes */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="font-extrabold text-white text-lg flex-1 text-left">{nomeA}</div>
          <div className="text-xs font-semibold px-3" style={{ color: 'var(--muted)' }}>vs</div>
          <div className="font-extrabold text-white text-lg flex-1 text-right">{nomeB}</div>
        </div>
        {/* Score numa linha só */}
        <div className="text-7xl font-black mb-3" style={{ color: 'var(--accent)', lineHeight: 1 }}>
          {jogo.golos_a} – {jogo.golos_b}
        </div>
        {vencedor !== 'Empate' ? (
          <div className="text-base font-bold" style={{ color: 'var(--accent)' }}>🏆 {vencedor}</div>
        ) : (
          <div className="text-base font-bold" style={{ color: 'var(--muted)' }}>🤝 Empate</div>
        )}
      </div>

      {/* Cartões e Faltas */}
      <div className="card p-4 mb-4">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>Estatísticas</h3>
        <div className="grid grid-cols-3 text-center gap-2 text-sm">
          <div className="font-bold text-white">{nomeA}</div>
          <div style={{ color: 'var(--muted)' }} />
          <div className="font-bold text-white">{nomeB}</div>

          <div className="text-yellow-400 font-extrabold text-lg">{jogo.amarelos_a}</div>
          <div style={{ color: 'var(--muted)' }}>🟨 Amarelos</div>
          <div className="text-yellow-400 font-extrabold text-lg">{jogo.amarelos_b}</div>

          <div className="text-red-400 font-extrabold text-lg">{jogo.vermelhos_a}</div>
          <div style={{ color: 'var(--muted)' }}>🟥 Vermelhos</div>
          <div className="text-red-400 font-extrabold text-lg">{jogo.vermelhos_b}</div>

          <div className="text-orange-400 font-extrabold text-lg">{jogo.faltas_a}</div>
          <div style={{ color: 'var(--muted)' }}>⚠️ Faltas</div>
          <div className="text-orange-400 font-extrabold text-lg">{jogo.faltas_b}</div>
        </div>
      </div>

      {/* Correção Superadmin */}
      {isSuperAdmin() && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold" style={{ color: 'var(--muted)' }}>Correção (Superadmin)</h3>
            <button onClick={() => {
              setEditMode(!editMode)
              setEditVals({ golos_a: jogo.golos_a, golos_b: jogo.golos_b })
            }} className="text-xs px-3 py-1 rounded-lg" style={{ background: 'var(--border)', color: 'var(--accent)' }}>
              {editMode ? 'Cancelar' : '✏️ Editar'}
            </button>
          </div>
          {editMode && (
            <div className="space-y-2">
              {(['golos_a','golos_b','amarelos_a','amarelos_b','vermelhos_a','vermelhos_b','faltas_a','faltas_b'] as const).map(k => (
                <div key={k} className="flex items-center gap-3">
                  <label className="text-xs w-32" style={{ color: 'var(--muted)' }}>{k.replace('_', ' ')}</label>
                  <input
                    type="number" min={0}
                    value={editVals[k] ?? (jogo as unknown as Record<string, number>)[k] ?? 0}
                    onChange={e => setEditVals(v => ({ ...v, [k]: parseInt(e.target.value) || 0 }))}
                    className="w-16 px-2 py-1 rounded text-white text-center font-bold"
                    style={{ background: 'var(--border)' }}
                  />
                </div>
              ))}
              <button onClick={handleCorrigir} disabled={saving} className="btn-primary w-full mt-2">
                {saving ? 'A guardar...' : 'Guardar Correção'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmar */}
      {debugInfo && (
        <div className="text-xs font-mono px-3 py-1 rounded mb-2 text-center" style={{ background: 'var(--card)', color: '#60a5fa' }}>
          {debugInfo}
        </div>
      )}

      {confirmado ? (
        <div className="text-center py-4 font-bold text-green-400">
          ✅ Resultado Confirmado! A redirecionar...
        </div>
      ) : jogo.status === 'finalizado' ? (
        <button onClick={() => router.push('/')} className="btn-primary w-full text-lg py-4">
          ← Voltar ao Início
        </button>
      ) : (
        <button onClick={handleConfirmar} disabled={saving} className="btn-primary w-full text-lg py-4">
          {saving ? 'A confirmar...' : '✅ Confirmar Resultado'}
        </button>
      )}
    </div>
  )
}
