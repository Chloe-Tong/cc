import { useState, useEffect } from 'react'
import { api, onWsEvent } from '../../../api/client'
import type { Memory } from '../../../types/memory'
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
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading]   = useState(true)

  const load = () => api.getLongterm(search || undefined).then(setMemories).finally(() => setLoading(false))

  useEffect(() => { load() }, [search])
  useEffect(() => onWsEvent((e: any) => {
    if (e.type === 'memory_deleted' || e.type === 'import_complete') load()
  }), [])

  if (loading) return <div className="px-6 py-12 font-hand text-center" style={{ color: '#93af8b' }}>加载中…</div>

  const facts = memories.filter((m) => m.type === 'fact')
  const rels   = memories.filter((m) => m.type === 'relationship' || m.type === 'relationship_self_understanding')

  return (
    <div className="px-6 py-6 space-y-8 max-w-3xl">
      {memories.length === 0 && (
        <p className="font-hand text-lg text-center py-12" style={{ color: '#93af8b' }}>没有找到匹配的记忆</p>
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
