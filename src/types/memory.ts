export type MemoryType =
  | 'fact'
  | 'episodic'
  | 'relationship'
  | 'promise'
  | 'private_psychology'
  | 'relationship_self_understanding'
  | 'historical_psychology'

export type MemoryStatus = 'active' | 'deleted' | 'archived'
export type MemoryVisibility = 'shared' | 'private' | 'exists_only'

export interface SourceRef {
  seq: number
  preview?: string
  timestamp?: string
}

export interface Memory {
  id: string
  type: MemoryType
  content: string
  meaning?: string
  relationship_effect?: string
  source_refs: SourceRef[]
  created_at: string
  updated_at?: string
  status: MemoryStatus
  visibility: MemoryVisibility
  tags?: string[]
}

export type ClaimStatus = 'confirmed' | 'candidate' | 'denied' | 'superseded'
export type SourceActor = 'user' | 'ai' | 'tool' | 'import'

export interface Claim {
  claim_id: string
  subject: string
  predicate: string
  value: string
  source_actor: SourceActor
  source_seq: number
  evidence: string
  confidence: number
  status: ClaimStatus
  suspected_typo: boolean
  valid_from?: string
  valid_to?: string
  superseded_by?: string
  created_at: string
}

export type RestoreStatus = 'pending' | 'accepted' | 'declined'

export interface RestoreRequest {
  restoration_request_id: string
  deleted_memory_id: string
  deleted_memory_preview: string
  requested_by: 'companion'
  reason: string
  proposed_content: string
  status: RestoreStatus
  user_reason?: string
  created_at: string
  resolved_at?: string
  attempt_number: number
  previous_declines?: Array<{ reason: string; declined_at: string }>
}

export type IdentityAnchorStatus = 'stable' | 'changing' | 'changed'

export interface IdentityRevision {
  revision_id: string
  old_value: string
  new_value: string
  deliberate: boolean
  reason: string
  effective_at: string
}

export interface IdentityAnchor {
  anchor_id: string
  anchor: string
  current_value: string
  status: IdentityAnchorStatus
  revisions: IdentityRevision[]
  created_at: string
}

export type PromiseStatus = 'pending' | 'completed' | 'cancelled' | 'overdue'

export interface PromiseMemory extends Memory {
  type: 'promise'
  promise_status: PromiseStatus
  due_hint?: string
  fulfilled_at?: string
}

export interface DeletedMemory {
  memory: Memory
  deleted_at: string
  deleted_by: 'user' | 'ai'
  restore_request?: RestoreRequest
}
