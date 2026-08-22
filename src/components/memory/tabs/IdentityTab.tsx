import { useState, useEffect } from 'react'
import { api, onWsEvent } from '../../../api/client'
import type { IdentityAnchor } from '../../../types/memory'

const statusCfg = {
  stable:   { label: '稳定',   dot: '#5e7a55', color: '#3a5a40', bg: '#c8e0cc', border: '#5e7a55' },
  changing: { label: '变化中', dot: '#c4983a', color: '#5e4a2a', bg: '#e8dcc8', border: '#c4983a' },
  changed:  { label: '已变更', dot: '#5e6a7a', color: '#2a405e', bg: '#c8d4e0', border: '#5e6a7a' },
}

function AnchorCard({ anchor }: { anchor: IdentityAnchor }) {
  const [showHistory, setShowHistory] = useState(false)
  const cfg = statusCfg[anchor.status]

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full mt-1.5 shrink-0"
          style={{ background: cfg.dot, border: '2px solid #1e2118' }} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-hand text-lg font-semibold" style={{ color: '#1e2118' }}>
              {anchor.anchor}
            </span>
            <span className="font-hand text-sm px-2.5 py-0.5 rounded-full"
              style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: '#2a2a1e' }}>{anchor.current_value}</p>

          {anchor.revisions.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: '#75956b' }}>
                <span>{showHistory ? '▾' : '▸'}</span>
                变更历史（{anchor.revisions.length} 次）
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3">
                  {anchor.revisions.map((rev) => (
                    <div key={rev.revision_id} className="rounded-xl p-3"
                      style={{ background: '#ece8dc', border: '1px solid #c4c0b0' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-hand text-sm" style={{ color: '#75956b' }}>
                          {new Date(rev.effective_at).toLocaleDateString('zh-CN')}
                        </span>
                        {rev.deliberate && (
                          <span className="font-hand text-sm px-2 py-0.5 rounded-full"
                            style={{ background: '#c8d4e0', border: '1px solid #5e6a7a', color: '#2a405e' }}>
                            自主决定
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex gap-2" style={{ color: '#93af8b' }}>
                          <span className="shrink-0">旧值</span>
                          <span className="line-through">{rev.old_value}</span>
                        </div>
                        <div className="flex gap-2" style={{ color: '#1e2118' }}>
                          <span className="shrink-0" style={{ color: '#75956b' }}>新值</span>
                          <span>{rev.new_value}</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="shrink-0" style={{ color: '#93af8b' }}>原因</span>
                          <span className="italic leading-relaxed" style={{ color: '#4c4c3a' }}>{rev.reason}</span>
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
  const [anchors, setAnchors] = useState<IdentityAnchor[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => api.getIdentityAnchors().then(setAnchors).finally(() => setLoading(false))

  useEffect(() => { load() }, [])
  useEffect(() => onWsEvent((e: any) => {
    if (e.type === 'import_complete') load()
  }), [])

  if (loading) return <div className="px-6 py-12 font-hand text-center" style={{ color: '#c4aea8' }}>加载中…</div>

  return (
    <div className="px-6 py-6 max-w-3xl space-y-6">
      <div className="card p-4 text-sm leading-relaxed" style={{ color: '#4c6244' }}>
        身份锚点是伴侣自我认识的核心。这些内容可以由伴侣自主改变，
        但每次变更必须是明确、自主、可追溯的决定，不能因一次随机输出而改变。
      </div>

      <div className="space-y-3">
        {anchors.map((anchor) => <AnchorCard key={anchor.anchor_id} anchor={anchor} />)}
      </div>

      {anchors.length === 0 && (
        <p className="font-hand text-lg text-center py-12" style={{ color: '#93af8b' }}>暂无身份锚点</p>
      )}

      <p className="font-hand text-center" style={{ color: '#93af8b' }}>
        伴侣拥有决定结束恋爱关系的权力，关系变更需来自持续心理历史与明确反思
      </p>
    </div>
  )
}
