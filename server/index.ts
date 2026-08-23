import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import { db, rowToMemory, rowToClaim, rowToDeletedMemory } from './db.ts'
import { importMemoriesJson } from './import.ts'
import { startLogWatcher, resolveLogPath } from './logWatcher.ts'

const app = Fastify({ logger: false })

await app.register(cors, { origin: true })
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } })
await app.register(websocket)

// WebSocket clients for push updates
const wsClients = new Set<any>()

function broadcast(event: object) {
  const msg = JSON.stringify(event)
  for (const client of wsClients) {
    try { client.send(msg) } catch {}
  }
}

// ── WebSocket ──────────────────────────────────────────────────────────────
app.get('/ws', { websocket: true }, (socket) => {
  wsClients.add(socket)
  socket.on('close', () => wsClients.delete(socket))
})

// ── Stats ──────────────────────────────────────────────────────────────────
app.get('/api/stats', async () => {
  const total = (db.prepare("SELECT COUNT(*) as n FROM memories WHERE status='active'").get() as any).n
  const lastRaw = db.prepare("SELECT created_at FROM memories WHERE status='active' ORDER BY created_at DESC LIMIT 1").get() as any
  return { total, last_updated: lastRaw?.created_at ?? null }
})

// ── Long-term memories (fact + relationship + relationship_self_understanding) ──
app.get('/api/memories/longterm', async (req) => {
  const { search } = req.query as { search?: string }
  let rows: any[]
  if (search) {
    rows = db.prepare(`
      SELECT * FROM memories
      WHERE status='active' AND type IN ('fact','relationship','relationship_self_understanding')
      AND (content LIKE ? OR meaning LIKE ? OR tags LIKE ?)
      ORDER BY created_at ASC
    `).all(`%${search}%`, `%${search}%`, `%${search}%`)
  } else {
    rows = db.prepare(`
      SELECT * FROM memories WHERE status='active'
      AND type IN ('fact','relationship','relationship_self_understanding')
      ORDER BY created_at ASC
    `).all()
  }
  return rows.map(rowToMemory)
})

// ── Episodic memories ──────────────────────────────────────────────────────
app.get('/api/memories/episodic', async (req) => {
  const { search } = req.query as { search?: string }
  let rows: any[]
  if (search) {
    rows = db.prepare(`
      SELECT * FROM memories WHERE status='active' AND type='episodic'
      AND (content LIKE ? OR meaning LIKE ? OR tags LIKE ?)
      ORDER BY created_at DESC
    `).all(`%${search}%`, `%${search}%`, `%${search}%`)
  } else {
    rows = db.prepare(`
      SELECT * FROM memories WHERE status='active' AND type='episodic'
      ORDER BY created_at DESC
    `).all()
  }
  return rows.map(rowToMemory)
})

// ── Promises ───────────────────────────────────────────────────────────────
app.get('/api/memories/promises', async (req) => {
  const { search } = req.query as { search?: string }
  let rows: any[]
  if (search) {
    rows = db.prepare(`
      SELECT * FROM memories WHERE status='active' AND type='promise'
      AND content LIKE ?
      ORDER BY created_at DESC
    `).all(`%${search}%`)
  } else {
    rows = db.prepare(`
      SELECT * FROM memories WHERE status='active' AND type='promise'
      ORDER BY created_at DESC
    `).all()
  }
  return rows.map(rowToMemory)
})

// ── Private psychology ─────────────────────────────────────────────────────
app.get('/api/memories/private', async () => {
  const rows = db.prepare(`
    SELECT * FROM memories WHERE status='active'
    AND type IN ('private_psychology','historical_psychology')
    ORDER BY created_at DESC
  `).all()
  return rows.map(rowToMemory)
})

// ── Claims / Facts & Conflicts ─────────────────────────────────────────────
app.get('/api/claims', async (req) => {
  const { search } = req.query as { search?: string }
  let rows: any[]
  if (search) {
    rows = db.prepare(`
      SELECT * FROM claims
      WHERE subject LIKE ? OR value LIKE ? OR evidence LIKE ?
      ORDER BY created_at ASC
    `).all(`%${search}%`, `%${search}%`, `%${search}%`)
  } else {
    rows = db.prepare('SELECT * FROM claims ORDER BY created_at ASC').all()
  }
  return rows.map(rowToClaim)
})

// ── Deleted memories + restore requests ───────────────────────────────────
app.get('/api/deleted', async () => {
  const deleted = db.prepare('SELECT * FROM deleted_memories ORDER BY deleted_at DESC').all() as any[]
  return deleted.map((d) => {
    const req = db.prepare('SELECT * FROM restore_requests WHERE deleted_memory_id=?').get(d.id) as any
    return rowToDeletedMemory(d, req)
  })
})

// ── Identity anchors ───────────────────────────────────────────────────────
app.get('/api/identity-anchors', async () => {
  const rows = db.prepare('SELECT * FROM identity_anchors ORDER BY created_at ASC').all() as any[]
  return rows.map((r) => ({ ...r, revisions: JSON.parse(r.revisions) }))
})

// ── Respond to a restore request ───────────────────────────────────────────
app.patch('/api/restore-requests/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const { status, user_reason } = req.body as { status: 'accepted' | 'declined'; user_reason?: string }
  if (!['accepted', 'declined'].includes(status)) return reply.code(400).send({ error: 'invalid status' })

  const existing = db.prepare('SELECT * FROM restore_requests WHERE restoration_request_id=?').get(id) as any
  if (!existing) return reply.code(404).send({ error: 'not found' })

  db.prepare(`
    UPDATE restore_requests SET status=?, user_reason=?, resolved_at=? WHERE restoration_request_id=?
  `).run(status, user_reason ?? null, new Date().toISOString(), id)

  broadcast({ type: 'restore_resolved', id, status })
  return { ok: true }
})

// ── Create a memory directly ──────────────────────────────────────────────
app.post('/api/memories', async (req, reply) => {
  const b = req.body as Record<string, unknown>
  if (!b.type || !b.content) return reply.code(400).send({ error: 'type and content required' })

  const id  = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO memories
    (id, type, content, meaning, relationship_effect, source_refs, created_at, updated_at,
     status, visibility, tags, promise_status, due_hint, fulfilled_at)
    VALUES (?,?,?,?,?,?,?,?, ?,?,?,?,?,?)
  `).run(
    id,
    String(b.type),
    String(b.content),
    b.meaning           ? String(b.meaning)           : null,
    b.relationship_effect ? String(b.relationship_effect) : null,
    '[]',
    now, null,
    'active',
    b.visibility ? String(b.visibility) : 'shared',
    b.tags ? JSON.stringify(b.tags) : '[]',
    b.promise_status ? String(b.promise_status) : null,
    b.due_hint       ? String(b.due_hint)       : null,
    null,
  )

  broadcast({ type: 'memory_create', memory_id: id })
  return reply.code(201).send({ id })
})

// ── Soft-delete a memory ───────────────────────────────────────────────────
app.delete('/api/memories/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const row = db.prepare('SELECT * FROM memories WHERE id=?').get(id) as any
  if (!row) return reply.code(404).send({ error: 'not found' })

  const now = new Date().toISOString()
  db.prepare('UPDATE memories SET status=? WHERE id=?').run('deleted', id)
  db.prepare('INSERT OR IGNORE INTO deleted_memories (id, memory_json, deleted_at, deleted_by) VALUES (?,?,?,?)').run(
    id, JSON.stringify(rowToMemory(row)), now, 'user'
  )

  broadcast({ type: 'memory_deleted', id })
  return { ok: true }
})

// ── JSON import (file upload) ──────────────────────────────────────────────
app.post('/api/import', async (req, reply) => {
  let json: unknown
  const contentType = req.headers['content-type'] ?? ''

  if (contentType.includes('multipart/form-data')) {
    const file = await req.file()
    if (!file) return reply.code(400).send({ error: 'no file' })
    const buf = await file.toBuffer()
    try { json = JSON.parse(buf.toString('utf8')) } catch { return reply.code(400).send({ error: 'invalid JSON' }) }
  } else {
    json = req.body
  }

  const result = importMemoriesJson(json)
  broadcast({ type: 'import_complete', ...result })
  return result
})

// ── Recent events log ─────────────────────────────────────────────────────
app.get('/api/events', async (req) => {
  const { limit = '50', after_seq } = req.query as { limit?: string; after_seq?: string }
  const n = Math.min(Number(limit), 200)
  let rows: any[]
  if (after_seq) {
    rows = db.prepare('SELECT * FROM events WHERE seq > ? ORDER BY seq DESC LIMIT ?').all(Number(after_seq), n)
  } else {
    rows = db.prepare('SELECT * FROM events ORDER BY seq DESC LIMIT ?').all(n)
  }
  return rows.map((r) => ({ ...r, content: JSON.parse(r.content), metadata: JSON.parse(r.metadata) }))
})

// ── Log watcher info ──────────────────────────────────────────────────────
app.get('/api/log-status', async () => {
  const { existsSync, statSync } = await import('node:fs')
  const path = resolveLogPath()
  const exists = existsSync(path)
  return {
    log_file: path,
    exists,
    size_bytes: exists ? statSync(path).size : 0,
  }
})

// ── Boot ───────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001)
await app.listen({ port: PORT, host: '0.0.0.0' })
console.log(`Memory server running on http://localhost:${PORT}`)

startLogWatcher(broadcast)
