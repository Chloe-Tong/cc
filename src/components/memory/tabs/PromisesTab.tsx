import { promiseMemories } from '../../../data/mockMemories'

interface Props {
  search: string
}

const statusConfig = {
  pending: { label: '待跟进', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  completed: { label: '已完成', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  cancelled: { label: '已取消', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
  overdue: { label: '已过期', color: 'text-red-300 bg-red-500/10 border-red-500/20' },
}

export default function PromisesTab({ search }: Props) {
  const promises = promiseMemories.filter((m) => {
    if (!search) return true
    return m.content.toLowerCase().includes(search.toLowerCase())
  })

  const pending = promises.filter((m: any) => !m.promise_status || m.promise_status === 'pending')
  const done = promises.filter((m: any) => m.promise_status === 'completed' || m.promise_status === 'cancelled')

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      {pending.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-1">待跟进</h3>
          <p className="text-xs text-zinc-500 mb-4">已答应但尚未完成的事项</p>
          <div className="space-y-3">
            {pending.map((m) => {
              const ps = (m as any).promise_status || 'pending'
              const cfg = statusConfig[ps as keyof typeof statusConfig] || statusConfig.pending
              return (
                <div key={m.id} className="bg-white/[0.03] border border-white/6 rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-zinc-200 leading-relaxed">{m.content}</p>
                      {(m as any).due_hint && (
                        <p className="mt-2 text-xs text-amber-400/70">
                          📅 时间参考：{(m as any).due_hint}
                        </p>
                      )}
                      {m.source_refs.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {m.source_refs.map((ref) => (
                            <button key={ref.seq} className="text-xs text-zinc-500 hover:text-zinc-300 bg-white/4 px-2 py-0.5 rounded-full transition-colors">
                              #{ref.seq}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-3">已完成 / 已取消</h3>
          <div className="space-y-2 opacity-60">
            {done.map((m) => {
              const ps = (m as any).promise_status || 'pending'
              const cfg = statusConfig[ps as keyof typeof statusConfig] || statusConfig.completed
              return (
                <div key={m.id} className="bg-white/[0.02] border border-white/4 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <p className="flex-1 text-sm text-zinc-400 leading-relaxed line-through">{m.content}</p>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {promises.length === 0 && (
        <p className="text-zinc-500 text-sm py-8 text-center">没有找到匹配的承诺记录</p>
      )}
    </div>
  )
}
