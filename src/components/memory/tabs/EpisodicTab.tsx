import { longTermMemories } from '../../../data/mockMemories'
import MemoryCard from '../MemoryCard'

interface Props {
  search: string
}

export default function EpisodicTab({ search }: Props) {
  const episodes = longTermMemories.filter((m) => m.type === 'episodic').filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.content.toLowerCase().includes(q) || m.meaning?.toLowerCase().includes(q)
  })

  return (
    <div className="px-6 py-6 max-w-3xl">
      <p className="text-xs text-zinc-500 mb-5">
        具体共同经历的记录。按时间倒序排列，每条记忆附原始消息来源。
      </p>

      {episodes.length === 0 && (
        <p className="text-zinc-500 text-sm py-8 text-center">没有找到匹配的情景记忆</p>
      )}

      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-rose-500/20 via-zinc-700/40 to-transparent" />
        <div className="space-y-4 pl-8">
          {episodes.map((m) => (
            <div key={m.id} className="relative">
              <div className="absolute -left-8 top-4 w-2.5 h-2.5 rounded-full bg-rose-500/60 border-2 border-[#0d0d0f] shadow-lg shadow-rose-900/40" />
              <div className="text-xs text-zinc-500 mb-1.5">
                {new Date(m.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </div>
              <MemoryCard memory={m} showType={false} highlight={search} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
