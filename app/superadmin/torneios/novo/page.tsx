'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getFormatoConfig, type FormatoTorneio, type Pausa } from '@/lib/torneio'

type Step = 1 | 2 | 3 | 4

export default function NovoTorneioPage() {
  const router = useRouter()
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [admins, setAdmins] = useState<{ id: string; nome: string }[]>([])
  const [adminsEscolhidos, setAdminsEscolhidos] = useState<string[]>([])

  const [form, setForm] = useState({
    nome: '',
    organizador: '',
    data_inicio: '',
    data_fim: '',
    formato: 10 as FormatoTorneio,
    dia1_inicio: '09:00',
    dia1_fim: '21:00',
    dia2_inicio: '09:00',
    dia2_fim: '21:00',
    duracao_jogo: 60,
    intervalo_jogos: 15,
    pausas_dia2: [] as Pausa[],
  })

  useEffect(() => {
    const s = getSession()
    setSession(s)
    if (!s || s.role !== 'superadmin') { router.push('/superadmin'); return }
    fetch('/api/admin', { headers: { 'X-Admin-Id': s.admin_id } })
      .then(r => r.json()).then(d => setAdmins(Array.isArray(d) ? d.filter((a: { role: string }) => a.role !== 'superadmin') : []))
  }, [router])

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const addPausa = () => setForm(f => ({
    ...f, pausas_dia2: [...f.pausas_dia2, { hora: '12:00', duracao: 60, descricao: 'Almoço' }]
  }))

  const updatePausa = (i: number, k: keyof Pausa, v: string | number) =>
    setForm(f => ({ ...f, pausas_dia2: f.pausas_dia2.map((p, idx) => idx === i ? { ...p, [k]: v } : p) }))

  const removePausa = (i: number) =>
    setForm(f => ({ ...f, pausas_dia2: f.pausas_dia2.filter((_, idx) => idx !== i) }))

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const calcularJogos = () => {
    const { numGrupos, equipasPorGrupo } = getFormatoConfig(form.formato)
    const n = equipasPorGrupo
    const jogosGrupo = (n * (n - 1)) / 2
    const totalGrupos = jogosGrupo * numGrupos
    const eliminatorias = form.formato === 8 ? 6 : 4
    return { totalGrupos, eliminatorias, total: totalGrupos + eliminatorias }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      let logo_url: string | undefined

      // Upload logo se fornecido
      if (logoFile) {
        const fd = new FormData()
        fd.append('file', logoFile)
        const upRes = await fetch('/api/upload/logo', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (upRes.ok) logo_url = upData.url
      }

      // Criar torneio
      const res = await fetch('/api/torneio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session!.admin_id },
        body: JSON.stringify({ ...form, logo_url, admins: adminsEscolhidos }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }

      // Gerar calendário
      await fetch(`/api/torneio/${data.id}/calendario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Id': session!.admin_id },
        body: JSON.stringify({}),
      })

      router.push(`/admin/torneio/${data.id}`)
    } finally {
      setSaving(false)
    }
  }

  const canNext = () => {
    if (step === 1) return form.nome && form.organizador && form.data_inicio && form.data_fim
    if (step === 2) return true
    if (step === 3) return form.dia1_inicio && form.dia1_fim && form.dia2_inicio && form.dia2_fim
    return true
  }

  const { totalGrupos, eliminatorias, total } = calcularJogos()
  const { numGrupos, equipasPorGrupo } = getFormatoConfig(form.formato)

  const inputCls = "w-full px-3 py-2 rounded-lg text-white font-semibold focus:outline-none focus:ring-1"
  const inputStyle = { background: 'var(--border)', border: '1px solid transparent' }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <button onClick={() => step > 1 ? setStep(s => (s - 1) as Step) : router.push('/superadmin')}
                className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          ← {step > 1 ? 'Anterior' : 'Cancelar'}
        </button>
        <h1 className="text-lg font-extrabold text-white">🏆 Novo Torneio</h1>
        <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>Passo {step}/4</span>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {[1,2,3,4].map(s => (
          <div key={s} className="flex-1 h-1 rounded-full"
               style={{ background: s <= step ? 'var(--accent)' : 'var(--border)' }} />
        ))}
      </div>

      {/* PASSO 1 — Informação Básica */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white mb-4">Informação Básica</h2>

          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>NOME DO TORNEIO *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
                   placeholder="ex: Torneio Futsal ADCVNM 2026" className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>ORGANIZADOR *</label>
            <input value={form.organizador} onChange={e => set('organizador', e.target.value)}
                   placeholder="ex: ADC Vila Nova de Monsarros" className={inputCls} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>DATA INÍCIO *</label>
              <input type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)}
                     className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>DATA FIM *</label>
              <input type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)}
                     className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>LOGO DO TORNEIO</label>
            <div className="flex items-center gap-3">
              {logoPreview && <img src={logoPreview} alt="" className="w-14 h-14 rounded-xl object-cover" />}
              <label className="flex-1 cursor-pointer">
                <div className="px-4 py-3 rounded-lg text-sm font-semibold text-center"
                     style={{ background: 'var(--border)', color: 'var(--muted)', border: '1px dashed var(--border)' }}>
                  {logoPreview ? '🔄 Trocar imagem' : '📷 Escolher imagem'}
                </div>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* PASSO 2 — Formato */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white mb-4">Formato do Torneio</h2>

          <div className="space-y-3">
            {([8, 10, 12] as FormatoTorneio[]).map(f => {
              const cfg = getFormatoConfig(f)
              const selected = form.formato === f
              return (
                <button key={f} onClick={() => set('formato', f)}
                        className="w-full p-4 rounded-xl text-left transition-all"
                        style={{
                          background: selected ? 'rgba(30,144,255,0.15)' : 'var(--card)',
                          border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{f} equipas</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {cfg.numGrupos} grupos de {cfg.equipasPorGrupo} equipas
                        {f === 8 && ' · Meias-finais a 2 mãos'}
                        {f === 10 && ' · Meias-finais a 1 mão'}
                      </div>
                    </div>
                    {selected && <span style={{ color: 'var(--accent)' }}>✓</span>}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="card p-4 mt-4">
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>RESUMO DO FORMATO ESCOLHIDO</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Jogos grupos', value: totalGrupos },
                { label: 'Eliminatórias', value: eliminatorias },
                { label: 'Total jogos', value: total },
              ].map(item => (
                <div key={item.label} className="rounded-lg p-2" style={{ background: 'var(--border)' }}>
                  <div className="text-lg font-extrabold" style={{ color: 'var(--accent)' }}>{item.value}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PASSO 3 — Calendário */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-white mb-4">Configuração do Calendário</h2>

          {/* Dia 1 */}
          <div className="card p-4">
            <div className="text-xs font-bold mb-3" style={{ color: 'var(--accent)' }}>
              DIA 1 — {form.data_inicio ? new Date(form.data_inicio + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>INÍCIO</label>
                <input type="time" value={form.dia1_inicio} onChange={e => set('dia1_inicio', e.target.value)}
                       className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>FIM</label>
                <input type="time" value={form.dia1_fim} onChange={e => set('dia1_fim', e.target.value)}
                       className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Dia 2 */}
          <div className="card p-4">
            <div className="text-xs font-bold mb-3" style={{ color: 'var(--accent)' }}>
              DIA 2 — {form.data_fim ? new Date(form.data_fim + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>INÍCIO</label>
                <input type="time" value={form.dia2_inicio} onChange={e => set('dia2_inicio', e.target.value)}
                       className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>FIM</label>
                <input type="time" value={form.dia2_fim} onChange={e => set('dia2_fim', e.target.value)}
                       className={inputCls} style={inputStyle} />
              </div>
            </div>

            {/* Pausas */}
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>PAUSAS DO DIA 2</div>
            {form.pausas_dia2.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input type="time" value={p.hora} onChange={e => updatePausa(i, 'hora', e.target.value)}
                       className="px-2 py-1.5 rounded-lg text-white text-sm font-semibold w-24"
                       style={{ background: 'var(--border)' }} />
                <input type="number" value={p.duracao} onChange={e => updatePausa(i, 'duracao', parseInt(e.target.value) || 0)}
                       placeholder="min" className="px-2 py-1.5 rounded-lg text-white text-sm font-semibold w-16 text-center"
                       style={{ background: 'var(--border)' }} min={5} />
                <input value={p.descricao} onChange={e => updatePausa(i, 'descricao', e.target.value)}
                       placeholder="Descrição" className="flex-1 px-2 py-1.5 rounded-lg text-white text-sm"
                       style={{ background: 'var(--border)' }} />
                <button onClick={() => removePausa(i)} className="text-red-400 font-bold px-2">✕</button>
              </div>
            ))}
            <button onClick={addPausa} className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--border)', color: 'var(--muted)' }}>
              + Adicionar Pausa
            </button>
          </div>

          {/* Duração / Intervalo */}
          <div className="card p-4">
            <div className="text-xs font-bold mb-3" style={{ color: 'var(--muted)' }}>JOGOS</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>DURAÇÃO SLOT (min)</label>
                <input type="number" value={form.duracao_jogo} onChange={e => set('duracao_jogo', parseInt(e.target.value) || 60)}
                       className={inputCls} style={inputStyle} min={30} max={120} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--muted)' }}>INTERVALO ENTRE JOGOS (min)</label>
                <input type="number" value={form.intervalo_jogos} onChange={e => set('intervalo_jogos', parseInt(e.target.value) || 15)}
                       className={inputCls} style={inputStyle} min={0} max={60} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASSO 4 — Admins */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white mb-4">Atribuir Admins</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Escolhe quais admins podem gerir este torneio:
          </p>

          {admins.length === 0 ? (
            <div className="card p-4 text-center" style={{ color: 'var(--muted)' }}>
              Nenhum admin criado ainda.<br />
              <button onClick={() => router.push('/superadmin')}
                      className="mt-2 text-sm underline" style={{ color: 'var(--accent)' }}>
                Criar admin primeiro
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map(a => {
                const selected = adminsEscolhidos.includes(a.id)
                return (
                  <button key={a.id}
                          onClick={() => setAdminsEscolhidos(prev =>
                            selected ? prev.filter(id => id !== a.id) : [...prev, a.id]
                          )}
                          className="w-full p-3 rounded-xl text-left"
                          style={{
                            background: selected ? 'rgba(30,144,255,0.12)' : 'var(--card)',
                            border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                          }}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{a.nome}</span>
                      {selected && <span style={{ color: 'var(--accent)' }}>✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Resumo Final */}
          <div className="card p-4 mt-4">
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>RESUMO</div>
            <div className="space-y-1 text-sm" style={{ color: 'var(--muted)' }}>
              <div>📛 <strong className="text-white">{form.nome}</strong></div>
              <div>🏢 {form.organizador}</div>
              <div>📅 {form.data_inicio} → {form.data_fim}</div>
              <div>⚽ {form.formato} equipas · {numGrupos} grupos de {equipasPorGrupo}</div>
              <div>🕐 Dia 1: {form.dia1_inicio}–{form.dia1_fim} · Dia 2: {form.dia2_inicio}–{form.dia2_fim}</div>
              <div>🎮 {total} jogos gerados automaticamente</div>
              {adminsEscolhidos.length > 0 && (
                <div>👤 {adminsEscolhidos.length} admin(s) atribuído(s)</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="mt-8">
        {step < 4 ? (
          <button onClick={() => setStep(s => (s + 1) as Step)}
                  disabled={!canNext()}
                  className="btn-primary w-full text-lg py-4"
                  style={{ opacity: canNext() ? 1 : 0.5 }}>
            Seguinte →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full text-lg py-4">
            {saving ? '⏳ A criar torneio...' : '🚀 Criar Torneio e Gerar Calendário'}
          </button>
        )}
      </div>
    </div>
  )
}
