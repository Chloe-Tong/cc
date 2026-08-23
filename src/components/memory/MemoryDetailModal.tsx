import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Memory } from '../../types/memory'

const typeLabel: Record<string, string> = {
  fact:                            '事实',
  episodic:                        '情景记忆',
  relationship:                    '关系',
  promise:                         '承诺',
  private_psychology:              '私人心理',
  relationship_self_understanding: '关系理解',
  historical_psychology:           '历史心理',
}

const visibilityLabel: Record<string, string> = {
  shared:       '共享',
  private:      '私有',
  exists_only:  '仅存在',
}

const promiseStatusLabel: Record<string, string> = {
  pending:   '待完成',
  completed: '已完成',
  cancelled: '已取消',
  overdue:   '已逾期',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-hand text-xs mb-1" style={{ color: '#b09088' }}>{label}</p>
      <div className="text-sm leading-relaxed" style={{ color: '#2e2020' }}>{children}</div>
    </div>
  )
}

interface Props {
  memory: Memory & {
    promise_status?: string
    due_hint?: string
    fulfilled_at?: string
  }
  onClose: () => void
}

export default function MemoryDetailModal({ memory, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const createdStr = new Date(memory.created_at).toLocaleString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const updatedStr = memory.updated_at
    ? new Date(memory.updated_at).toLocaleString('zh-CN', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(46,32,32,0.35)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#f5ede6',
          border: '1.5px solid #c4aea8',
          boxShadow: '0 8px 40px rgba(46,32,32,0.18)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(196,168,158,0.40)' }}>
          <span className="font-hand text-sm px-2.5 py-0.5 rounded-full"
            style={{ background: '#e8d8d0', border: '1px solid #c4aea8', color: '#7a5a54' }}>
            {typeLabel[memory.type] ?? memory.type}
          </span>
          {memory.tags?.map((tag) => (
            <span key={tag} className="font-hand text-xs px-2 py-0.5 rounded-full"
              style={{ background: '#ede0d8', border: '1px solid #d4bab6', color: '#9a7a74' }}>
              {tag}
            </span>
          ))}
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(196,168,158,0.30)', color: '#7a5a54' }}
            aria-label="关闭">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Main content */}
          <Field label="内容">
            <p className="leading-relaxed">{memory.content}</p>
          </Field>

          {memory.meaning && (
            <Field label="意义">
              <p className="leading-relaxed italic" style={{ color: '#6a4a44' }}>{memory.meaning}</p>
            </Field>
          )}

          {memory.relationship_effect && (
            <Field label="对关系的影响">
              <p className="leading-relaxed">{memory.relationship_effect}</p>
            </Field>
          )}

          {/* Promise fields */}
          {memory.promise_status && (
            <div className="flex gap-4">
              <Field label="承诺状态">
                <span>{promiseStatusLabel[memory.promise_status] ?? memory.promise_status}</span>
              </Field>
              {memory.due_hint && (
                <Field label="截止提示">
                  <span>{memory.due_hint}</span>
                </Field>
              )}
              {memory.fulfilled_at && (
                <Field label="完成时间">
                  <span>{new Date(memory.fulfilled_at).toLocaleDateString('zh-CN')}</span>
                </Field>
              )}
            </div>
          )}

          {/* Source refs */}
          {memory.source_refs.length > 0 && (
            <Field label="来源对话">
              <div className="space-y-1.5 mt-1">
                {memory.source_refs.map((ref) => (
                  <div key={ref.seq}
                    className="flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs"
                    style={{ background: '#ede0d8', border: '1px solid #d4bab6' }}>
                    <span className="font-hand shrink-0" style={{ color: '#9a7a74' }}>#{ref.seq}</span>
                    {ref.preview && (
                      <span className="flex-1 italic" style={{ color: '#4c3a38' }}>{ref.preview}</span>
                    )}
                    {ref.timestamp && (
                      <span className="shrink-0" style={{ color: '#b09088' }}>
                        {new Date(ref.timestamp).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Field>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 pt-2"
            style={{ borderTop: '1px solid rgba(196,168,158,0.30)' }}>
            <Field label="可见性">
              <span>{visibilityLabel[memory.visibility] ?? memory.visibility}</span>
            </Field>
            <Field label="ID">
              <span className="font-mono text-xs" style={{ color: '#9a7a74' }}>{memory.id}</span>
            </Field>
            <Field label="创建时间">
              <span className="text-xs">{createdStr}</span>
            </Field>
            {updatedStr && (
              <Field label="最后更新">
                <span className="text-xs">{updatedStr}</span>
              </Field>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
