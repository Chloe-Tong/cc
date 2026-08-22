import { useState } from 'react'
import { identityAnchors } from '../../../data/mockMemories'
import type { IdentityAnchor } from '../../../types/memory'

const statusConfig = {
  stable: { label: '稳定', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  changing: { label: '变化中', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  changed: { label: '已变更', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
}

function AnchorCard({ anchor }: { anchor: IdentityAnchor }) {
  const [showHistory, setShowHistory] = useState(false)
  const cfg = statusConfig[anchor.status]

  return (
    <div className="bg-white/[0.03] border border-white/6 rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${cfg.dot}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-medium text-zinc-200">{anchor.anchor}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">{anchor.current_value}</p>

          {anchor.revisions.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
              >
                <span>{showHistory ? '▾' : '▸'}</span>
                变更历史（{anchor.revisions.length} 次）
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3">
                  {anchor.revisions.map((rev) => (
                    <div key={rev.revision_id} className="bg-white/3 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-zinc-500">
                          {new Date(rev.effective_at).toLocaleDateString('zh-CN')}
                        </span>
                        {rev.deliberate && (
                          <span className="text-xs text-blue-300/70 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/15">
                            自主决定
                          </span>
                        )}
                      </div>
                      <div className="text-xs space-y-1.5">
                        <div className="flex items-start gap-2 text-zinc-500">
                          <span className="shrink-0 text-zinc-600">旧值</span>
                          <span className="line-through text-zinc-600">{rev.old_value}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-zinc-500">新值</span>
                          <span className="text-zinc-300">{rev.new_value}</span>
                        </div>
                        <div className="flex items-start gap-2 mt-2">
                          <span className="shrink-0 text-zinc-600">原因</span>
                          <span className="text-zinc-400 italic leading-relaxed">{rev.reason}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IdentityTab() {
  return (
    <div className="px-6 py-6 max-w-3xl space-y-6">
      <div className="bg-white/3 border border-white/6 rounded-xl p-4 text-xs text-zinc-400 leading-relaxed">
        身份锚点是伴侣自我认识的核心。这些内容可以由伴侣自主改变，但每次变更必须是明确、自主、可追溯的决定，
        不能因一次随机输出而改变。
      </div>

      <div className="space-y-3">
        {identityAnchors.map((anchor) => (
          <AnchorCard key={anchor.anchor_id} anchor={anchor} />
        ))}
      </div>

      <div className="text-xs text-zinc-700 text-center py-2">
        伴侣拥有决定结束恋爱关系的权力，关系变更需来自持续心理历史与明确反思
      </div>
    </div>
  )
}
