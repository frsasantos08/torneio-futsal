'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { saveSession } from '@/lib/auth'

interface Props {
  onSuccess: () => void
  onClose: () => void
}

export default function LoginModal({ onSuccess, onClose }: Props) {
  const [adminId, setAdminId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminId || !password) return
    setLoading(true)
    setError('')
    try {
      const data = await api.login(password, adminId)
      saveSession({ admin_id: data.admin_id, nome: data.nome, role: data.role, token: data.token })
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro de login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="card p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-extrabold text-white mb-4">🔐 Login Admin</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1" style={{ color: 'var(--muted)' }}>
              Nome / ID
            </label>
            <input
              type="text"
              value={adminId}
              onChange={e => setAdminId(e.target.value)}
              placeholder="Ex: manuel"
              className="w-full px-4 py-3 rounded-xl text-white font-semibold outline-none focus:ring-2"
              style={{ background: 'var(--border)', borderColor: 'var(--border)', border: '1px solid', color: 'white' }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1" style={{ color: 'var(--muted)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl text-white font-semibold outline-none focus:ring-2"
              style={{ background: 'var(--border)', borderColor: 'var(--border)', border: '1px solid', color: 'white' }}
            />
          </div>
          {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
