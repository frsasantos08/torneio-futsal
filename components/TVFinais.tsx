'use client'

import { resolveNomeEquipa } from '@/lib/constants'
import type { Jogo } from '@/lib/constants'
import type { GrupoData } from '@/app/tv/page'

interface Props {
  grupos: GrupoData
  todosJogos: Jogo[]
}

function ScoreCard({ jogo, titulo, destaque }: { jogo?: Jogo; titulo: string; destaque?: boolean }) {
  if (!jogo) return null
  const isDone = jogo.status === 'finalizado'
  const isPending = jogo.status === 'pendente'
  const nomeA = resolveNomeEquipa(jogo.equipa_a_nome)
  const nomeB = resolveNomeEquipa(jogo.equipa_b_nome)
  const venceA = isDone && jogo.golos_a > jogo.golos_b
  const venceB = isDone && jogo.golos_b > jogo.golos_a

  return (
    <div className="rounded-xl overflow-hidden"
         style={{
           border: destaque ? '2px solid #ffd700' : '1px solid #1e3a6e',
           background: destaque ? 'rgba(255,215,0,0.04)' : 'rgba(14,21,53,0.8)',
           minWidth: destaque ? '200px' : '160px',
         }}>
      <div className="px-3 py-1.5 text-center"
           style={{
             background: destaque ? 'linear-gradient(90deg, #1a1000, #2a1f00)' : 'rgba(13,26,74,0.8)',
             borderBottom: `1px solid ${destaque ? '#ffd700' : '#1e3a6e'}`,
           }}>
        <span className={`text-xs font-black uppercase tracking-widest ${destaque ? 'text-yellow-400' : ''}`}
              style={{ color: destaque ? '#ffd700' : '#1e90ff' }}>
          {destaque ? '🏆 ' : ''}{titulo}
        </span>
      </div>
      <div className="p-3 text-center">
        <div className="font-bold text-sm mb-1 truncate" style={{ color: venceA ? '#22c55e' : '#e0eaff' }}>
          {jogo.equipa_a_nome ? nomeA : '—'}
        </div>
        <div className={`font-black my-1 ${destaque ? 'text-4xl' : 'text-2xl'}`}
             style={{ color: isPending ? '#1e3a6e' : destaque ? '#ffd700' : '#1e90ff' }}>
          {isPending ? 'vs' : `${jogo.golos_a}–${jogo.golos_b}`}
        </div>
        <div className="font-bold text-sm mt-1 truncate" style={{ color: venceB ? '#22c55e' : '#e0eaff' }}>
          {jogo.equipa_b_nome ? nomeB : '—'}
        </div>
      </div>
    </div>
  )
}

function GrupoCompacto({ grupo, equipas }: { grupo: string; equipas: (import('@/lib/constants').ClassificacaoEquipa & { nome: string })[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a6e', background: 'rgba(14,21,53,0.8)' }}>
      <div className="px-3 py-1.5"
           style={{ background: 'linear-gradient(90deg, #0d1a4a, #111840)', borderBottom: '1px solid #1e3a6e' }}>
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#1e90ff' }}>
          GRUPO {grupo}
        </span>
      </div>
      {equipas.slice(0, 3).map((eq, i) => (
        <div key={eq.equipa_id}
             className="flex items-center gap-2 px-3 py-1"
             style={{
               borderBottom: i < 2 ? '1px solid rgba(30,58,110,0.3)' : 'none',
               borderLeft: i === 0 ? '3px solid #ffd700' : i === 1 ? '3px solid #c0c0c0' : '3px solid transparent',
               background: i === 0 ? 'rgba(255,215,0,0.05)' : 'transparent',
             }}>
          <span className="text-xs font-black w-4" style={{ color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32' }}>
            {i + 1}
          </span>
          <span className="flex-1 text-xs font-semibold truncate" style={{ color: '#e0eaff' }}>{eq.nome}</span>
          <span className="text-xs font-black" style={{ color: '#1e90ff' }}>{eq.pontos}</span>
        </div>
      ))}
    </div>
  )
}

function Podium({ todosJogos }: { grupos: GrupoData; todosJogos: Jogo[] }) {
  const finalJogo = todosJogos.find(j => j.fase === 'final')
  const terceiroJogo = todosJogos.find(j => j.fase === 'terceiro')

  let primeiro: string | null = null
  let segundo: string | null = null
  let terceiro: string | null = null
  let quarto: string | null = null

  if (finalJogo?.status === 'finalizado') {
    primeiro = finalJogo.golos_a >= finalJogo.golos_b ? (finalJogo.equipa_a_nome ?? null) : (finalJogo.equipa_b_nome ?? null)
    segundo = finalJogo.golos_a >= finalJogo.golos_b ? (finalJogo.equipa_b_nome ?? null) : (finalJogo.equipa_a_nome ?? null)
  }

  if (terceiroJogo?.status === 'finalizado') {
    terceiro = terceiroJogo.golos_a >= terceiroJogo.golos_b ? (terceiroJogo.equipa_a_nome ?? null) : (terceiroJogo.equipa_b_nome ?? null)
    quarto = terceiroJogo.golos_a >= terceiroJogo.golos_b ? (terceiroJogo.equipa_b_nome ?? null) : (terceiroJogo.equipa_a_nome ?? null)
  }

  const posicoes = [
    { lugar: '2', nome: resolveNomeEquipa(segundo), medal: '🥈', grad: 'linear-gradient(135deg, #808080, #c0c0c0)', color: '#c0c0c0', height: '80px' },
    { lugar: '1', nome: resolveNomeEquipa(primeiro), medal: '🥇', grad: 'linear-gradient(135deg, #b8860b, #ffd700, #b8860b)', color: '#ffd700', height: '110px' },
    { lugar: '3', nome: resolveNomeEquipa(terceiro), medal: '🥉', grad: 'linear-gradient(135deg, #8b4513, #cd7f32)', color: '#cd7f32', height: '60px' },
  ]

  return (
    <div className="rounded-xl p-4" style={{ border: '1px solid #1e3a6e', background: 'rgba(14,21,53,0.8)' }}>
      <div className="text-center mb-3">
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#ffd700' }}>
          🏆 PÓDIO
        </span>
      </div>
      <div className="flex items-end justify-center gap-2">
        {posicoes.map((p) => (
          <div key={p.lugar} className="flex flex-col items-center gap-1">
            <span className="text-2xl">{p.medal}</span>
            <div className="w-20 text-center px-1 py-1.5 rounded-t-lg"
                 style={{ background: p.grad, height: p.height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '8px' }}>
              <span className="text-xs font-black text-white text-center leading-tight"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', wordBreak: 'break-word' }}>
                {p.nome === '?' ? `${p.lugar}º Lugar` : p.nome}
              </span>
            </div>
          </div>
        ))}
      </div>
      {quarto && (
        <div className="text-center mt-2">
          <span className="text-xs" style={{ color: '#7a9ec8' }}>4º: {resolveNomeEquipa(quarto)}</span>
        </div>
      )}
    </div>
  )
}

export default function TVFinais({ grupos, todosJogos }: Props) {
  const meias = todosJogos.filter(j => j.fase === 'meias').sort((a, b) => (a.numero_jogo ?? 0) - (b.numero_jogo ?? 0))
  const finalJogo = todosJogos.find(j => j.fase === 'final')
  const terceiroJogo = todosJogos.find(j => j.fase === 'terceiro')

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col"
         style={{ background: 'radial-gradient(ellipse at 20% 50%, #0d1a4a 0%, #0a0e27 65%)', fontFamily: 'Segoe UI, Inter, sans-serif' }}>

      {/* Partículas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-10"
               style={{
                 width: `${30 + i * 20}px`, height: `${30 + i * 20}px`,
                 background: i % 2 === 0 ? '#1e90ff' : '#ffd700',
                 left: `${(i * 43) % 90}%`, top: `${(i * 61) % 85}%`,
                 filter: 'blur(12px)',
               }} />
        ))}
      </div>

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between px-8 py-3"
           style={{ borderBottom: '1px solid #1e3a6e', background: 'rgba(14,21,53,0.8)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black"
               style={{ background: 'linear-gradient(135deg, #1e90ff, #0d1a4a)', border: '2px solid #1e90ff' }}>
            ⚽
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1e90ff' }}>Torneio</div>
            <div className="text-xs" style={{ color: '#7a9ec8' }}>20-21 Jun 2026</div>
          </div>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-widest" style={{ color: '#ffd700' }}>
          🏆 FASE FINAL
        </h1>
        <div className="w-32" />
      </div>

      {/* CORPO: 3 colunas */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-5 px-6 py-4">

        {/* ESQUERDA: Classificações compactas */}
        <div className="w-56 flex flex-col gap-3">
          {(['A', 'B', 'C'] as const).map(g => (
            <GrupoCompacto key={g} grupo={g} equipas={grupos[g] ?? []} />
          ))}
        </div>

        {/* CENTRO: Bracket */}
        <div className="flex-1 flex flex-col gap-4 items-center justify-center">

          {/* Meias */}
          <div className="flex gap-6 items-center">
            {meias.map((jogo, i) => (
              <ScoreCard key={jogo.id} jogo={jogo} titulo={`MEIA-FINAL ${i + 1}`} />
            ))}
          </div>

          {/* Setas / linha para final */}
          <div className="flex items-center gap-4">
            <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, #1e90ff)' }} />
            <span className="text-xs font-bold" style={{ color: '#7a9ec8' }}>▼ FINAL ▼</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, #1e90ff)' }} />
          </div>

          {/* Final + Terceiro */}
          <div className="flex gap-6 items-start">
            <ScoreCard jogo={finalJogo} titulo="FINAL" destaque />
            <div className="flex flex-col gap-2 items-center">
              <ScoreCard jogo={terceiroJogo} titulo="3º E 4º LUGAR" />
            </div>
          </div>

          {/* Pódio */}
          <div className="mt-2 w-full max-w-xs">
            <Podium grupos={grupos} todosJogos={todosJogos} />
          </div>
        </div>

        {/* DIREITA: Logo grande */}
        <div className="w-48 flex flex-col items-center justify-center">
          <div className="rounded-2xl p-8 flex flex-col items-center gap-4"
               style={{ border: '2px solid #1e3a6e', background: 'rgba(14,21,53,0.6)' }}>
            <div className="text-7xl">⚽</div>
            <div className="text-center">
              <div className="text-lg font-black uppercase tracking-wider" style={{ color: '#ffd700' }}>
                TORNEIO
              </div>
              <div className="text-sm font-bold uppercase tracking-widest" style={{ color: '#1e90ff' }}>
                FUTSAL
              </div>
              <div className="text-xs mt-1" style={{ color: '#7a9ec8' }}>
                5x5 · 2025-2026
              </div>
            </div>
            <div className="w-16 h-px" style={{ background: 'linear-gradient(to right, transparent, #ffd700, transparent)' }} />
            <div className="text-xs text-center font-semibold" style={{ color: '#7a9ec8' }}>
              20-21 Junho
              <br />2026
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
