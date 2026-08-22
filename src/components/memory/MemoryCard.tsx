import type { Memory } from '../../types/memory'

const typeLabels: Record<string, string> = {
  fact: '事实',
  episodic: '情景',
  relationship: '关系',
  promise: '承诺',
  private_psychology: '私人心理',
  relationship_self_understanding: '关系理解',
  historical_psychology: '历史心理',
}

const typeColors: Record<string, string> = {
  fact: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  episodic: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  relationship: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  promise: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  private_psychology: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  relationship_self_understanding: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  historical_psychology: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

interface Props {
  memory: Memory
  showType?: boolean
  highlight?: string
}

function highlightText(text: string, query: string) {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-rose-500/30 text-rose-200 rounded px-0.5">{part}</mark>
      : part
  )
}

export default function MemoryCard({ memory, showType = true, highlight = '' }: Props) {
  const typeColor = typeColors[memory.type] || typeColors.fact
  const typeLabel = typeLabels[memory.type] || memory.type

  const date = memory.updated_at || memory.created_at
  const dateStr = new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <div className="group bg-white/[0.03] border border-white/6 rounded-xl p-4 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-150">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {showType && (
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeColor}`}>
                {typeLabel}
              </span>
              {memory.tags?.map((tag) => (
                <span key={tag} className="text-xs text-zinc-600 px-1.5 py-0.5 bg-white/4 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-zinc-200 leading-relaxed">
            {highlightText(memory.content, highlight)}
          </p>

          {memory.meaning && (
            <div className="mt-2.5 pl-3 border-l-2 border-zinc-700">
              <p className="text-xs text-zinc-400 leading-relaxed italic">
                {highlightText(memory.meaning, highlight)}
              </p>
            </div>
          )}

          {memory.relationship_effect && (
            <p className="mt-2 text-xs text-rose-400/80 leading-relaxed">
              ↳ {memory.relationship_effect}
            </p>
          )}

          {memory.source_refs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memory.source_refs.map((ref) => (
                <button
                  key={ref.seq}
                  title={ref.preview}
                  className="text-xs text-zinc-500 hover:text-zinc-300 bg-white/4 hover:bg-white/8 px-2 py-0.5 rounded-full transition-colors"
                >
                  #{ref.seq}
                  {ref.preview && <span className="ml-1 opacity-60">· {ref.preview.slice(0, 12)}…</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-zinc-600">{dateStr}</p>
        </div>
      </div>
    </div>
  )
}
