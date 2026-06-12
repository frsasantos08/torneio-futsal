'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import type { Torneio } from '@/lib/torneio'
import LoginModal from '@/components/LoginModal'

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [torneios, setTorneios] = useState<Torneio[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s) { setLoading(false); setShowLogin(true); return }
    loadData(s)
  }, [])

  const loadData = async (s: NonNullable<ReturnType<typeof getSession>>) => {
    const res = await fetch('/api/torneio', { cache: 'no-store', headers: { 'X-Admin-Id': s.admin_id } })
    const data = await res.json()
    setTorneios(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const statusBadge = (s: string) => ({
    rascunho: { bg: 'rgba(100,100,100,0.2)', color: '#9ca3af', label: 'Rascunho' },
    ativo: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', label: 'Ativo' },
    finalizado: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: 'Finalizado' },
  }[s] ?? { bg: '', color: '#9ca3af', label: s })

  const onLogin = () => {
    const s = getSession()
    setSession(s)
    if (s) loadData(s)
  }

  if (showLogin && !session) return <LoginModal onSuccess={onLogin} onClose={() => router.push('/')} />

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8 pt-2">
        <div>
          <h1 className="text-2xl font-extrabold text-white">🏅 Painel Admin</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Gestão de torneios</p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="text-xs px-3 py-2 rounded-lg border font-semibold"
             style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>← App</a>
          {session && (
            <span className="text-xs px-3 py-2 rounded-lg font-semibold"
                  style={{ background: 'var(--card)', color: 'var(--accent)' }}>
              {session.nome}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>A carregar...</div>
      ) : torneios.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'var(--muted)' }}>
          <div className="text-4xl mb-3">🏆</div>
          <div className="font-semibold text-white mb-1">Sem torneios atribuídos</div>
          <div className="text-sm">Contacta o superadmin para seres atribuído a um torneio.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {torneios.map(t => {
            const badge = statusBadge(t.status)
            return (
              <div key={t.id} className="card p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                   onClick={() => router.push(`/admin/torneio/${t.id}`)}>
                <div className="flex items-start gap-3">
                  {t.logo_url && (
                    <img src={t.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-white truncate">{t.nome}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      {t.organizador}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      📅 {new Date(t.data_inicio).toLocaleDateString('pt-PT')} – {new Date(t.data_fim).toLocaleDateString('pt-PT')}
                      &nbsp;·&nbsp; ⚽ {t.formato} equipas
                    </div>
                  </div>
                  <span style={{ color: 'var(--muted)' }}>›</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
