'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import type { Torneio } from '@/lib/torneio'
import LoginModal from '@/components/LoginModal'

export default function SuperadminPage() {
  const router = useRouter()
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [torneios, setTorneios] = useState<Torneio[]>([])
  const [admins, setAdmins] = useState<{ id: string; nome: string; role: string }[]>([])
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showNovoAdmin, setShowNovoAdmin] = useState(false)
  const [novoAdmin, setNovoAdmin] = useState({ nome: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [editTorneio, setEditTorneio] = useState<Torneio | null>(null)
  const [editAdmins, setEditAdmins] = useState<string[]>([])
  const [torneioNaTV, setTorneioNaTV] = useState<string | null>(null)

  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s) { setLoading(false); setShowLogin(true); return }
    if (s.role !== 'superadmin') { router.push('/'); return }
    loadData(s)
  }, [router])

  const loadData = async (s: NonNullable<ReturnType<typeof getSession>>) => {
    const headers = { 'X-Admin-Id': s.admin_id }
    const [t, a, cfg] = await Promise.all([
      fetch('/api/torneio', { cache: 'no-store', headers }).then(r => r.json()),
      fetch('/api/admin', { cache: 'no-store', headers }).then(r => r.json()),
      fetch('/api/config/torneio-ativo', { cache: 'no-store' }).then(r => r.json()),
    ])
    setTorneios(Array.isArray(t) ? t : [])
    setAdmins(Array.isArray(a) ? a : [])
    setTorneioNaTV(cfg?.torneio_id ?? null)
    setLoading(false)
  }

  const handleDeleteTorneio = async (id: string, nome: string) => {
    if (!confirm(`Eliminar torneio "${nome}"? Esta ação não pode ser revertida.`)) return
    await fetch(`/api/torneio/${id}`, { method: 'DELETE', headers: { 'X-Admin-Id': session!.admin_id } })
    setTorneios(prev => prev.filter(t => t.id !== id))
  }

  const handleCriarAdmin = async () => {
    if (!novoAdmin.nome || !novoAdmin.password) return
    setSaving(true)
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session!.admin_id },
      body: JSON.stringify(novoAdmin),
    })
    const data = await res.json()
    if (res.ok) {
      setAdmins(prev => [...prev, data])
      setNovoAdmin({ nome: '', password: '' })
      setShowNovoAdmin(false)
      showMsg('✅ Admin criado!')
    } else {
      showMsg(`❌ ${data.error}`)
    }
    setSaving(false)
  }

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000) }

  const handleAbrirEditAdmins = async (t: Torneio) => {
    setEditTorneio(t)
    const res = await fetch(`/api/torneio/${t.id}`, { headers: { 'X-Admin-Id': session!.admin_id } })
    const data = await res.json()
    setEditAdmins((data.admins ?? []).map((a: { id: string }) => a.id))
  }

  const handleSaveAdmins = async () => {
    if (!editTorneio) return
    setSaving(true)
    await fetch(`/api/torneio/${editTorneio.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session!.admin_id },
      body: JSON.stringify({ admins: editAdmins }),
    })
    setEditTorneio(null)
    showMsg('✅ Admins actualizados')
    setSaving(false)
  }

  const statusBadge = (s: string) => ({
    rascunho: { bg: 'rgba(100,100,100,0.2)', color: '#9ca3af', label: 'Rascunho' },
    ativo: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', label: 'Ativo' },
    finalizado: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: 'Finalizado' },
  }[s] ?? { bg: '', color: '', label: s })

  if (!session && !showLogin) return null
  if (showLogin) return <LoginModal onSuccess={() => { const s = getSession(); setSession(s); if (s?.role === 'superadmin') loadData(s); else router.push('/') }} onClose={() => router.push('/')} />

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {msg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-white shadow-xl"
             style={{ background: '#1a2332', border: '1px solid var(--accent)' }}>{msg}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-2">
        <div>
          <h1 className="text-2xl font-extrabold text-white">⚙️ Superadmin</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Gestão de torneios e utilizadores</p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="text-xs px-3 py-2 rounded-lg border font-semibold"
             style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>← App</a>
          <span className="text-xs px-3 py-2 rounded-lg font-semibold"
                style={{ background: 'var(--card)', color: 'var(--accent)' }}>
            {session?.nome} · SUPERADMIN
          </span>
        </div>
      </div>

      {loading ? <div className="text-center py-20" style={{ color: 'var(--muted)' }}>A carregar...</div> : (
        <div className="space-y-8">

          {/* TORNEIOS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">🏆 Torneios</h2>
              <button onClick={() => router.push('/superadmin/torneios/novo')} className="btn-primary text-sm py-2">
                + Novo Torneio
              </button>
            </div>

            {torneios.length === 0 ? (
              <div className="card p-8 text-center" style={{ color: 'var(--muted)' }}>
                Nenhum torneio criado.<br />
                <button onClick={() => router.push('/superadmin/torneios/novo')} className="mt-3 btn-primary text-sm">
                  Criar Primeiro Torneio
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {torneios.map(t => {
                  const badge = statusBadge(t.status)
                  return (
                    <div key={t.id} className="card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {t.logo_url && (
                            <img src={t.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">{t.nome}</div>
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              {t.organizador} · {new Date(t.data_inicio).toLocaleDateString('pt-PT')} – {new Date(t.data_fim).toLocaleDateString('pt-PT')}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                              {t.formato} equipas · {t.num_grupos} grupos de {t.equipas_por_grupo}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Badge clicável para ciclar status */}
                          <button
                            onClick={async () => {
                              const next = t.status === 'rascunho' ? 'ativo' : t.status === 'ativo' ? 'finalizado' : 'rascunho'
                              await fetch(`/api/torneio/${t.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session!.admin_id },
                                body: JSON.stringify({ status: next }),
                              })
                              setTorneios(prev => prev.map(x => x.id === t.id ? { ...x, status: next } : x))
                              showMsg(`✅ Status: ${next}`)
                            }}
                            className="text-xs font-bold px-2 py-1 rounded-full transition-opacity hover:opacity-70"
                            style={{ background: badge.bg, color: badge.color }}
                            title="Clica para mudar status">
                            {badge.label} ↻
                          </button>
                          <button onClick={() => router.push(`/admin/torneio/${t.id}`)}
                                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                                  style={{ background: 'var(--accent)', color: '#000' }}>
                            Gerir
                          </button>
                          <button
                            onClick={async () => {
                              await fetch('/api/config/torneio-ativo', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ torneio_id: t.id }),
                              })
                              setTorneioNaTV(t.id)
                              showMsg('📺 Torneio ativo na TV!')
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{
                              background: torneioNaTV === t.id ? 'rgba(34,197,94,0.2)' : 'var(--border)',
                              color: torneioNaTV === t.id ? '#4ade80' : 'var(--muted)',
                              border: torneioNaTV === t.id ? '1px solid #4ade80' : 'none',
                            }}>
                            {torneioNaTV === t.id ? '📺 Na TV' : '📺'}
                          </button>
                          <button onClick={() => handleAbrirEditAdmins(t)}
                                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                                  style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                            👤
                          </button>
                          <button onClick={() => handleDeleteTorneio(t.id, t.nome)}
                                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ADMINS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">👤 Utilizadores</h2>
              <button onClick={() => setShowNovoAdmin(!showNovoAdmin)} className="btn-primary text-sm py-2">
                + Novo Admin
              </button>
            </div>

            {showNovoAdmin && (
              <div className="card p-4 mb-3">
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>Criar Admin</h3>
                <div className="space-y-3">
                  <input value={novoAdmin.nome} onChange={e => setNovoAdmin(v => ({ ...v, nome: e.target.value }))}
                         placeholder="Nome" className="w-full px-3 py-2 rounded-lg text-white font-semibold"
                         style={{ background: 'var(--border)' }} />
                  <input value={novoAdmin.password} onChange={e => setNovoAdmin(v => ({ ...v, password: e.target.value }))}
                         placeholder="Password" type="password" className="w-full px-3 py-2 rounded-lg text-white font-semibold"
                         style={{ background: 'var(--border)' }} />
                  <button onClick={handleCriarAdmin} disabled={saving} className="btn-primary w-full">
                    {saving ? 'A criar...' : 'Criar Admin'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {admins.map(a => (
                <div key={a.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">{a.nome}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{
                            background: a.role === 'superadmin' ? 'rgba(139,92,246,0.2)' : 'rgba(30,144,255,0.15)',
                            color: a.role === 'superadmin' ? '#a78bfa' : '#60a5fa',
                          }}>{a.role}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{a.id}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Modal editar admins do torneio */}
      {editTorneio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.75)' }}
             onClick={() => setEditTorneio(null)}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
               style={{ background: '#0f1c2e', border: '1px solid var(--border)' }}
               onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-white mb-1">👤 Admins do Torneio</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>{editTorneio.nome}</p>
            <div className="space-y-2 mb-4">
              {admins.filter(a => a.role !== 'superadmin').map(a => {
                const sel = editAdmins.includes(a.id)
                return (
                  <button key={a.id}
                          onClick={() => setEditAdmins(prev => sel ? prev.filter(id => id !== a.id) : [...prev, a.id])}
                          className="w-full p-3 rounded-xl text-left flex items-center justify-between"
                          style={{
                            background: sel ? 'rgba(30,144,255,0.12)' : 'var(--card)',
                            border: `2px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                          }}>
                    <span className="font-semibold text-white">{a.nome}</span>
                    {sel && <span style={{ color: 'var(--accent)' }}>✓</span>}
                  </button>
                )
              })}
              {admins.filter(a => a.role !== 'superadmin').length === 0 && (
                <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>Sem admins criados</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveAdmins} disabled={saving}
                      className="flex-1 py-3 rounded-xl font-bold text-sm"
                      style={{ background: 'var(--accent)', color: '#000' }}>
                {saving ? '...' : '✓ Guardar'}
              </button>
              <button onClick={() => setEditTorneio(null)}
                      className="px-4 py-3 rounded-xl text-sm font-semibold"
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
