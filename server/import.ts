/**
 * JSON import handler.
 * Accepts the Claude export format (memories.json) or the frontend's Memory[] format.
 */
import { db } from './db.ts'

const insertMemory = db.prepare(`
  INSERT OR REPLACE INTO memories
  (id, type, content, meaning, relationship_effect, source_refs, created_at, updated_at, status, visibility, tags, promise_status, due_hint, fulfilled_at)
  VALUES (@id, @type, @content, @meaning, @relationship_effect, @source_refs, @created_at, @updated_at, @status, @visibility, @tags, @promise_status, @due_hint, @fulfilled_at)
`)

const insertClaim = db.prepare(`
  INSERT OR REPLACE INTO claims
  (claim_id, subject, predicate, value, source_actor, source_seq, evidence, confidence, status, suspected_typo, valid_from, valid_to, superseded_by, created_at)
  VALUES (@claim_id, @subject, @predicate, @value, @source_actor, @source_seq, @evidence, @confidence, @status, @suspected_typo, @valid_from, @valid_to, @superseded_by, @created_at)
`)

const insertAnchor = db.prepare(`
  INSERT OR REPLACE INTO identity_anchors (anchor_id, anchor, current_value, status, revisions, created_at)
  VALUES (@anchor_id, @anchor, @current_value, @status, @revisions, @created_at)
`)

export type ImportResult = {
  memories_imported: number
  claims_imported: number
  anchors_imported: number
  errors: string[]
}

export function importMemoriesJson(raw: unknown): ImportResult {
  const result: ImportResult = { memories_imported: 0, claims_imported: 0, anchors_imported: 0, errors: [] }
  if (!raw || typeof raw !== 'object') {
    result.errors.push('JSON must be an object or array')
    return result
  }

  const data = raw as Record<string, unknown>

  // Support { memories: [...], claims: [...], identity_anchors: [...] }
  // or a plain array treated as memories
  const memoriesArr: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray(data.memories) ? data.memories as unknown[] : []

  const claimsArr: unknown[] = Array.isArray(data.claims) ? data.claims as unknown[] : []
  const anchorsArr: unknown[] = Array.isArray(data.identity_anchors) ? data.identity_anchors as unknown[] : []

  const doImport = db.transaction(() => {
    for (const item of memoriesArr) {
      if (!item || typeof item !== 'object') continue
      const m = item as Record<string, unknown>
      if (!m.id || !m.type || !m.created_at) {
        result.errors.push(`Skipped memory missing required fields: ${JSON.stringify(m).slice(0, 80)}`)
        continue
      }
      try {
        insertMemory.run({
          id: m.id,
          type: m.type,
          content: m.content ?? '',
          meaning: m.meaning ?? null,
          relationship_effect: m.relationship_effect ?? null,
          source_refs: JSON.stringify(m.source_refs ?? []),
          created_at: m.created_at,
          updated_at: m.updated_at ?? null,
          status: m.status ?? 'active',
          visibility: m.visibility ?? 'shared',
          tags: JSON.stringify(m.tags ?? []),
          promise_status: m.promise_status ?? null,
          due_hint: m.due_hint ?? null,
          fulfilled_at: m.fulfilled_at ?? null,
        })
        result.memories_imported++
      } catch (e: any) {
        result.errors.push(`Memory ${m.id}: ${e.message}`)
      }
    }

    for (const item of claimsArr) {
      if (!item || typeof item !== 'object') continue
      const c = item as Record<string, unknown>
      if (!c.claim_id) {
        result.errors.push('Skipped claim missing claim_id')
        continue
      }
      try {
        insertClaim.run({
          claim_id: c.claim_id,
          subject: c.subject ?? '',
          predicate: c.predicate ?? '',
          value: c.value ?? '',
          source_actor: c.source_actor ?? 'import',
          source_seq: c.source_seq ?? 0,
          evidence: c.evidence ?? '',
          confidence: c.confidence ?? 0.5,
          status: c.status ?? 'candidate',
          suspected_typo: c.suspected_typo ? 1 : 0,
          valid_from: c.valid_from ?? null,
          valid_to: c.valid_to ?? null,
          superseded_by: c.superseded_by ?? null,
          created_at: c.created_at ?? new Date().toISOString(),
        })
        result.claims_imported++
      } catch (e: any) {
        result.errors.push(`Claim ${c.claim_id}: ${e.message}`)
      }
    }

    for (const item of anchorsArr) {
      if (!item || typeof item !== 'object') continue
      const a = item as Record<string, unknown>
      if (!a.anchor_id) {
        result.errors.push('Skipped anchor missing anchor_id')
        continue
      }
      try {
        insertAnchor.run({
          anchor_id: a.anchor_id,
          anchor: a.anchor ?? '',
          current_value: a.current_value ?? '',
          status: a.status ?? 'stable',
          revisions: JSON.stringify(a.revisions ?? []),
          created_at: a.created_at ?? new Date().toISOString(),
        })
        result.anchors_imported++
      } catch (e: any) {
        result.errors.push(`Anchor ${a.anchor_id}: ${e.message}`)
      }
    }
  })

  doImport()
  return result
}
