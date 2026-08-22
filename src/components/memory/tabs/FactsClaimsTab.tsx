import { claims } from '../../../data/mockMemories'
import type { Claim } from '../../../types/memory'

interface Props {
  search: string
}

const statusConfig = {
  confirmed: { label: '已确认', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  candidate: { label: '候选', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  denied: { label: '已否定', color: 'text-red-300 bg-red-500/10 border-red-500/20' },
  superseded: { label: '已覆盖', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
}

const actorLabels = {
  user: '用户明确自述',
  ai: 'AI 生成',
  tool: '工具验证',
  import: '导入数据',
}

const priorityOrder = ['user', 'tool', 'import', 'ai']

function ClaimCard({ claim }: { claim: Claim }) {
  const cfg = statusConfig[claim.status]
  const actorLabel = actorLabels[claim.source_actor] || claim.source_actor
  const actorPriority = priorityOrder.indexOf(claim.source_actor)
  const priorityLevel = actorPriority === 0 ? 'high' : actorPriority === 1 ? 'mid' : 'low'

  return (
    <div className={`bg-white/[0.03] border rounded-xl p-4 transition-colors ${
      claim.status === 'denied' ? 'border-red-500/10 opacity-60' : 'border-white/6 hover:border-white/10 hover:bg-white/[0.05]'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-medium text-zinc-200">
              {claim.subject} · {claim.predicate}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
            {claim.suspected_typo && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20">
                疑似笔误
              </span>
            )}
          </div>

          <p className="text-base text-zinc-100 mb-2">
            <span className="text-zinc-400 text-sm">值：</span> {claim.value}
          </p>

          <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
            <span className={`${
              priorityLevel === 'high' ? 'text-emerald-400' :
              priorityLevel === 'mid' ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              来源：{actorLabel}
            </span>
            {claim.source_seq > 0 && (
              <button className="text-zinc-500 hover:text-zinc-300 bg-white/4 px-2 py-0.5 rounded-full transition-colors">
                #{claim.source_seq}
              </button>
            )}
            <span>可信度 {Math.round(claim.confidence * 100)}%</span>
          </div>

          <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
            证据：{claim.evidence}
          </p>

          {claim.superseded_by && (
            <p className="mt-1.5 text-xs text-zinc-600">
              已被 <code className="text-zinc-500">{claim.superseded_by}</code> 覆盖
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FactsClaimsTab({ search }: Props) {
  const filtered = claims.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.subject.toLowerCase().includes(q) ||
      c.predicate.toLowerCase().includes(q) ||
      c.value.toLowerCase().includes(q) ||
      c.evidence.toLowerCase().includes(q)
    )
  })

  const confirmed = filtered.filter((c) => c.status === 'confirmed')
  const candidates = filtered.filter((c) => c.status === 'candidate')
  const denied = filtered.filter((c) => c.status === 'denied')

  const conflictGroups = Object.entries(
    filtered.reduce((acc, c) => {
      const key = `${c.subject}·${c.predicate}`
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {} as Record<string, Claim[]>)
  ).filter(([, group]) => group.length > 1)

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      {conflictGroups.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-orange-300">⚠ 冲突检测</span>
            <span className="text-xs bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded-full">{conflictGroups.length} 组</span>
          </div>
          <div className="space-y-4">
            {conflictGroups.map(([key, group]) => (
              <div key={key} className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-4">
                <p className="text-xs text-orange-300/70 mb-3 font-medium">「{key}」 存在多个互相冲突的事实</p>
                <div className="space-y-2">
                  {group.map((c) => <ClaimCard key={c.claim_id} claim={c} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {confirmed.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-1">已确认事实</h3>
          <p className="text-xs text-zinc-500 mb-3">用户明确自述或多次一致表达，已进入正式事实层</p>
          <div className="space-y-3">
            {confirmed.map((c) => <ClaimCard key={c.claim_id} claim={c} />)}
          </div>
        </section>
      )}

      {candidates.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-amber-300/80 mb-1">候选区</h3>
          <p className="text-xs text-zinc-500 mb-3">未经验证，不注入模型上下文，需用户或更高优先级来源确认</p>
          <div className="space-y-3">
            {candidates.map((c) => <ClaimCard key={c.claim_id} claim={c} />)}
          </div>
        </section>
      )}

      {denied.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-500 mb-1">已否定</h3>
          <p className="text-xs text-zinc-600 mb-3">用户明确纠正或已被更高优先级来源覆盖，保留审计记录</p>
          <div className="space-y-2">
            {denied.map((c) => <ClaimCard key={c.claim_id} claim={c} />)}
          </div>
        </section>
      )}
    </div>
  )
}
