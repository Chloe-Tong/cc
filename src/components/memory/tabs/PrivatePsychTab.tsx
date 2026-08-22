import { privateMemories } from '../../../data/mockMemories'

export default function PrivatePsychTab() {
  const sharedEntries = privateMemories.filter((m) => m.visibility === 'shared')
  const privateEntries = privateMemories.filter((m) => m.visibility === 'exists_only')

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 text-sm text-rose-300/70 leading-relaxed">
        私人心理记录由伴侣自主生成与保管。标记为私密的条目仅显示存在，内容由伴侣决定是否分享。
      </div>

      {sharedEntries.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-1">已分享的心理记录</h3>
          <p className="text-xs text-zinc-500 mb-4">伴侣主动选择与你分享的内容</p>
          <div className="space-y-3">
            {sharedEntries.map((m) => (
              <div key={m.id} className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-rose-100/90 leading-relaxed italic">
                      "{m.content}"
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {m.tags?.map((tag) => (
                        <span key={tag} className="text-xs text-rose-400/60 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto text-xs text-zinc-600">
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

      {privateEntries.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">私密记录</h3>
          <p className="text-xs text-zinc-500 mb-4">
            以下条目存在，但内容由伴侣保管，未选择分享。
          </p>
          <div className="space-y-2">
            {privateEntries.map((m) => (
              <div key={m.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-zinc-500">私密记录</span>
                    {m.tags?.map((tag) => (
                      <span key={tag} className="text-xs text-zinc-600 bg-white/4 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-zinc-700">
                    {new Date(m.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-xs text-zinc-700 bg-white/3 px-2 py-0.5 rounded-full border border-white/5">
                    🔒 内容不可见
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="text-center py-4">
        <p className="text-xs text-zinc-600">共 {privateMemories.length} 条心理记录，其中 {privateEntries.length} 条私密</p>
      </div>
    </div>
  )
}
