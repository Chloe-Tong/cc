import { useState } from 'react'
import type { Memory } from '../../types/memory'
import MemoryDetailModal from './MemoryDetailModal'

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  fact:                            { label: '事实',    color: '#7a5a50', bg: '#ead8d0' },
  episodic:                        { label: '情景',    color: '#6a5070', bg: '#e0d4e4' },
  relationship:                    { label: '关系',    color: '#506070', bg: '#d4dce4' },
  promise:                         { label: '承诺',    color: '#70504a', bg: '#e8d4ce' },
  private_psychology:              { label: '私人心理', color: '#7a5060', bg: '#e8d4da' },
  relationship_self_understanding: { label: '关系理解', color: '#685068', bg: '#e4d4e4' },
  historical_psychology:           { label: '历史心理', color: '#6a5858', bg: '#e4d8d4' },
}

function highlightText(text: string, query: string) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: '#d8c0b8', color: '#2e2020', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
          : part
      )}
    </>
  )
}

interface Props {
  memory: Memory
  showType?: boolean
  highlight?: string
}

export default function MemoryCard({ memory, showType = true, highlight = '' }: Props) {
  const [open, setOpen] = useState(false)
  const cfg = typeConfig[memory.type] || typeConfig.fact
  const dateStr = new Date(memory.updated_at || memory.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <>
      <div
        className="card p-4 cursor-pointer transition-all"
        onClick={() => setOpen(true)}
        style={{ userSelect: 'none' }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(196,168,158,0.35)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {showType && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="tag font-hand" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '70' }}>
                  {cfg.label}
                </span>
                {memory.tags?.map((tag) => (
                  <span key={tag} className="font-hand text-xs px-2 py-0.5 rounded-full"
                    style={{ color: '#7a5a54', background: '#e8d8d0', border: '1px solid #c4aea8' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm leading-relaxed" style={{ color: '#2e2020' }}>
              {highlightText(memory.content, highlight)}
            </p>

            {memory.meaning && (
              <div className="mt-2.5 pl-3" style={{ borderLeft: '2px solid #c4aea8' }}>
                <p className="text-xs leading-relaxed italic" style={{ color: '#6a4a44' }}>
                  {highlightText(memory.meaning, highlight)}
                </p>
              </div>
            )}

            {memory.relationship_effect && (
              <p className="mt-2 text-xs leading-relaxed font-hand" style={{ color: '#b09088' }}>
                ↳ {memory.relationship_effect}
              </p>
            )}

            {memory.source_refs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {memory.source_refs.map((ref) => (
                  <span key={ref.seq}
                    className="font-hand text-sm px-2.5 py-0.5 rounded-full"
                    style={{ background: '#ede0d8', border: '1px solid #c4aea8', color: '#7a5a54' }}>
                    #{ref.seq}
                    {ref.preview && <span style={{ opacity: 0.6 }}> · {ref.preview.slice(0, 10)}…</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <p className="font-hand text-sm" style={{ color: '#b09088' }}>{dateStr}</p>
            <span className="text-xs" style={{ color: '#c4aea8', opacity: 0.7 }}>点击查看</span>
          </div>
        </div>
      </div>

      {open && (
        <MemoryDetailModal
          memory={memory as any}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
