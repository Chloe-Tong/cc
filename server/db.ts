import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dataDir = join(import.meta.dirname, '..', 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

export const db = new Database(join(dataDir, 'memory.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    meaning TEXT,
    relationship_effect TEXT,
    source_refs TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    visibility TEXT NOT NULL DEFAULT 'shared',
    tags TEXT NOT NULL DEFAULT '[]',
    promise_status TEXT,
    due_hint TEXT,
    fulfilled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS claims (
    claim_id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    value TEXT NOT NULL,
    source_actor TEXT NOT NULL,
    source_seq INTEGER NOT NULL DEFAULT 0,
    evidence TEXT NOT NULL DEFAULT '',
    confidence REAL NOT NULL DEFAULT 0.5,
    status TEXT NOT NULL DEFAULT 'candidate',
    suspected_typo INTEGER NOT NULL DEFAULT 0,
    valid_from TEXT,
    valid_to TEXT,
    superseded_by TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deleted_memories (
    id TEXT PRIMARY KEY,
    memory_json TEXT NOT NULL,
    deleted_at TEXT NOT NULL,
    deleted_by TEXT NOT NULL DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS restore_requests (
    restoration_request_id TEXT PRIMARY KEY,
    deleted_memory_id TEXT NOT NULL,
    deleted_memory_preview TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    proposed_content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    user_reason TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    previous_declines TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS identity_anchors (
    anchor_id TEXT PRIMARY KEY,
    anchor TEXT NOT NULL,
    current_value TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'stable',
    revisions TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    seq INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    actor TEXT NOT NULL,
    event_type TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}'
  );

  CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
  CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
  CREATE INDEX IF NOT EXISTS idx_claims_subject ON claims(subject);
  CREATE INDEX IF NOT EXISTS idx_events_seq ON events(seq);
`)

export function rowToMemory(row: any) {
  return {
    ...row,
    source_refs: JSON.parse(row.source_refs),
    tags: JSON.parse(row.tags),
    suspected_typo: undefined,
  }
}

export function rowToClaim(row: any) {
  return { ...row, suspected_typo: Boolean(row.suspected_typo) }
}

export function rowToDeletedMemory(row: any, req: any) {
  return {
    memory: JSON.parse(row.memory_json),
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    restore_request: req ? {
      ...req,
      previous_declines: JSON.parse(req.previous_declines),
    } : undefined,
  }
}
