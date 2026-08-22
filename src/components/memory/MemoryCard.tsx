import type { Memory } from '../../types/memory'

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  fact:                            { label: '事实',    color: '#4a5a3a', bg: '#d8e4d0' },
  episodic:                        { label: '情景',    color: '#6a3a4a', bg: '#e8d4d8' },
  relationship:                    { label: '关系',    color: '#4a3a6a', bg: '#dcd4e8' },
  promise:                         { label: '承诺',    color: '#5a3a3a', bg: '#e8d8d4' },
  private_psychology:              { label: '私人心理', color: '#7a3a50', bg: '#f0d4dc' },
  relationship_self_understanding: { label: '关系理解', color: '#5a3a5a', bg: '#e8d4e8' },
  historical_psychology:           { label: '历史心理', color: '#5a4a4a', bg: '#e4d8d8' },
}

function highlightText(text: string, query: string) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: '#d4b0b8', color: '#261a1a', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
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
  const cfg = typeConfig[memory.type] || typeConfig.fact
  const dateStr = new Date(memory.updated_at || memory.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {showType && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="tag font-hand" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color }}>
                {cfg.label}
              </span>
              {memory.tags?.map((tag) => (
                <span key={tag} className="font-hand text-xs px-2 py-0.5 rounded-full"
                  style={{ color: '#7a5050', background: '#ead8d8', border: '1px solid #c4a4a4' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm leading-relaxed" style={{ color: '#261a1a' }}>
            {highlightText(memory.content, highlight)}
          </p>

          {memory.meaning && (
            <div className="mt-2.5 pl-3" style={{ borderLeft: '3px solid #c0a4a8' }}>
              <p className="text-xs leading-relaxed italic" style={{ color: '#604848' }}>
                {highlightText(memory.meaning, highlight)}
              </p>
            </div>
          )}

          {memory.relationship_effect && (
            <p className="mt-2 text-xs leading-relaxed font-hand text-base" style={{ color: '#906868' }}>
              ↳ {memory.relationship_effect}
            </p>
          )}

          {memory.source_refs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memory.source_refs.map((ref) => (
                <button key={ref.seq}
                  className="font-hand text-sm px-2.5 py-0.5 rounded-full transition-all"
                  style={{ background: '#f0e8e8', border: '1px solid #c4a4a4', color: '#7a5050', boxShadow: '1px 1px 0 #c4a4a4' }}>
                  #{ref.seq}
                  {ref.preview && <span style={{ opacity: 0.6 }}> · {ref.preview.slice(0, 10)}…</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="font-hand text-sm shrink-0" style={{ color: '#b09090' }}>{dateStr}</p>
      </div>
    </div>
  )
}
