import { useState, useEffect } from 'react'
import { api, onWsEvent } from '../../../api/client'
import type { Memory } from '../../../types/memory'
import MemoryCard from '../MemoryCard'
import TagFilterBar, { extractTags, filterByTags } from '../TagFilterBar'
import EmptyState from '../EmptyState'

interface Props { search: string }

export default function EpisodicTab({ search }: Props) {
  const [episodes, setEpisodes]     = useState<Memory[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedTags, setSelected] = useState<string[]>([])

  const load = () => api.getEpisodic(search || undefined).then(setEpisodes).finally(() => setLoading(false))

  useEffect(() => { load() }, [search])
  useEffect(() => onWsEvent((e: any) => {
    if (e.type === 'memory_deleted' || e.type === 'import_complete') load()
  }), [])

  if (loading) return <div className="px-6 py-12 font-hand text-center" style={{ color: '#c4aea8' }}>加载中…</div>

  const visible = filterByTags(episodes, selectedTags)

  return (
    <div className="px-6 py-6 max-w-3xl">
      <p className="text-sm mb-4" style={{ color: '#b09088' }}>
        具体共同经历的记录，按时间倒序排列，附原始消息来源。
      </p>
      <TagFilterBar
        allTags={extractTags(episodes)}
        selected={selectedTags}
        onToggle={(t) => setSelected((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
        onClear={() => setSelected([])}
      />

      {episodes.length === 0 && (
        <EmptyState icon="📷" title="还没有情景记忆"
          subtitle="每一次共同经历都会被记录在这条时间线上" />
      )}
      {episodes.length > 0 && visible.length === 0 && (
        <EmptyState icon="🔍" title="没有找到匹配的记忆"
          subtitle={selectedTags.length > 0 ? '换个标签试试' : '试试其他关键词'} />
      )}

      <div className="relative pl-8">
        <div className="absolute left-3 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: 'linear-gradient(to bottom, #c4aea8, #d4bab6, transparent)' }} />
        <div className="space-y-5">
          {visible.map((m) => (
            <div key={m.id} className="relative">
              <div className="absolute -left-8 top-4 w-3 h-3 rounded-full"
                style={{ background: '#c4aea8', border: '2px solid #f5ede6' }} />
              <p className="font-hand text-sm mb-1.5" style={{ color: '#b09088' }}>
                {new Date(m.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <MemoryCard memory={m} showType={false} highlight={search} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
