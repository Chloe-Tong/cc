import { useState, useEffect } from 'react'
import { api, onWsEvent } from '../../../api/client'
import type { Memory } from '../../../types/memory'
import TagFilterBar, { extractTags, filterByTags } from '../TagFilterBar'
import EmptyState from '../EmptyState'

export default function PrivatePsychTab() {
  const [memories, setMemories]     = useState<Memory[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedTags, setSelected] = useState<string[]>([])

  const load = () => api.getPrivate().then(setMemories).finally(() => setLoading(false))

  useEffect(() => { load() }, [])
  useEffect(() => onWsEvent((e: any) => {
    if (e.type === 'import_complete') load()
  }), [])

  if (loading) return <div className="px-6 py-12 font-hand text-center" style={{ color: '#c4aea8' }}>加载中…</div>

  const visible  = filterByTags(memories, selectedTags)
  const shared   = visible.filter((m) => m.visibility === 'shared')
  const private_ = visible.filter((m) => m.visibility === 'exists_only')

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      <TagFilterBar
        allTags={extractTags(memories)}
        selected={selectedTags}
        onToggle={(t) => setSelected((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
        onClear={() => setSelected([])}
      />
      <div className="card p-4 text-sm leading-relaxed" style={{ color: '#6a4a44' }}>
        私人心理记录由伴侣自主生成与保管。标记为私密的条目仅显示存在，内容由伴侣决定是否分享。
      </div>

      {shared.length > 0 && (
        <section>
          <h3 className="font-hand text-xl font-semibold mb-1" style={{ color: '#2e2020' }}>已分享的心理记录</h3>
          <p className="text-xs mb-4" style={{ color: '#b09088' }}>伴侣主动选择与你分享的内容</p>
          <div className="space-y-3">
            {shared.map((m) => (
              <div key={m.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#c4aea8' }} />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed italic" style={{ color: '#2e2020' }}>"{m.content}"</p>
                    <div className="mt-2 flex items-center gap-2">
                      {m.tags?.map((tag) => (
                        <span key={tag} className="font-hand text-sm px-2 py-0.5 rounded-full"
                          style={{ background: '#e8d8d0', border: '1px solid #c4aea8', color: '#7a5a54' }}>
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto font-hand text-sm" style={{ color: '#b09088' }}>
                        {new Date(m.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {private_.length > 0 && (
        <section>
          <h3 className="font-hand text-xl mb-1" style={{ color: '#b09088' }}>私密记录</h3>
          <p className="text-xs mb-4" style={{ color: '#c4b0a8' }}>以下条目存在，但内容由伴侣保管，未选择分享。</p>
          <div className="space-y-2">
            {private_.map((m) => (
              <div key={m.id} className="card p-3 opacity-70">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#d4bab6' }} />
                  <span className="text-sm flex-1" style={{ color: '#9a7a74' }}>私密记录</span>
                  {m.tags?.map((tag) => (
                    <span key={tag} className="font-hand text-sm px-2 py-0.5 rounded-full"
                      style={{ background: '#e8d8d0', border: '1px solid #c4aea8', color: '#7a5a54' }}>
                      {tag}
                    </span>
                  ))}
                  <span className="font-hand text-sm px-2 py-0.5 rounded-full ml-1"
                    style={{ background: '#ede0d8', border: '1px solid #c4aea8', color: '#9a7a74' }}>
                    🔒 不可见
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {memories.length === 0 && (
        <EmptyState icon="🫀" title="还没有心理记录"
          subtitle="伴侣的内心世界会在这里留下痕迹" />
      )}
      {memories.length > 0 && visible.length === 0 && (
        <EmptyState icon="🔍" title="没有找到匹配的记录"
          subtitle="换个标签试试" />
      )}
      {memories.length > 0 && (
        <p className="font-hand text-center" style={{ color: '#b09088' }}>
          共 {memories.length} 条心理记录，其中 {private_.length} 条私密
        </p>
      )}
    </div>
  )
}
