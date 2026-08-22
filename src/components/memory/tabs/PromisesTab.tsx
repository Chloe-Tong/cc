import { promiseMemories } from '../../../data/mockMemories'

interface Props { search: string }

const statusCfg = {
  pending:   { label: '待跟进', color: '#5e4a2a', bg: '#e8dcc8', border: '#c4983a' },
  completed: { label: '已完成', color: '#3a5a40', bg: '#c8e0cc', border: '#5e7a55' },
  cancelled: { label: '已取消', color: '#4a4a3a', bg: '#deded2', border: '#93af8b' },
  overdue:   { label: '已过期', color: '#5e2a2a', bg: '#e8c8c8', border: '#a05050' },
}

export default function PromisesTab({ search }: Props) {
  const promises = promiseMemories.filter((m) =>
    !search || m.content.toLowerCase().includes(search.toLowerCase())
  )
  const pending = promises.filter((m: any) => !m.promise_status || m.promise_status === 'pending')
  const done    = promises.filter((m: any) => m.promise_status === 'completed' || m.promise_status === 'cancelled')

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      {pending.length > 0 && (
        <section>
          <h3 className="font-hand text-xl font-semibold mb-1" style={{ color: '#1e2118' }}>待跟进</h3>
          <p className="text-xs mb-4" style={{ color: '#75956b' }}>已答应但尚未完成的事项</p>
          <div className="space-y-3">
            {pending.map((m) => {
              const ps = (m as any).promise_status || 'pending'
              const cfg = statusCfg[ps as keyof typeof statusCfg] || statusCfg.pending
              return (
                <div key={m.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed" style={{ color: '#1e2118' }}>{m.content}</p>
                      {(m as any).due_hint && (
                        <p className="font-hand text-sm mt-2" style={{ color: '#c4983a' }}>
                          📅 {(m as any).due_hint}
                        </p>
                      )}
                      {m.source_refs.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {m.source_refs.map((ref) => (
                            <span key={ref.seq} className="font-hand text-sm px-2 py-0.5 rounded-full"
                              style={{ background: '#e8ede4', border: '1px solid #93af8b', color: '#5e7a55' }}>
                              #{ref.seq}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="font-hand text-sm px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, color: cfg.color }}>
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
          <h3 className="font-hand text-xl mb-3" style={{ color: '#75956b' }}>已完成 / 已取消</h3>
          <div className="space-y-2 opacity-70">
            {done.map((m) => {
              const ps = (m as any).promise_status || 'completed'
              const cfg = statusCfg[ps as keyof typeof statusCfg] || statusCfg.completed
              return (
                <div key={m.id} className="card p-3">
                  <div className="flex items-center gap-3">
                    <p className="flex-1 text-sm line-through" style={{ color: '#75956b' }}>{m.content}</p>
                    <span className="font-hand text-sm px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
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
        <p className="font-hand text-lg text-center py-12" style={{ color: '#93af8b' }}>
          没有找到匹配的承诺记录
        </p>
      )}
    </div>
  )
}
