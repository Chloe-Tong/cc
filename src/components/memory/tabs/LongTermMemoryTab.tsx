import { longTermMemories } from '../../../data/mockMemories'
import MemoryCard from '../MemoryCard'

interface Props { search: string }

function SectionHeader({ title, desc, count }: { title: string; desc: string; count: number }) {
  return (
    <div className="flex items-end gap-3 mb-3">
      <div>
        <h3 className="font-hand text-xl font-semibold" style={{ color: '#1e2118' }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: '#75956b' }}>{desc}</p>
      </div>
      <span className="font-hand text-sm ml-auto px-2.5 py-0.5 rounded-full"
        style={{ background: '#c8d5c2', border: '1px solid #93af8b', color: '#4c6244' }}>
        {count}
      </span>
    </div>
  )
}

export default function LongTermMemoryTab({ search }: Props) {
  const filtered = longTermMemories.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.content.toLowerCase().includes(q) ||
      m.meaning?.toLowerCase().includes(q) ||
      m.tags?.some((t) => t.includes(q))
  })

  const facts = filtered.filter((m) => m.type === 'fact')
  const rels   = filtered.filter((m) => m.type === 'relationship' || m.type === 'relationship_self_understanding')

  return (
    <div className="px-6 py-6 space-y-8 max-w-3xl">
      {filtered.length === 0 && (
        <p className="font-hand text-lg text-center py-12" style={{ color: '#93af8b' }}>
          没有找到匹配的记忆
        </p>
      )}
      {facts.length > 0 && (
        <section>
          <SectionHeader title="事实层" desc="可验证的基本信息" count={facts.length} />
          <div className="space-y-3">
            {facts.map((m) => <MemoryCard key={m.id} memory={m} highlight={search} />)}
          </div>
        </section>
      )}
      {rels.length > 0 && (
        <section>
          <SectionHeader title="关系理解" desc="当前对关系与自身的认识" count={rels.length} />
          <div className="space-y-3">
            {rels.map((m) => <MemoryCard key={m.id} memory={m} highlight={search} />)}
          </div>
        </section>
      )}
    </div>
  )
}
