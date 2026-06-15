import { getSession } from './auth'

async function apiFetch(path: string, options?: RequestInit) {
  const session = getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`
    headers['X-Admin-Id'] = session.admin_id
  }
  const res = await fetch(path, { cache: 'no-store', ...options, headers: { ...headers, ...options?.headers } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

export const api = {
  login: (password: string, adminId: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ password, admin_id: adminId }) }),

  proximosJogos: () => apiFetch('/api/jogo/proximos'),
  todosJogos: () => apiFetch('/api/jogo/todos'),
  jogoAtual: () => apiFetch('/api/jogo/atual'),
  jogoEstado: (id: string) => apiFetch(`/api/jogo/${id}/estado?t=${Date.now()}`),

  golo: (id: string, equipa: 'a' | 'b') =>
    apiFetch(`/api/jogo/${id}/golo`, { method: 'POST', body: JSON.stringify({ equipa }) }),

  cartao: (id: string, equipa: 'a' | 'b', tipo: 'amarelo' | 'vermelho' | 'vermelho_direto' | 'vermelho_acumulacao') =>
    apiFetch(`/api/jogo/${id}/cartao`, { method: 'POST', body: JSON.stringify({ equipa, tipo }) }),

  falta: (id: string, equipa: 'a' | 'b') =>
    apiFetch(`/api/jogo/${id}/falta`, { method: 'POST', body: JSON.stringify({ equipa }) }),

  desfazer: (id: string) =>
    apiFetch(`/api/jogo/${id}/desfazer`, { method: 'POST' }),

  finalizar: (id: string) =>
    apiFetch(`/api/jogo/${id}/finalizar`, { method: 'POST' }),

  iniciarJogo: (id: string) =>
    apiFetch(`/api/jogo/${id}/iniciar`, { method: 'POST' }),

  reabrirJogo: (id: string) =>
    apiFetch(`/api/jogo/${id}/reabrir`, { method: 'POST' }),

  lockJogo: (id: string) =>
    apiFetch(`/api/jogo/${id}/lock`, { method: 'GET' }),

  unlockJogo: (id: string) =>
    apiFetch(`/api/jogo/${id}/unlock`, { method: 'POST' }),

  classificacaoGrupos: () => apiFetch('/api/classificacao/grupos'),
  classificacaoFinais: () => apiFetch('/api/classificacao/finais'),

  corrigirJogo: (id: string, dados: object) =>
    apiFetch(`/api/jogo/${id}/corrigir`, { method: 'PUT', body: JSON.stringify(dados) }),
}
