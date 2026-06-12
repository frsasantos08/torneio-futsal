'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { TROFEU_LABELS, TROFEU_ORDEM, type TipoTrofeu, type Trofeu } from '@/lib/torneio'

type EquipaOpcao = { id: string; nome: string | null }

export default function TrofeusPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [trofeus, setTrofeus] = useState<Trofeu[]>([])
  const [equipas, setEquipas] = useState<EquipaOpcao[]>([])
  const [editando, setEditando] = useState<TipoTrofeu | null>(null)
  const [editForm, setEditForm] = useState({ equipa_id: '', equipa_nome: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s) { router.push('/admin'); return }
    const h = { 'X-Admin-Id': s.admin_id }
    Promise.all([
      fetch(`/api/torneio/${params.id}/trofeus`, { headers: h }).then(r => r.json()),
      fetch(`/api/torneio/${params.id}/equipas`, { headers: h }).then(r => r.json()),
    ]).then(([t, e]) => {
      setTrofeus(Array.isArray(t) ? t : [])
      setEquipas(Array.isArray(e) ? e.filter((eq: EquipaOpcao) => eq.nome) : [])
    })
  }, [params.id, router])

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000) }

  const getTrofeu = (tipo: TipoTrofeu) => trofeus.find(t => t.tipo === tipo)

  const handleEditar = (tipo: TipoTrofeu) => {
    const t = getTrofeu(tipo)
    setEditando(tipo)
    setEditForm({
      equipa_id: t?.equipa_id ?? '',
      equipa_nome: t?.equipa_nome ?? '',
      notas: t?.notas ?? '',
    })
  }

  const handleSave = async (tipo: TipoTrofeu) => {
    if (!session) return
    setSaving(true)
    const res = await fetch(`/api/torneio/${params.id}/trofeus`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session.admin_id },
      body: JSON.stringify({ tipo, ...editForm }),
    })
    const data = await res.json()
    if (res.ok) {
      setTrofeus(prev => {
        const existe = prev.find(t => t.tipo === tipo)
        if (existe) return prev.map(t => t.tipo === tipo ? data : t)
        return [...prev, data]
      })
      showMsg('✅ Guardado')
    } else {
      showMsg(`❌ ${data.error}`)
    }
    setSaving(false)
    setEditando(null)
  }

  const handleConfirmar = async (tipo: TipoTrofeu) => {
    if (!session) return
    const t = getTrofeu(tipo)
    if (!t) { showMsg('Define primeiro o troféu'); return }
    const res = await fetch(`/api/torneio/${params.id}/trofeus`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session.admin_id },
      body: JSON.stringify({ tipo, confirmado: true }),
    })
    const data = await res.json()
    if (res.ok) {
      setTrofeus(prev => prev.map(t => t.tipo === tipo ? data : t))
      showMsg('✅ Troféu confirmado e visível na TV')
    }
  }

  const handleToggleTV = async (tipo: TipoTrofeu, visivel: boolean) => {
    if (!session) return
    const res = await fetch(`/api/torneio/${params.id}/trofeus`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session.admin_id },
      body: JSON.stringify({ tipo, visivel_tv: visivel }),
    })
    const data = await res.json()
    if (res.ok) setTrofeus(prev => prev.map(t => t.tipo === tipo ? data : t))
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-10">
      {msg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-white shadow-xl"
             style={{ background: '#1a2332', border: '1px solid var(--accent)' }}>{msg}</div>
      )}

      <div className="flex items-center justify-between mb-6 pt-2">
        <button onClick={() => router.back()} className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>← Voltar</button>
        <h1 className="text-lg font-extrabold text-white">🏆 Troféus</h1>
        <div className="w-16" />
      </div>

      <div className="space-y-4">
        {TROFEU_ORDEM.map(tipo => {
          const info = TROFEU_LABELS[tipo]
          const t = getTrofeu(tipo)
          const isEditando = editando === tipo

          return (
            <div key={tipo} className="card p-4">
              {/* Header do troféu */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">{info.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-white">{info.label}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{info.desc}</div>
                </div>
                {t?.confirmado && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                    Confirmado
                  </span>
                )}
              </div>

              {isEditando ? (
                <div className="space-y-3">
                  {tipo === 'copofonia' ? (
                    // Copofonia: nome manual
                    <div>
                      <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>NOME / PRÉMIO</label>
                      <input value={editForm.equipa_nome}
                             onChange={e => setEditForm(v => ({ ...v, equipa_nome: e.target.value }))}
                             placeholder="ex: João Silva nº7 - ADCVNM"
                             className="w-full px-3 py-2 rounded-lg text-white font-semibold"
                             style={{ background: 'var(--border)' }} />
                    </div>
                  ) : (
                    // Outros: escolher de equipa
                    <div>
                      <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>EQUIPA</label>
                      <select value={editForm.equipa_id}
                              onChange={e => {
                                const eq = equipas.find(eq => eq.id === e.target.value)
                                setEditForm(v => ({ ...v, equipa_id: e.target.value, equipa_nome: eq?.nome ?? '' }))
                              }}
                              className="w-full px-3 py-2 rounded-lg text-white font-semibold"
                              style={{ background: 'var(--border)' }}>
                        <option value="">Selecionar equipa...</option>
                        {equipas.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>NOTAS (opcional)</label>
                    <input value={editForm.notas}
                           onChange={e => setEditForm(v => ({ ...v, notas: e.target.value }))}
                           placeholder="Observações..."
                           className="w-full px-3 py-2 rounded-lg text-white"
                           style={{ background: 'var(--border)' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(tipo)} disabled={saving}
                            className="flex-1 py-2 rounded-lg text-sm font-bold"
                            style={{ background: 'var(--accent)', color: '#000' }}>
                      {saving ? '...' : '✓ Guardar'}
                    </button>
                    <button onClick={() => setEditando(null)}
                            className="px-4 py-2 rounded-lg text-sm"
                            style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {t?.equipa_nome ? (
                    <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--border)' }}>
                      <span className="font-semibold text-white">{t.equipa_nome}</span>
                      {t.notas && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{t.notas}</div>}
                    </div>
                  ) : (
                    <div className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>Não definido</div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleEditar(tipo)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                      ✏️ Editar
                    </button>
                    {t?.equipa_nome && !t.confirmado && (
                      <button onClick={() => handleConfirmar(tipo)}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                              style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                        ✓ Confirmar
                      </button>
                    )}
                    {t?.confirmado && (
                      <button onClick={() => handleToggleTV(tipo, !t.visivel_tv)}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                              style={{
                                background: t.visivel_tv ? 'rgba(251,191,36,0.2)' : 'var(--border)',
                                color: t.visivel_tv ? '#fbbf24' : 'var(--muted)',
                              }}>
                        📺 {t.visivel_tv ? 'Visível na TV' : 'Oculto na TV'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
