'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import type { Torneio } from '@/lib/torneio'
import type { Jogo } from '@/lib/constants'

type MenuItem = { icon: string; label: string; desc: string; href: string; color: string }

function dataHoraPartes(dh: string) {
  const clean = dh.replace(' ', 'T')
  return { data: clean.slice(0, 10), hora: clean.slice(11, 16) }
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  agendado:   { label: 'Agendado',   color: 'var(--muted)' },
  decorrer:   { label: '▶ A decorrer', color: '#4ade80' },
  finalizado: { label: 'Finalizado', color: '#60a5fa' },
  intervalo:  { label: 'Intervalo',  color: '#fbbf24' },
}

export default function AdminTorneioPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [torneio, setTorneio] = useState<Torneio | null>(null)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [showJogos, setShowJogos] = useState(false)

  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s) { router.push('/admin'); return }
    Promise.all([
      fetch(`/api/torneio/${params.id}`, { headers: { 'X-Admin-Id': s.admin_id } }).then(r => r.json()),
      fetch(`/api/jogo/todos?torneio_id=${params.id}`).then(r => r.json()),
    ]).then(([t, j]) => {
      setTorneio(t)
      setJogos(Array.isArray(j) ? j : [])
      setLoading(false)
    })
  }, [params.id, router])

  const menuItems: MenuItem[] = [
    {
      icon: '🎮',
      label: 'Jogos',
      desc: 'Marcar golos, cartões e eventos',
      href: '#jogos',
      color: 'rgba(239,68,68,0.15)',
    },
    {
      icon: '⚽',
      label: 'Equipas',
      desc: 'Definir nomes e grupos das equipas',
      href: `/admin/torneio/${params.id}/equipas`,
      color: 'rgba(34,197,94,0.15)',
    },
    {
      icon: '📅',
      label: 'Calendário',
      desc: 'Ver e editar horários dos jogos',
      href: `/admin/torneio/${params.id}/calendario`,
      color: 'rgba(59,130,246,0.15)',
    },
    {
      icon: '📊',
      label: 'Rankings em Tempo Real',
      desc: 'Melhor ataque, defesa, disciplina',
      href: `/admin/torneio/${params.id}/rankings`,
      color: 'rgba(168,85,247,0.15)',
    },
    {
      icon: '🏆',
      label: 'Troféus',
      desc: 'Confirmar e gerir prémios',
      href: `/admin/torneio/${params.id}/trofeus`,
      color: 'rgba(251,191,36,0.15)',
    },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>
      A carregar...
    </div>
  )

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <button onClick={() => router.push('/admin')} className="text-sm font-semibold"
                style={{ color: 'var(--muted)' }}>← Torneios</button>
        {session && (
          <span className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: 'var(--card)', color: 'var(--accent)' }}>{session.nome}</span>
        )}
      </div>

      {/* Torneio Header */}
      {torneio && (
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-4">
            {torneio.logo_url && (
              <img src={torneio.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            )}
            <div>
              <h1 className="text-xl font-extrabold text-white">{torneio.nome}</h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{torneio.organizador}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {new Date(torneio.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' – '}
                {new Date(torneio.data_fim).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                ⚽ {torneio.formato} equipas · {torneio.num_grupos} grupos de {torneio.equipas_por_grupo}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="space-y-3">
        {menuItems.map(item => (
          <button key={item.href}
                  onClick={() => item.href === '#jogos' ? setShowJogos(v => !v) : router.push(item.href)}
                  className="w-full card p-4 text-left hover:scale-[1.01] transition-transform">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                   style={{ background: item.color }}>
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white">{item.label}</div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>{item.desc}</div>
              </div>
              <span style={{ color: 'var(--muted)' }}>{item.href === '#jogos' ? (showJogos ? '∨' : '›') : '›'}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Lista de Jogos */}
      {showJogos && (
        <div className="mt-3 space-y-2">
          {jogos.length === 0 ? (
            <div className="card p-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
              Sem jogos gerados. Vai ao Calendário para gerar.
            </div>
          ) : (
            jogos.map(j => {
              const { hora } = dataHoraPartes(j.data_hora ?? '')
              const st = STATUS_LABEL[j.status] ?? STATUS_LABEL.agendado
              const emCurso = j.status === 'decorrer' || j.status === 'intervalo'
              return (
                <button key={j.id}
                        onClick={() => router.push(`/game/${j.id}`)}
                        className="w-full card p-3 text-left transition-all hover:scale-[1.01]"
                        style={emCurso ? { border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(34,197,94,0.05)' } : {}}>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold w-6 text-center" style={{ color: 'var(--muted)' }}>
                      {j.numero_jogo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">
                        {j.equipa_a_nome ?? j.equipa_a_id} <span style={{ color: 'var(--muted)' }}>vs</span> {j.equipa_b_nome ?? j.equipa_b_id}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {hora} · {j.fase === 'grupos' ? `Grupo ${j.grupo}` : j.fase}
                      </div>
                    </div>
                    {j.status === 'finalizado' ? (
                      <div className="text-sm font-extrabold" style={{ color: '#60a5fa' }}>
                        {j.golos_a ?? 0}–{j.golos_b ?? 0}
                      </div>
                    ) : (
                      <div className="text-xs font-bold" style={{ color: st.color }}>{st.label}</div>
                    )}
                    <span className="text-lg">›</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
