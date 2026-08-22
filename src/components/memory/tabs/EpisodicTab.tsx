import { longTermMemories } from '../../../data/mockMemories'
import MemoryCard from '../MemoryCard'

interface Props { search: string }

export default function EpisodicTab({ search }: Props) {
  const episodes = longTermMemories
    .filter((m) => m.type === 'episodic')
    .filter((m) => {
      if (!search) return true
      const q = search.toLowerCase()
      return m.content.toLowerCase().includes(q) || m.meaning?.toLowerCase().includes(q)
    })

  return (
    <div className="px-6 py-6 max-w-3xl">
      <p className="text-sm mb-6" style={{ color: '#b09088' }}>
        具体共同经历的记录，按时间倒序排列，附原始消息来源。
      </p>

      {episodes.length === 0 && (
        <p className="font-hand text-lg text-center py-12" style={{ color: '#c4aea8' }}>
          没有找到匹配的情景记忆
        </p>
      )}

      <div className="relative pl-8">
        <div className="absolute left-3 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: 'linear-gradient(to bottom, #c4aea8, #d4bab6, transparent)' }} />
        <div className="space-y-5">
          {episodes.map((m) => (
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
