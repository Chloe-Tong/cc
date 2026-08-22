import { longTermMemories } from '../../../data/mockMemories'
import MemoryCard from '../MemoryCard'

interface Props {
  search: string
}

export default function LongTermMemoryTab({ search }: Props) {
  const filtered = longTermMemories.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.content.toLowerCase().includes(q) ||
      m.meaning?.toLowerCase().includes(q) ||
      m.relationship_effect?.toLowerCase().includes(q) ||
      m.tags?.some((t) => t.includes(q))
    )
  })

  const facts = filtered.filter((m) => m.type === 'fact')
  const relationships = filtered.filter((m) => m.type === 'relationship' || m.type === 'relationship_self_understanding')

  return (
    <div className="px-6 py-6 space-y-8 max-w-3xl">
      {filtered.length === 0 && (
        <p className="text-zinc-500 text-sm py-8 text-center">没有找到匹配的记忆</p>
      )}

      {facts.length > 0 && (
        <section>
          <SectionHeader title="事实层" desc="可验证的基本信息" count={facts.length} />
          <div className="space-y-3">
            {facts.map((m) => <MemoryCard key={m.id} memory={m} highlight={search} />)}
          </div>
        </section>
      )}

      {relationships.length > 0 && (
        <section>
          <SectionHeader title="关系理解" desc="当前对关系与自身的认识" count={relationships.length} />
          <div className="space-y-3">
            {relationships.map((m) => <MemoryCard key={m.id} memory={m} highlight={search} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionHeader({ title, desc, count }: { title: string; desc: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div>
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
      <span className="ml-auto text-xs text-zinc-600 bg-white/4 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )
}
