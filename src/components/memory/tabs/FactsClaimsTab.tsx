import { useState, useEffect } from 'react'
import { api, onWsEvent } from '../../../api/client'
import type { Claim } from '../../../types/memory'

interface Props { search: string }

const statusCfg = {
  confirmed: { label: '已确认', color: '#3a5a40', bg: '#c8e0cc', border: '#5e7a55' },
  candidate: { label: '候选',   color: '#5e4a2a', bg: '#e8dcc8', border: '#c4983a' },
  denied:    { label: '已否定', color: '#5e2a2a', bg: '#e8c8c8', border: '#a05050' },
  superseded:{ label: '已覆盖', color: '#4a4a3a', bg: '#deded2', border: '#93af8b' },
}

const actorLabels: Record<string, string> = {
  user: '用户明确自述', ai: 'AI 生成', tool: '工具验证', import: '导入数据',
}

function ClaimCard({ claim }: { claim: Claim }) {
  const cfg = statusCfg[claim.status]
  return (
    <div className={`card p-4 ${claim.status === 'denied' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-hand text-base font-semibold" style={{ color: '#1e2118' }}>
              {claim.subject} · {claim.predicate}
            </span>
            <span className="font-hand text-sm px-2.5 py-0.5 rounded-full"
              style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, color: cfg.color }}>
              {cfg.label}
            </span>
            {claim.suspected_typo && (
              <span className="font-hand text-sm px-2 py-0.5 rounded-full"
                style={{ background: '#e8dcc8', border: '1px solid #c4983a', color: '#5e4a2a' }}>
                疑似笔误
              </span>
            )}
          </div>

          <p className="text-sm mb-2" style={{ color: '#1e2118' }}>
            <span style={{ color: '#75956b' }}>值：</span>{claim.value}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#75956b' }}>
            <span className={claim.source_actor === 'user' ? 'font-medium' : ''}>
              来源：{actorLabels[claim.source_actor] || claim.source_actor}
            </span>
            {claim.source_seq > 0 && (
              <span className="font-hand text-sm px-2 py-0.5 rounded-full"
                style={{ background: '#e8ede4', border: '1px solid #93af8b', color: '#5e7a55' }}>
                #{claim.source_seq}
              </span>
            )}
            <span>可信度 {Math.round(claim.confidence * 100)}%</span>
          </div>

          <p className="mt-2 text-xs leading-relaxed" style={{ color: '#75956b' }}>
            证据：{claim.evidence}
          </p>

          {claim.superseded_by && (
            <p className="mt-1 text-xs" style={{ color: '#93af8b' }}>
              已被 <code>{claim.superseded_by}</code> 覆盖
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FactsClaimsTab({ search }: Props) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => api.getClaims(search || undefined).then(setClaims).finally(() => setLoading(false))

  useEffect(() => { load() }, [search])
  useEffect(() => onWsEvent((e: any) => {
    if (e.type === 'import_complete') load()
  }), [])

  if (loading) return <div className="px-6 py-12 font-hand text-center" style={{ color: '#c4aea8' }}>加载中…</div>

  const confirmed  = claims.filter((c) => c.status === 'confirmed')
  const candidates = claims.filter((c) => c.status === 'candidate')
  const denied     = claims.filter((c) => c.status === 'denied')

  const conflictGroups = Object.entries(
    claims.reduce((acc, c) => {
      const key = `${c.subject}·${c.predicate}`
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {} as Record<string, Claim[]>)
  ).filter(([, g]) => g.length > 1)

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      {conflictGroups.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-hand text-xl font-semibold" style={{ color: '#c4983a' }}>⚠ 冲突检测</h3>
            <span className="font-hand text-sm px-2.5 py-0.5 rounded-full"
              style={{ background: '#e8dcc8', border: '1.5px solid #c4983a', color: '#5e4a2a' }}>
              {conflictGroups.length} 组
            </span>
          </div>
          <div className="space-y-4">
            {conflictGroups.map(([key, group]) => (
              <div key={key} className="rounded-xl p-4"
                style={{ background: '#f5ede0', border: '1.5px solid #c4983a', boxShadow: '3px 3px 0 #c4983a' }}>
                <p className="font-hand text-sm mb-3" style={{ color: '#5e4a2a' }}>
                  「{key}」存在多个互相冲突的事实
                </p>
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
          <h3 className="font-hand text-xl font-semibold mb-1" style={{ color: '#1e2118' }}>已确认事实</h3>
          <p className="text-xs mb-3" style={{ color: '#75956b' }}>用户明确自述或多次一致表达，已进入正式事实层</p>
          <div className="space-y-3">{confirmed.map((c) => <ClaimCard key={c.claim_id} claim={c} />)}</div>
        </section>
      )}

      {candidates.length > 0 && (
        <section>
          <h3 className="font-hand text-xl font-semibold mb-1" style={{ color: '#c4983a' }}>候选区</h3>
          <p className="text-xs mb-3" style={{ color: '#75956b' }}>未经验证，不注入模型上下文</p>
          <div className="space-y-3">{candidates.map((c) => <ClaimCard key={c.claim_id} claim={c} />)}</div>
        </section>
      )}

      {denied.length > 0 && (
        <section>
          <h3 className="font-hand text-xl mb-1" style={{ color: '#93af8b' }}>已否定</h3>
          <p className="text-xs mb-3" style={{ color: '#b5c9af' }}>已覆盖，保留审计记录</p>
          <div className="space-y-2">{denied.map((c) => <ClaimCard key={c.claim_id} claim={c} />)}</div>
        </section>
      )}
    </div>
  )
}
