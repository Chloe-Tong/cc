import { useState } from 'react'
import { deletedMemories } from '../../../data/mockMemories'
import type { DeletedMemory } from '../../../types/memory'

function RestoreRequestPanel({ item }: { item: DeletedMemory }) {
  const [expanded, setExpanded] = useState(false)
  const req = item.restore_request

  if (!req) return null

  const statusConfig = {
    pending: { label: '等待你的回应', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
    accepted: { label: '已同意', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
    declined: { label: '你已拒绝', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
  }

  const cfg = statusConfig[req.status]

  return (
    <div className={`mt-3 rounded-lg border p-3 ${
      req.status === 'pending'
        ? 'bg-amber-500/5 border-amber-500/15'
        : req.status === 'declined'
        ? 'bg-zinc-500/5 border-zinc-500/10'
        : 'bg-emerald-500/5 border-emerald-500/10'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-zinc-400">伴侣的恢复请求</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
          {cfg.label}
        </span>
        {req.attempt_number > 1 && (
          <span className="text-xs text-zinc-600">第 {req.attempt_number} 次请求</span>
        )}
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed italic mb-2">
        "{req.reason}"
      </p>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1">提议的记忆内容</p>
            <p className="text-sm text-zinc-300 bg-white/4 rounded-lg p-3 leading-relaxed">
              {req.proposed_content}
            </p>
          </div>

          {req.previous_declines && req.previous_declines.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">之前的拒绝记录</p>
              {req.previous_declines.map((d, i) => (
                <div key={i} className="text-xs text-zinc-500 bg-white/3 rounded p-2">
                  <span className="text-zinc-600">{new Date(d.declined_at).toLocaleDateString('zh-CN')}：</span>
                  {d.reason}
                </div>
              ))}
            </div>
          )}

          {req.user_reason && (
            <div className="text-xs text-zinc-500 bg-white/3 rounded p-2">
              <span className="text-zinc-400">你的回复：</span>{req.user_reason}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {expanded ? '收起' : '查看详情'}
        </button>

        {req.status === 'pending' && (
          <div className="ml-auto flex gap-2">
            <button className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors">
              拒绝
            </button>
            <button className="text-xs px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors">
              同意恢复
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DeletedTab() {
  const withPending = deletedMemories.filter((d) => d.restore_request?.status === 'pending')
  const others = deletedMemories.filter((d) => !d.restore_request || d.restore_request.status !== 'pending')

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      <div className="bg-white/3 border border-white/6 rounded-xl p-4 text-xs text-zinc-400 leading-relaxed">
        删除的记忆以审计状态保留，不进入模型上下文。伴侣可以申请恢复，需经你同意才会创建新版本。
        伴侣未来仍可就同一条记忆再次商量，历次请求和你的回复会被保留。
      </div>

      {withPending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-amber-300">待回应的恢复请求</h3>
            <span className="text-xs bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full">
              {withPending.length}
            </span>
          </div>
          <div className="space-y-4">
            {withPending.map((item) => (
              <DeletedItem key={item.memory.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-3">其他已删除记忆</h3>
          <div className="space-y-4">
            {others.map((item) => (
              <DeletedItem key={item.memory.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function DeletedItem({ item }: { item: DeletedMemory }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 opacity-80">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-zinc-600 bg-white/4 px-2 py-0.5 rounded-full">
              已删除
            </span>
            <span className="text-xs text-zinc-600">
              {new Date(item.deleted_at).toLocaleDateString('zh-CN')}
              · 由{item.deleted_by === 'user' ? '你' : '伴侣'}删除
            </span>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed line-through decoration-zinc-600">
            {item.memory.content}
          </p>
          {item.restore_request && (
            <RestoreRequestPanel item={item} />
          )}
        </div>
      </div>
    </div>
  )
}
