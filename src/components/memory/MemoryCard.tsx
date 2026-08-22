import type { Memory } from '../../types/memory'

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  fact:                            { label: '事实',    color: '#a05878', bg: '#fde8f2' },
  episodic:                        { label: '情景',    color: '#8050a0', bg: '#f0e8f8' },
  relationship:                    { label: '关系',    color: '#7060b0', bg: '#eae8f8' },
  promise:                         { label: '承诺',    color: '#a06050', bg: '#fdecea' },
  private_psychology:              { label: '私人心理', color: '#c05880', bg: '#fde0ec' },
  relationship_self_understanding: { label: '关系理解', color: '#906090', bg: '#f4e8f4' },
  historical_psychology:           { label: '历史心理', color: '#907080', bg: '#f4eaf0' },
}

function highlightText(text: string, query: string) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: '#fac8dc', color: '#2e1a24', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
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
              <span className="tag font-hand" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '60' }}>
                {cfg.label}
              </span>
              {memory.tags?.map((tag) => (
                <span key={tag} className="font-hand text-xs px-2 py-0.5 rounded-full"
                  style={{ color: '#c05878', background: '#fde8f2', border: '1px solid #f0c4d4' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm leading-relaxed" style={{ color: '#2e1a24' }}>
            {highlightText(memory.content, highlight)}
          </p>

          {memory.meaning && (
            <div className="mt-2.5 pl-3" style={{ borderLeft: '2px solid #f0c4d4' }}>
              <p className="text-xs leading-relaxed italic" style={{ color: '#9060780' }}>
                {highlightText(memory.meaning, highlight)}
              </p>
            </div>
          )}

          {memory.relationship_effect && (
            <p className="mt-2 text-xs leading-relaxed font-hand" style={{ color: '#c090a8' }}>
              ↳ {memory.relationship_effect}
            </p>
          )}

          {memory.source_refs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memory.source_refs.map((ref) => (
                <button key={ref.seq}
                  className="font-hand text-sm px-2.5 py-0.5 rounded-full transition-all"
                  style={{ background: '#fde8f2', border: '1px solid #f0c4d4', color: '#c05878' }}>
                  #{ref.seq}
                  {ref.preview && <span style={{ opacity: 0.6 }}> · {ref.preview.slice(0, 10)}…</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="font-hand text-sm shrink-0" style={{ color: '#c090a8' }}>{dateStr}</p>
      </div>
    </div>
  )
}
