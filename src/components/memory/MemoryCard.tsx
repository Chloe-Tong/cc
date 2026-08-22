import type { Memory } from '../../types/memory'

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  fact:                        { label: '事实',   color: '#4c6244', bg: '#d2dece' },
  episodic:                    { label: '情景',   color: '#5e4a2a', bg: '#e8dcc8' },
  relationship:                { label: '关系',   color: '#2a4a5e', bg: '#c8d8e8' },
  promise:                     { label: '承诺',   color: '#3a5a40', bg: '#c8e0cc' },
  private_psychology:          { label: '私人心理', color: '#5e2a3a', bg: '#e8c8d0' },
  relationship_self_understanding: { label: '关系理解', color: '#4a3a5e', bg: '#d8d0e8' },
  historical_psychology:       { label: '历史心理', color: '#4a4a3a', bg: '#deded2' },
}

function highlightText(text: string, query: string) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: '#c4983a', color: '#1e2118', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
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
                  style={{ color: '#5e7a55', background: '#c8d5c2', border: '1px solid #93af8b' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm leading-relaxed" style={{ color: '#1e2118' }}>
            {highlightText(memory.content, highlight)}
          </p>

          {memory.meaning && (
            <div className="mt-2.5 pl-3" style={{ borderLeft: '3px solid #c4983a' }}>
              <p className="text-xs leading-relaxed italic" style={{ color: '#4c6244' }}>
                {highlightText(memory.meaning, highlight)}
              </p>
            </div>
          )}

          {memory.relationship_effect && (
            <p className="mt-2 text-xs leading-relaxed font-hand text-base"
              style={{ color: '#5e7a55' }}>
              ↳ {memory.relationship_effect}
            </p>
          )}

          {memory.source_refs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memory.source_refs.map((ref) => (
                <button key={ref.seq}
                  className="font-hand text-sm px-2.5 py-0.5 rounded-full transition-all"
                  style={{
                    background: '#e8ede4', border: '1px solid #93af8b',
                    color: '#5e7a55', boxShadow: '1px 1px 0 #93af8b',
                  }}>
                  #{ref.seq}
                  {ref.preview && <span style={{ opacity: 0.6 }}> · {ref.preview.slice(0, 10)}…</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="font-hand text-sm shrink-0" style={{ color: '#93af8b' }}>{dateStr}</p>
      </div>
    </div>
  )
}
