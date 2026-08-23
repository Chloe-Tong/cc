import type { Memory, Claim, DeletedMemory, IdentityAnchor, LogEvent } from '../types/memory'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  getLongterm:       (search?: string) => get<Memory[]>(`/memories/longterm${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getEpisodic:       (search?: string) => get<Memory[]>(`/memories/episodic${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getPromises:       (search?: string) => get<Memory[]>(`/memories/promises${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getPrivate:        ()                => get<Memory[]>('/memories/private'),
  getClaims:         (search?: string) => get<Claim[]>(`/claims${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getDeleted:        ()                => get<DeletedMemory[]>('/deleted'),
  getIdentityAnchors:()                => get<IdentityAnchor[]>('/identity-anchors'),
  getStats:          ()                => get<{ total: number; last_updated: string | null }>('/stats'),
  getEvents:         (limit = 60)     => get<LogEvent[]>(`/events?limit=${limit}`),

  deleteMemory: (id: string) =>
    fetch(`${BASE}/memories/${id}`, { method: 'DELETE' }).then((r) => r.json()),

  resolveRestoreRequest: (id: string, status: 'accepted' | 'declined', user_reason?: string) =>
    fetch(`${BASE}/restore-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, user_reason }),
    }).then((r) => r.json()),

  importJson: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/import`, { method: 'POST', body: form }).then((r) => r.json())
  },
}

// Singleton WebSocket with auto-reconnect
let _ws: WebSocket | null = null
type WsListener = (event: object) => void
const _listeners = new Set<WsListener>()

function connectWs() {
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) return
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  _ws = new WebSocket(`${proto}://${location.host}/ws`)
  _ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      for (const fn of _listeners) fn(data)
    } catch {}
  }
  _ws.onclose = () => { setTimeout(connectWs, 3000) }
}

export function onWsEvent(fn: WsListener): () => void {
  _listeners.add(fn)
  connectWs()
  return () => _listeners.delete(fn)
}
