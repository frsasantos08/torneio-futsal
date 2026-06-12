'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getFormatoConfig, getGruposLetras, type FormatoTorneio } from '@/lib/torneio'

type EquipaSlot = {
  id: string
  slot: string
  grupo: string
  nome: string | null
  confirmada: boolean
}

type Torneio = { formato: FormatoTorneio; nome: string }

export default function EquipasPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [torneio, setTorneio] = useState<Torneio | null>(null)
  const [equipas, setEquipas] = useState<EquipaSlot[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s) { router.push('/admin'); return }
    const h = { 'X-Admin-Id': s.admin_id }
    Promise.all([
      fetch(`/api/torneio/${params.id}`, { headers: h }).then(r => r.json()),
      fetch(`/api/torneio/${params.id}/equipas`, { headers: h }).then(r => r.json()),
    ]).then(([t, e]) => {
      setTorneio(t)
      const lista: EquipaSlot[] = Array.isArray(e) ? e : []
      setEquipas(lista)
      const ns: Record<string, string> = {}
      // Se nome = slot (ex: "A1"), trata como vazio para o input
      lista.forEach((eq: EquipaSlot) => { ns[eq.id] = (eq.nome && eq.nome !== eq.slot) ? eq.nome : '' })
      setNomes(ns)
    })
  }, [params.id, router])

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000) }

  const handleSave = async (equipaId: string) => {
    if (!session) return
    setSaving(true)
    const res = await fetch(`/api/torneio/${params.id}/equipas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session.admin_id },
      body: JSON.stringify({ equipa_id: equipaId, nome: nomes[equipaId] }),
    })
    if (res.ok) {
      setEquipas(prev => prev.map(e => e.id === equipaId ? { ...e, nome: nomes[equipaId] } : e))
      showMsg('✅ Guardado')
    } else {
      showMsg('❌ Erro ao guardar')
    }
    setSaving(false)
    setEditando(null)
  }

  const handleConfirm = async (equipaId: string) => {
    if (!session) return
    await fetch(`/api/torneio/${params.id}/equipas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session.admin_id },
      body: JSON.stringify({ equipa_id: equipaId, confirmada: true }),
    })
    setEquipas(prev => prev.map(e => e.id === equipaId ? { ...e, confirmada: true } : e))
  }

  const grupos = torneio ? getGruposLetras(getFormatoConfig(torneio.formato).numGrupos) : []

  const equipasPorGrupo = grupos.map(g => ({
    grupo: g,
    equipas: equipas.filter(e => e.grupo === g).sort((a, b) => a.slot.localeCompare(b.slot)),
  }))

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-10">
      {msg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-white shadow-xl"
             style={{ background: '#1a2332', border: '1px solid var(--accent)' }}>{msg}</div>
      )}

      <div className="flex items-center justify-between mb-6 pt-2">
        <button onClick={() => router.back()} className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>← Voltar</button>
        <h1 className="text-lg font-extrabold text-white">⚽ Equipas</h1>
        <div className="w-16" />
      </div>

      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Define o nome de cada equipa no slot sorteado. Toca numa equipa para editar.
      </p>

      {equipasPorGrupo.map(({ grupo, equipas: eq }) => (
        <div key={grupo} className="mb-6">
          <div className="text-xs font-bold mb-2 px-1" style={{ color: 'var(--accent)' }}>GRUPO {grupo}</div>
          <div className="space-y-2">
            {eq.map(e => (
              <div key={e.id} className="card p-3">
                {editando === e.id ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold w-8 text-center" style={{ color: 'var(--muted)' }}>{e.slot}</span>
                    <input
                      autoFocus
                      value={nomes[e.id] ?? ''}
                      onChange={ev => setNomes(prev => ({ ...prev, [e.id]: ev.target.value }))}
                      onKeyDown={ev => { if (ev.key === 'Enter') handleSave(e.id); if (ev.key === 'Escape') setEditando(null) }}
                      className="flex-1 px-3 py-1.5 rounded-lg text-white font-semibold"
                      style={{ background: 'var(--border)' }}
                      placeholder="Nome da equipa..."
                    />
                    <button onClick={() => handleSave(e.id)} disabled={saving}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: 'var(--accent)', color: '#000' }}>
                      {saving ? '...' : '✓'}
                    </button>
                    <button onClick={() => setEditando(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: 'var(--border)', color: 'var(--muted)' }}>✕</button>
                  </div>
                ) : (
                  {(() => {
                    // Considera "sem nome" se null ou igual ao slot (ex: "A1")
                    const temNomeReal = e.nome && e.nome !== e.slot
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold w-8 text-center py-1 rounded-lg"
                                style={{ background: 'var(--border)', color: 'var(--muted)' }}>{e.slot}</span>
                          <span className="font-semibold"
                                style={{ color: temNomeReal ? 'white' : 'var(--muted)' }}>
                            {temNomeReal ? e.nome : 'Por definir...'}
                          </span>
                          {temNomeReal && e.confirmada && (
                            <span className="text-xs" style={{ color: '#4ade80' }}>✓</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {temNomeReal && !e.confirmada && (
                            <button onClick={() => handleConfirm(e.id)}
                                    className="text-xs px-2 py-1 rounded-lg"
                                    style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                              Confirmar
                            </button>
                          )}
                          <button onClick={() => setEditando(e.id)}
                                  className="text-xs px-2 py-1 rounded-lg"
                                  style={{ background: temNomeReal ? 'var(--border)' : 'rgba(30,144,255,0.15)', color: temNomeReal ? 'var(--muted)' : 'var(--accent)' }}>
                            {temNomeReal ? '✏️' : '+ Nome'}
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
