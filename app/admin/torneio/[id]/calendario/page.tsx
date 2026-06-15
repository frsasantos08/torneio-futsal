'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'

type Jogo = {
  id: string
  numero_jogo: number
  data_hora: string
  equipa_a_nome: string
  equipa_b_nome: string
  grupo: string | null
  fase: string
  golos_a: number | null
  golos_b: number | null
  status: string
  torneio_id: string
}

function dataHoraPartes(data_hora: string) {
  // "2026-06-20T09:00:00" — extrair directamente sem conversão UTC
  const clean = data_hora.replace(' ', 'T')
  const data = clean.slice(0, 10)
  const hora = clean.slice(11, 16)
  return { data, hora }
}

export default function CalendarioAdminPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [editData, setEditData] = useState({ data: '', hora: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [filtroDia, setFiltroDia] = useState<string>('todos')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s) { router.push('/admin'); return }
    carregarJogos(s.admin_id)
  }, [params.id, router])

  const carregarJogos = async (adminId: string) => {
    setLoading(true)
    const res = await fetch(`/api/torneio/${params.id}/calendario`, {
      headers: { 'X-Admin-Id': adminId }, cache: 'no-store',
    })
    const d = await res.json()
    setJogos(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  const handleGerar = async () => {
    if (!session) return
    if (!confirm('Gerar calendário? Se já existirem jogos, serão substituídos.')) return
    setGerando(true)
    const res = await fetch(`/api/torneio/${params.id}/calendario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session.admin_id },
      body: JSON.stringify({ regenerar: true }),
    })
    const data = await res.json()
    if (res.ok) {
      showMsg(`✅ ${data.jogos} jogos gerados`)
      carregarJogos(session.admin_id)
    } else {
      showMsg(`❌ ${data.error}`)
    }
    setGerando(false)
  }

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000) }

  const handleEditar = (j: Jogo) => {
    const { data, hora } = dataHoraPartes(j.data_hora)
    setEditando(j.id)
    setEditData({ data, hora })
  }

  const handleSave = async (jogoId: string) => {
    if (!session) return
    setSaving(true)
    const data_hora = `${editData.data}T${editData.hora}:00`
    const res = await fetch(`/api/torneio/${params.id}/calendario`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session.admin_id },
      body: JSON.stringify({ jogo_id: jogoId, data_hora }),
    })
    if (res.ok) {
      setJogos(prev => prev.map(j => j.id === jogoId ? { ...j, data_hora } : j))
      showMsg('✅ Horário actualizado')
    } else {
      showMsg('❌ Erro ao guardar')
    }
    setSaving(false)
    setEditando(null)
  }

  const dias = [...new Set(jogos.map(j => dataHoraPartes(j.data_hora).data))].sort()
  const jogosFiltrados = filtroDia === 'todos' ? jogos : jogos.filter(j => dataHoraPartes(j.data_hora).data === filtroDia)

  const statusColor = (s: string) => ({
    pendente: '#9ca3af', decorrer: '#4ade80', finalizado: '#60a5fa',
  }[s] ?? '#9ca3af')

  const faseLabel = (fase: string, grupo: string | null) => {
    if (fase === 'grupos') return `Grupo ${grupo}`
    const labels: Record<string, string> = {
      meias: 'Meia-Final', meias_1: 'Meia-Final (1ª mão)', meias_2: 'Meia-Final (2ª mão)',
      '3_4_lugar': '3.º/4.º Lugar', final: 'Final',
    }
    return labels[fase] ?? fase
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-10">
      {msg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-white shadow-xl"
             style={{ background: '#1a2332', border: '1px solid var(--accent)' }}>{msg}</div>
      )}

      <div className="flex items-center justify-between mb-6 pt-2">
        <button onClick={() => router.back()} className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>← Voltar</button>
        <h1 className="text-lg font-extrabold text-white">📅 Calendário</h1>
        <button onClick={handleGerar} disabled={gerando}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: jogos.length > 0 ? 'rgba(239,68,68,0.2)' : 'var(--accent)', color: jogos.length > 0 ? '#f87171' : '#000', border: jogos.length > 0 ? '1px solid rgba(239,68,68,0.4)' : 'none' }}>
          {gerando ? '⏳ A gerar...' : jogos.length > 0 ? '🔄 Regenerar' : '🔄 Gerar'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>A carregar...</div>
      ) : jogos.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'var(--muted)' }}>
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-white mb-2">Sem jogos gerados</div>
          <button onClick={handleGerar} disabled={gerando} className="btn-primary text-sm">
            {gerando ? 'A gerar...' : '🔄 Gerar Calendário'}
          </button>
        </div>
      ) : (
        <>
          {/* Filtro dias */}
          {dias.length > 1 && (
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              <button onClick={() => setFiltroDia('todos')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                      style={{ background: filtroDia === 'todos' ? 'var(--accent)' : 'var(--border)', color: filtroDia === 'todos' ? '#000' : 'var(--muted)' }}>
                Todos
              </button>
              {dias.map(d => (
                <button key={d} onClick={() => setFiltroDia(d)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                        style={{ background: filtroDia === d ? 'var(--accent)' : 'var(--border)', color: filtroDia === d ? '#000' : 'var(--muted)' }}>
                  {new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-6">
            {dias.filter(d => filtroDia === 'todos' || filtroDia === d).map(d => {
              const jogosNoDia = jogosFiltrados.filter(j => dataHoraPartes(j.data_hora).data === d)
              if (jogosNoDia.length === 0) return null
              return (
                <div key={d}>
                  <div className="text-xs font-bold mb-2 px-1" style={{ color: 'var(--accent)' }}>
                    {new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                  </div>
                  <div className="space-y-2">
                    {jogosNoDia.map(j => {
                      const { hora } = dataHoraPartes(j.data_hora)
                      return (
                        <div key={j.id} className="card p-3">
                          {editando === j.id ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input type="date" value={editData.data}
                                       onChange={e => setEditData(v => ({ ...v, data: e.target.value }))}
                                       className="flex-1 px-3 py-2 rounded-lg text-white font-semibold"
                                       style={{ background: 'var(--border)' }} />
                                <input type="time" value={editData.hora}
                                       onChange={e => setEditData(v => ({ ...v, hora: e.target.value }))}
                                       className="w-28 px-3 py-2 rounded-lg text-white font-semibold"
                                       style={{ background: 'var(--border)' }} />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleSave(j.id)} disabled={saving}
                                        className="flex-1 py-2 rounded-lg text-sm font-bold"
                                        style={{ background: 'var(--accent)', color: '#000' }}>
                                  {saving ? 'A guardar...' : '✓ Guardar'}
                                </button>
                                <button onClick={() => setEditando(null)}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold"
                                        style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="text-center flex-shrink-0" style={{ minWidth: 40 }}>
                                <div className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{hora}</div>
                                <div className="text-xs" style={{ color: 'var(--muted)' }}>#{j.numero_jogo}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold mb-0.5" style={{ color: statusColor(j.status) }}>
                                  {faseLabel(j.fase, j.grupo)}
                                </div>
                                <div className="text-sm font-bold text-white truncate">
                                  {j.equipa_a_nome} vs {j.equipa_b_nome}
                                </div>
                                {j.status === 'finalizado' && j.golos_a !== null && (
                                  <div className="text-xs mt-0.5" style={{ color: '#4ade80' }}>
                                    {j.golos_a} – {j.golos_b}
                                  </div>
                                )}
                              </div>
                              {j.status !== 'finalizado' && (
                                <button onClick={() => handleEditar(j)}
                                        className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                                        style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                                  ✏️
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
