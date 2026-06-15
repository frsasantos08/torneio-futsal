'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Jogo, ClassificacaoEquipa } from '@/lib/constants'
import { subscribeAllJogos, subscribeClassificacao } from '@/lib/realtime'
import TVGrupos from '@/components/TVGrupos'
import TVFinais from '@/components/TVFinais'

export type GrupoData = Record<string, (ClassificacaoEquipa & { nome: string })[]>

export default function TVPage() {
  const [todosJogos, setTodosJogos] = useState<Jogo[]>([])
  const [jogoAtual, setJogoAtual] = useState<Jogo | null>(null)
  const [grupos, setGrupos] = useState<GrupoData>({})
  const [loading, setLoading] = useState(true)
  const [torneioId, setTorneioId] = useState<string | null>(null)
  const [torneioNome, setTorneioNome] = useState<string>('TORNEIO FUTSAL')

  const buildGrupos = useCallback((rows: (ClassificacaoEquipa & { nome?: string })[]) => {
    const g: GrupoData = {}
    for (const r of rows) {
      ;(g[r.grupo] ??= []).push({ ...r, nome: r.nome ?? r.equipa_id })
    }
    return g
  }, [])

  const loadData = useCallback(async (tid: string | null) => {
    try {
      const param = tid ? `?torneio_id=${tid}` : ''
      const [atual, classificacao, todos] = await Promise.all([
        fetch(`/api/jogo/atual${param}`).then(r => r.json()).catch(() => null),
        fetch(`/api/classificacao/grupos${param}`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/jogo/todos${param}`).then(r => r.json()).catch(() => []),
      ])
      setTodosJogos(Array.isArray(todos) ? todos : [])
      setJogoAtual(atual?.id ? atual : null)
      setGrupos(typeof classificacao === 'object' && !Array.isArray(classificacao) ? classificacao : {})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Buscar torneio ativo primeiro
    fetch('/api/config/torneio-ativo').then(r => r.json()).then(cfg => {
      const tid = cfg?.torneio_id ?? null
      setTorneioId(tid)
      if (tid) {
        fetch(`/api/torneio/${tid}`).then(r => r.json()).then(t => {
          if (t?.nome) setTorneioNome(t.nome)
        })
      }
      loadData(tid)
    })

    const unsubJogos = subscribeAllJogos((updated) => {
      setTodosJogos(prev => prev.map(j => j.id === updated.id ? updated : j))
      if (updated.status === 'decorrer') setJogoAtual(updated)
      else if (updated.status === 'finalizado') {
        setJogoAtual(prev => prev?.id === updated.id ? null : prev)
      }
    })

    const unsubClass = subscribeClassificacao((rows) => {
      setGrupos(buildGrupos(rows))
    }, tid)

    return () => { unsubJogos(); unsubClass() }
  }, [loadData, buildGrupos])

  const totalGruposFinalizados = todosJogos.filter(j => j.status === 'finalizado' && j.fase === 'grupos').length
  const showFinais = totalGruposFinalizados >= 18

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e27' }}>
        <div className="text-4xl font-black" style={{ color: '#1e90ff' }}>
          ⚽ {torneioNome}
        </div>
      </div>
    )
  }

  return showFinais
    ? <TVFinais grupos={grupos} todosJogos={todosJogos} />
    : <TVGrupos todosJogos={todosJogos} grupos={grupos} jogoAtual={jogoAtual} />
}
