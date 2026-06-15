'use client'

import { resolveNomeEquipa } from '@/lib/constants'
import type { Jogo } from '@/lib/constants'
import type { GrupoData } from '@/app/tv/page'

interface Props {
  todosJogos: Jogo[]
  grupos: GrupoData
  jogoAtual: Jogo | null
}

function fmtData(dt: string) {
  const d = new Date(dt)
  const dias = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']
  return dias[d.getDay()]
}

function fmtHora(dt: string) {
  return new Date(dt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}


export default function TVGrupos({ todosJogos, grupos, jogoAtual }: Props) {
  const gruposJogos = todosJogos
    .filter(j => j.fase === 'grupos')
    .sort((a, b) => (a.numero_jogo ?? 0) - (b.numero_jogo ?? 0))

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'linear-gradient(135deg, #001a4d 0%, #0a0f2a 50%, #001a4d 100%)',
      fontFamily: '"Segoe UI", Inter, Arial, sans-serif',
      position: 'relative', display: 'flex', flexDirection: 'column',
    }}>
      {/* Partículas animadas (SVG) */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        {[
          [8,12],[15,45],[22,78],[30,25],[38,60],[45,10],[52,85],[60,35],[67,70],[74,15],
          [80,55],[88,30],[92,80],[5,65],[25,90],[42,40],[58,18],[72,92],[85,48],[18,5],
          [35,52],[50,28],[63,75],[77,42],[90,65],[12,38],[28,72],[47,8],[65,62],[82,20],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r={i % 3 === 0 ? 1.5 : 1} fill="white">
            <animate attributeName="opacity" values="0.15;0.7;0.15"
              dur={`${2.5 + (i % 4) * 0.8}s`} begin={`${(i % 5) * 0.6}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {/* Efeito de luz radial */}
        <radialGradient id="centerGlow" cx="50%" cy="0%" r="50%">
          <stop offset="0%" stopColor="#1e90ff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#1e90ff" stopOpacity="0" />
        </radialGradient>
        <rect width="100%" height="100%" fill="url(#centerGlow)" />
      </svg>

      {/* CONTEÚDO (z-index sobre partículas) */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ═══ HEADER ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 24px 0',
          borderBottom: '1px solid rgba(30,144,255,0.25)',
        }}>
          {/* Título esquerda */}
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#4a7ab5', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
              FASE DE GRUPOS
            </div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              CALENDÁRIO <span style={{ color: '#1e90ff' }}>E RESULTADOS</span>
            </h2>
          </div>

          {/* LOGO CENTRAL */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{
              border: '2px solid rgba(30,144,255,0.7)',
              borderRadius: '50%',
              width: '90px', height: '90px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle, rgba(30,144,255,0.15) 0%, rgba(0,20,70,0.8) 70%)',
              boxShadow: '0 0 20px rgba(30,144,255,0.5), 0 0 40px rgba(30,144,255,0.2), inset 0 0 20px rgba(30,144,255,0.1)',
              marginBottom: '-12px',
              position: 'relative', zIndex: 2,
            }}>
              <div style={{ fontSize: '22px', lineHeight: 1 }}>⚽</div>
              <div style={{ fontSize: '7px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em', textAlign: 'center', lineHeight: 1.1, marginTop: '2px' }}>TORNEIO DE<br />FUTSAL</div>
              <div style={{
                fontSize: '20px', fontWeight: 900, color: '#ffd700', lineHeight: 1,
                textShadow: '0 0 10px rgba(255,215,0,0.8)',
              }}>26</div>
            </div>
            {/* Linha decorativa */}
            <div style={{ width: '2px', height: '14px', background: 'linear-gradient(to bottom, rgba(30,144,255,0.7), transparent)', zIndex: 1 }} />
          </div>

          {/* Título direita */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#4a7ab5', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
              PONTUAÇÃO
            </div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#1e90ff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              CLASSIFICAÇÕES
            </h2>
          </div>
        </div>

        {/* ═══ CORPO ═══ */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 0, padding: '6px 0 0' }}>

          {/* ── CALENDÁRIO ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 8px 0 16px' }}>
            <div style={{
              flex: 1, overflowY: 'auto', scrollbarWidth: 'none',
              border: '1.5px solid rgba(30,144,255,0.4)',
              borderRadius: '8px',
              boxShadow: '0 0 15px rgba(30,144,255,0.2), inset 0 0 30px rgba(0,10,40,0.3)',
              background: 'rgba(0,15,50,0.5)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '56px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '68px' }} />
                  <col style={{ width: '52px' }} />
                  <col style={{ width: '68px' }} />
                  <col style={{ width: '120px' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(30,144,255,0.35)', background: 'rgba(30,144,255,0.08)' }}>
                    {['JOGO','GRUPO','DATA','HORA','EQUIPA 1','','RESULTADO','','EQUIPA 2'].map((h, i) => (
                      <th key={i} style={{
                        padding: '6px 4px', textAlign: i >= 5 && i <= 7 ? 'center' : 'left',
                        fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.08em',
                        color: '#4a7ab5', textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gruposJogos.map((jogo, idx) => {
                    const isAtual = jogoAtual?.id === jogo.id
                    const isFinalizado = jogo.status === 'finalizado'
                    const isDecoller = jogo.status === 'decorrer'
                    const venceA = isFinalizado && jogo.golos_a > jogo.golos_b
                    const venceB = isFinalizado && jogo.golos_b > jogo.golos_a
                    const empate = isFinalizado && jogo.golos_a === jogo.golos_b
                    const showStats = isFinalizado || isDecoller

                    return (
                      <tr key={jogo.id} style={{
                        background: isAtual
                          ? 'rgba(255,215,0,0.12)'
                          : idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        borderLeft: isAtual ? '3px solid #ffd700' : '3px solid transparent',
                        borderBottom: '1px solid rgba(30,144,255,0.12)',
                        transition: 'background 0.2s',
                      }}>
                        <td style={{ padding: '4px 4px', fontWeight: 700, fontSize: '0.68rem', color: isAtual ? '#ffd700' : '#1e90ff', whiteSpace: 'nowrap' }}>
                          Jogo {jogo.numero_jogo}
                        </td>
                        <td style={{ padding: '4px 4px' }}>
                          <span style={{
                            fontWeight: 700, padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem',
                            background: 'rgba(30,144,255,0.2)', color: '#60a5fa',
                            border: '1px solid rgba(30,144,255,0.3)',
                          }}>{jogo.grupo}</span>
                        </td>
                        <td style={{ padding: '4px 4px', color: '#5a7aa0', fontSize: '0.67rem' }}>{fmtData(jogo.data_hora)}</td>
                        <td style={{ padding: '4px 4px', color: '#5a7aa0', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.67rem' }}>{fmtHora(jogo.data_hora)}</td>
                        <td style={{ padding: '4px 4px', fontWeight: 600, color: venceA ? '#00ff88' : '#c8d8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {resolveNomeEquipa(jogo.equipa_a_nome)}
                        </td>
                        {/* Cartões A */}
                        <td style={{ padding: '3px 2px', fontSize: '0.62rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                          {showStats && <>
                            {(jogo.amarelos_a ?? 0) > 0 && <span style={{ color: '#facc15' }}>🟨{jogo.amarelos_a} </span>}
                            {(jogo.vermelhos_a ?? 0) > 0 && <span style={{ color: '#f87171' }}>🟥{jogo.vermelhos_a} </span>}
                            {(jogo.faltas_a ?? 0) > 0 && <span style={{ color: '#fb923c' }}>⚠{jogo.faltas_a}</span>}
                          </>}
                        </td>
                        {/* Resultado */}
                        <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                          {isDecoller ? (
                            <span style={{
                              fontWeight: 900, padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem',
                              background: '#dc2626', color: 'white',
                              boxShadow: '0 0 8px rgba(220,38,38,0.6)',
                              animation: 'pulse 1.5s infinite',
                            }}>{jogo.golos_a}–{jogo.golos_b}</span>
                          ) : isFinalizado ? (
                            <span style={{
                              fontWeight: 900, padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem',
                              background: 'rgba(0,30,80,0.8)',
                              color: empate ? '#ffd700' : '#00ff88',
                              border: '1px solid rgba(30,144,255,0.3)',
                            }}>{jogo.golos_a}–{jogo.golos_b}</span>
                          ) : (
                            <span style={{ color: '#1e3a6e', fontWeight: 700, fontSize: '0.7rem' }}>vs</span>
                          )}
                        </td>
                        {/* Cartões B */}
                        <td style={{ padding: '3px 2px', fontSize: '0.62rem', whiteSpace: 'nowrap', textAlign: 'left' }}>
                          {showStats && <>
                            {(jogo.amarelos_b ?? 0) > 0 && <span style={{ color: '#facc15' }}>🟨{jogo.amarelos_b} </span>}
                            {(jogo.vermelhos_b ?? 0) > 0 && <span style={{ color: '#f87171' }}>🟥{jogo.vermelhos_b} </span>}
                            {(jogo.faltas_b ?? 0) > 0 && <span style={{ color: '#fb923c' }}>⚠{jogo.faltas_b}</span>}
                          </>}
                        </td>
                        <td style={{ padding: '4px 4px', fontWeight: 600, color: venceB ? '#00ff88' : '#c8d8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {resolveNomeEquipa(jogo.equipa_b_nome)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SEPARADOR ── */}
          <div style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(30,144,255,0.3) 20%, rgba(30,144,255,0.3) 80%, transparent)', margin: '8px 0' }} />

          {/* ── CLASSIFICAÇÕES ── */}
          <div style={{
            width: '400px', display: 'flex', flexDirection: 'column',
            gap: '6px', padding: '0 16px 0 8px', overflowY: 'auto', scrollbarWidth: 'none',
          }}>
            {Object.keys(grupos).sort().map(grupo => (
              <GrupoCard key={grupo} grupo={grupo} equipas={grupos[grupo] ?? []} />
            ))}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px',
          padding: '5px 24px', borderTop: '1px solid rgba(30,144,255,0.2)',
          background: 'rgba(0,10,40,0.5)',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4a7ab5', letterSpacing: '0.1em' }}>📅 20 E 21 JUNHO</span>
          <div style={{ width: '1px', height: '12px', background: 'rgba(30,144,255,0.3)' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e90ff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            📍 ADC VILA NOVA DE MONSARROS
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(220,38,38,0.6); }
          50% { box-shadow: 0 0 16px rgba(220,38,38,1); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(30,144,255,0.5), 0 0 40px rgba(30,144,255,0.2); }
          50% { box-shadow: 0 0 30px rgba(30,144,255,0.8), 0 0 60px rgba(30,144,255,0.3); }
        }
      `}</style>
    </div>
  )
}

type EqData = import('@/lib/constants').ClassificacaoEquipa & { nome: string }

function GrupoCard({ grupo, equipas }: { grupo: string; equipas: EqData[] }) {
  return (
    <div style={{
      border: '1.5px solid rgba(30,144,255,0.4)',
      borderRadius: '8px',
      background: 'rgba(0,15,55,0.65)',
      boxShadow: '0 0 15px rgba(30,144,255,0.15)',
      overflow: 'hidden',
    }}>
      {/* Header grupo */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '5px 10px',
        background: 'linear-gradient(90deg, rgba(30,144,255,0.25), rgba(30,144,255,0.08))',
        borderBottom: '1px solid rgba(30,144,255,0.3)',
      }}>
        <span style={{ fontWeight: 900, fontSize: '0.72rem', color: '#1e90ff', letterSpacing: '0.15em', flex: 1 }}>GRUPO {grupo}</span>
        <div style={{ display: 'flex', gap: '2px', fontSize: '0.58rem', fontWeight: 700, color: '#4a7ab5' }}>
          {['J','V','E','D','GM','GS','DG','F','PTS'].map(h => (
            <span key={h} style={{
              textAlign: 'center', minWidth: h === 'PTS' ? '22px' : h.length > 1 ? '20px' : '14px',
              color: h === 'PTS' ? '#1e90ff' : h === 'F' ? '#fb923c' : undefined,
            }}>{h}</span>
          ))}
          <span style={{ minWidth: '18px', textAlign: 'center', marginLeft: '4px' }}>🟨</span>
          <span style={{ minWidth: '18px', textAlign: 'center' }}>🟥</span>
        </div>
      </div>

      {/* Linhas */}
      {equipas.map((eq, i) => {
        const gm = eq.golos_marcados ?? 0
        const gs = eq.golos_sofridos ?? 0
        const dg = gm - gs
        const posColors = ['#ffd700', '#9ca3af', '#cd7f32']
        const posBorder = ['3px solid #ffd700', '3px solid #9ca3af', '3px solid #cd7f32', '3px solid transparent']

        return (
          <div key={eq.equipa_id} style={{
            display: 'flex', alignItems: 'center', padding: '4px 10px',
            background: i === 0 ? 'rgba(255,215,0,0.05)' : 'transparent',
            borderBottom: i < equipas.length - 1 ? '1px solid rgba(30,144,255,0.12)' : 'none',
            borderLeft: posBorder[i] ?? '3px solid transparent',
          }}>
            {/* Posição */}
            <span style={{ width: '14px', fontSize: '0.65rem', fontWeight: 900, textAlign: 'center', color: posColors[i] ?? '#4b5563', marginRight: '4px', flexShrink: 0 }}>
              {i + 1}
            </span>
            {/* Nome */}
            <span style={{ flex: 1, fontSize: '0.68rem', fontWeight: 600, color: '#d0e4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {eq.nome}
            </span>
            {/* Estatísticas */}
            <div style={{ display: 'flex', gap: '2px', fontSize: '0.65rem', fontFamily: 'monospace', alignItems: 'center', flexShrink: 0, marginLeft: '4px' }}>
              {[eq.jogos_disputados ?? 0, eq.vitorias ?? 0, eq.empates ?? 0, eq.derrotas ?? 0].map((v, vi) => (
                <span key={vi} style={{ textAlign: 'center', minWidth: '14px', color: '#5a7aa0' }}>{v}</span>
              ))}
              <span style={{ textAlign: 'center', minWidth: '20px', color: '#5a7aa0' }}>{gm}</span>
              <span style={{ textAlign: 'center', minWidth: '20px', color: '#5a7aa0' }}>{gs}</span>
              <span style={{ textAlign: 'center', minWidth: '20px', fontWeight: 700, color: dg > 0 ? '#00ff88' : dg < 0 ? '#ff6b6b' : '#5a7aa0' }}>
                {dg > 0 ? '+' : ''}{dg}
              </span>
              <span style={{ textAlign: 'center', minWidth: '14px', color: (eq.faltas ?? 0) > 0 ? '#fb923c' : '#5a7aa0' }}>
                {eq.faltas ?? 0}
              </span>
              <span style={{ textAlign: 'center', minWidth: '22px', fontWeight: 900, fontSize: '0.72rem', color: '#1e90ff' }}>
                {eq.pontos ?? 0}
              </span>
              {/* Amarelos e Vermelhos */}
              <span style={{ textAlign: 'center', minWidth: '18px', marginLeft: '4px', color: (eq.amarelos ?? 0) > 0 ? '#facc15' : '#3a4a60', fontWeight: 700, fontSize: '0.65rem' }}>
                {eq.amarelos ?? 0}
              </span>
              <span style={{ textAlign: 'center', minWidth: '18px', color: (eq.vermelhos ?? 0) > 0 ? '#f87171' : '#3a4a60', fontWeight: 700, fontSize: '0.65rem' }}>
                {eq.vermelhos ?? 0}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
