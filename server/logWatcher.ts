/**
 * Global Event Log watcher.
 *
 * The log is an append-only JSONL file (one JSON object per line).
 * Each line is one event matching the schema in the design doc (Section 6).
 *
 * Relevant event_types that update the memory DB:
 *   memory_create, memory_update, memory_delete, memory_restore_request
 *   claim_create, claim_update
 *   identity_anchor_update
 *
 * All events are also stored in the events table for audit.
 *
 * Log file location (in priority order):
 *   1. LOG_FILE env variable
 *   2. ../global.log.jsonl  (sibling of the cc/ project root)
 *   3. ./data/global.log.jsonl (inside the project, good for dev)
 */

import { watch, existsSync, statSync } from 'node:fs'
import { open } from 'node:fs/promises'
import { resolve } from 'node:path'
import { db } from './db.ts'

const LOG_PATH = process.env.LOG_FILE
  ?? resolve(import.meta.dirname, '..', '..', 'global.log.jsonl')

const DEV_LOG_PATH = resolve(import.meta.dirname, '..', 'data', 'global.log.jsonl')

function resolveLogPath(): string {
  if (process.env.LOG_FILE) return process.env.LOG_FILE
  if (existsSync(LOG_PATH)) return LOG_PATH
  return DEV_LOG_PATH  // dev fallback — created on first write
}

// ── DB statement cache ────────────────────────────────────────────────────
const insertEvent = db.prepare(`
  INSERT OR IGNORE INTO events (event_id, seq, timestamp, actor, event_type, content, metadata)
  VALUES (@event_id, @seq, @timestamp, @actor, @event_type, @content, @metadata)
`)

const upsertMemory = db.prepare(`
  INSERT OR REPLACE INTO memories
  (id, type, content, meaning, relationship_effect, source_refs, created_at, updated_at,
   status, visibility, tags, promise_status, due_hint, fulfilled_at)
  VALUES (@id, @type, @content, @meaning, @relationship_effect, @source_refs, @created_at, @updated_at,
          @status, @visibility, @tags, @promise_status, @due_hint, @fulfilled_at)
`)

const softDeleteMemory = db.prepare(`UPDATE memories SET status='deleted', updated_at=@now WHERE id=@id`)

const insertDeletedRecord = db.prepare(`
  INSERT OR IGNORE INTO deleted_memories (id, memory_json, deleted_at, deleted_by)
  VALUES (@id, @memory_json, @deleted_at, @deleted_by)
`)

const insertRestoreRequest = db.prepare(`
  INSERT OR REPLACE INTO restore_requests
  (restoration_request_id, deleted_memory_id, deleted_memory_preview, reason, proposed_content,
   status, user_reason, created_at, resolved_at, attempt_number, previous_declines)
  VALUES (@restoration_request_id, @deleted_memory_id, @deleted_memory_preview, @reason, @proposed_content,
          @status, @user_reason, @created_at, @resolved_at, @attempt_number, @previous_declines)
`)

const upsertClaim = db.prepare(`
  INSERT OR REPLACE INTO claims
  (claim_id, subject, predicate, value, source_actor, source_seq, evidence, confidence,
   status, suspected_typo, valid_from, valid_to, superseded_by, created_at)
  VALUES (@claim_id, @subject, @predicate, @value, @source_actor, @source_seq, @evidence, @confidence,
          @status, @suspected_typo, @valid_from, @valid_to, @superseded_by, @created_at)
`)

const upsertAnchor = db.prepare(`
  INSERT OR REPLACE INTO identity_anchors (anchor_id, anchor, current_value, status, revisions, created_at)
  VALUES (@anchor_id, @anchor, @current_value, @status, @revisions, @created_at)
`)

// ── Event handler ─────────────────────────────────────────────────────────
export type BroadcastFn = (event: object) => void

function handleEvent(raw: unknown, broadcast: BroadcastFn) {
  if (!raw || typeof raw !== 'object') return
  const e = raw as Record<string, unknown>

  const eventId  = String(e.event_id  ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`)
  const seq      = Number(e.seq ?? 0)
  const ts       = String(e.timestamp ?? new Date().toISOString())
  const actor    = String(e.actor     ?? 'unknown')
  const evtType  = String(e.event_type ?? 'unknown')
  const content  = e.content ?? {}
  const metadata = e.metadata ?? {}

  // Store every event in the log table
  try {
    insertEvent.run({
      event_id: eventId, seq, timestamp: ts, actor, event_type: evtType,
      content: JSON.stringify(content), metadata: JSON.stringify(metadata),
    })
  } catch {}

  const c = content as Record<string, unknown>

  switch (evtType) {
    case 'memory_create':
    case 'memory_update': {
      if (!c.id || !c.type) break
      upsertMemory.run({
        id:                  String(c.id),
        type:                String(c.type),
        content:             String(c.content ?? ''),
        meaning:             c.meaning   != null ? String(c.meaning)   : null,
        relationship_effect: c.relationship_effect != null ? String(c.relationship_effect) : null,
        source_refs:         JSON.stringify(c.source_refs ?? []),
        created_at:          String(c.created_at ?? ts),
        updated_at:          evtType === 'memory_update' ? ts : (c.updated_at != null ? String(c.updated_at) : null),
        status:              String(c.status ?? 'active'),
        visibility:          String(c.visibility ?? 'shared'),
        tags:                JSON.stringify(c.tags ?? []),
        promise_status:      c.promise_status != null ? String(c.promise_status) : null,
        due_hint:            c.due_hint   != null ? String(c.due_hint)   : null,
        fulfilled_at:        c.fulfilled_at != null ? String(c.fulfilled_at) : null,
      })
      broadcast({ type: evtType, memory_id: c.id, event_id: eventId })
      break
    }

    case 'memory_delete': {
      const id = String(c.id ?? c.memory_id ?? '')
      if (!id) break
      const existing = db.prepare('SELECT * FROM memories WHERE id=?').get(id) as any
      softDeleteMemory.run({ id, now: ts })
      if (existing) {
        insertDeletedRecord.run({
          id, memory_json: JSON.stringify(existing),
          deleted_at: ts, deleted_by: actor,
        })
      }
      broadcast({ type: 'memory_deleted', id, event_id: eventId })
      break
    }

    case 'memory_restore_request': {
      const reqId = String(c.restoration_request_id ?? `rr_${Date.now()}`)
      insertRestoreRequest.run({
        restoration_request_id: reqId,
        deleted_memory_id:      String(c.deleted_memory_id ?? ''),
        deleted_memory_preview: String(c.deleted_memory_preview ?? ''),
        reason:                 String(c.reason ?? ''),
        proposed_content:       String(c.proposed_content ?? ''),
        status:                 String(c.status ?? 'pending'),
        user_reason:            c.user_reason != null ? String(c.user_reason) : null,
        created_at:             String(c.created_at ?? ts),
        resolved_at:            c.resolved_at != null ? String(c.resolved_at) : null,
        attempt_number:         Number(c.attempt_number ?? 1),
        previous_declines:      JSON.stringify(c.previous_declines ?? []),
      })
      broadcast({ type: 'restore_request_created', request_id: reqId, event_id: eventId })
      break
    }

    case 'claim_create':
    case 'claim_update': {
      if (!c.claim_id) break
      upsertClaim.run({
        claim_id:     String(c.claim_id),
        subject:      String(c.subject   ?? ''),
        predicate:    String(c.predicate ?? ''),
        value:        String(c.value     ?? ''),
        source_actor: String(c.source_actor ?? 'ai'),
        source_seq:   Number(c.source_seq ?? 0),
        evidence:     String(c.evidence  ?? ''),
        confidence:   Number(c.confidence ?? 0.5),
        status:       String(c.status    ?? 'candidate'),
        suspected_typo: c.suspected_typo ? 1 : 0,
        valid_from:   c.valid_from  != null ? String(c.valid_from)  : null,
        valid_to:     c.valid_to    != null ? String(c.valid_to)    : null,
        superseded_by:c.superseded_by != null ? String(c.superseded_by) : null,
        created_at:   String(c.created_at ?? ts),
      })
      broadcast({ type: evtType, claim_id: c.claim_id, event_id: eventId })
      break
    }

    case 'identity_anchor_update': {
      if (!c.anchor_id) break
      upsertAnchor.run({
        anchor_id:     String(c.anchor_id),
        anchor:        String(c.anchor        ?? ''),
        current_value: String(c.current_value ?? ''),
        status:        String(c.status        ?? 'stable'),
        revisions:     JSON.stringify(c.revisions ?? []),
        created_at:    String(c.created_at ?? ts),
      })
      broadcast({ type: 'identity_anchor_update', anchor_id: c.anchor_id, event_id: eventId })
      break
    }

    // All other event types (chat messages, wake, tool calls…) are stored
    // in the events table for audit but don't touch the memory tables.
    default:
      broadcast({ type: 'event', event_type: evtType, seq, event_id: eventId })
  }
}

// ── Tail reader ───────────────────────────────────────────────────────────
let _filePos = 0   // byte position of next unread content
let _logPath = ''

async function readNewLines(broadcast: BroadcastFn) {
  let fh: Awaited<ReturnType<typeof open>> | null = null
  try {
    fh = await open(_logPath, 'r')
    const stat = await fh.stat()
    if (stat.size <= _filePos) return   // nothing new

    const buf = Buffer.alloc(stat.size - _filePos)
    const { bytesRead } = await fh.read(buf, 0, buf.length, _filePos)
    _filePos += bytesRead

    const chunk = buf.subarray(0, bytesRead).toString('utf8')
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        handleEvent(parsed, broadcast)
      } catch {
        console.error('[logWatcher] bad JSON line:', trimmed.slice(0, 120))
      }
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') console.error('[logWatcher] read error:', err.message)
  } finally {
    await fh?.close()
  }
}

// ── Public API ────────────────────────────────────────────────────────────
export function startLogWatcher(broadcast: BroadcastFn) {
  _logPath = resolveLogPath()
  console.log(`[logWatcher] watching ${_logPath}`)

  // Seek to end of existing file so we don't replay history on boot
  if (existsSync(_logPath)) {
    try { _filePos = statSync(_logPath).size } catch {}
  }

  // Watch the file for changes (works even before the file exists via directory watch)
  const dir   = _logPath.substring(0, _logPath.lastIndexOf('/') || _logPath.lastIndexOf('\\'))
  const fname = _logPath.substring(dir.length + 1)

  const watchTarget = existsSync(_logPath) ? _logPath : (existsSync(dir) ? dir : null)
  if (!watchTarget) {
    console.log('[logWatcher] log file and parent dir not found — will poll every 5s')
  }

  const poll = setInterval(() => readNewLines(broadcast), 5000)

  try {
    if (watchTarget) {
      watch(watchTarget, { persistent: false }, (event, filename) => {
        if (watchTarget === _logPath || filename === fname) {
          readNewLines(broadcast)
        }
      })
    }
  } catch (err: any) {
    console.error('[logWatcher] fs.watch failed, using poll only:', err.message)
  }

  return () => clearInterval(poll)
}

export { resolveLogPath }
