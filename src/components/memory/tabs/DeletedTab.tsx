import { useState, useEffect } from 'react'
import { api, onWsEvent } from '../../../api/client'
import { toast } from '../../../toast'
import type { DeletedMemory } from '../../../types/memory'

function RestoreRequestPanel({ item, onResolved }: { item: DeletedMemory; onResolved: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy]         = useState(false)
  const req = item.restore_request
  if (!req) return null

  const statusCfg = {
    pending:  { label: '等待你的回应', border: '#c4983a', bg: '#f5ede0', color: '#5e4a2a' },
    accepted: { label: '已同意',       border: '#5e7a55', bg: '#e0edd8', color: '#3a5a40' },
    declined: { label: '你已拒绝',     border: '#93af8b', bg: '#e8ede4', color: '#4c6244' },
  }
  const cfg = statusCfg[req.status]

  const resolve = async (status: 'accepted' | 'declined') => {
    setBusy(true)
    try {
      await api.resolveRestoreRequest(req.restoration_request_id, status)
      toast[status === 'accepted' ? 'success' : 'info'](
        status === 'accepted' ? '已同意恢复记忆' : '已拒绝恢复请求'
      )
      onResolved()
    } catch {
      toast.error('操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl p-3"
      style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, boxShadow: `2px 2px 0 ${cfg.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs" style={{ color: '#4c6244' }}>伴侣的恢复请求</span>
        <span className="font-hand text-sm px-2.5 py-0.5 rounded-full"
          style={{ background: '#f5f0e4', border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {cfg.label}
        </span>
        {req.attempt_number > 1 && (
          <span className="font-hand text-sm" style={{ color: '#93af8b' }}>第 {req.attempt_number} 次</span>
        )}
      </div>

      <p className="text-sm leading-relaxed italic" style={{ color: '#3d3020' }}>"{req.reason}"</p>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs mb-1" style={{ color: '#75956b' }}>提议的记忆内容</p>
            <p className="text-sm leading-relaxed p-3 rounded-lg"
              style={{ background: '#f5f0e4', border: '1px solid #e0d8c8', color: '#2a2a1e' }}>
              {req.proposed_content}
            </p>
          </div>
          {req.previous_declines?.map((d, i) => (
            <div key={i} className="text-xs p-2 rounded-lg" style={{ background: '#ece8dc', color: '#75756a' }}>
              <span style={{ color: '#4c4c3a' }}>{new Date(d.declined_at).toLocaleDateString('zh-CN')}：</span>
              {d.reason}
            </div>
          ))}
          {req.user_reason && (
            <div className="text-xs p-2 rounded-lg" style={{ background: '#ece8dc', color: '#4c6244' }}>
              <span style={{ color: '#1e2118' }}>你的回复：</span>{req.user_reason}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button onClick={() => setExpanded(!expanded)} className="text-xs transition-colors"
          style={{ color: '#75956b' }}>
          {expanded ? '收起' : '查看详情'}
        </button>
        {req.status === 'pending' && (
          <div className="ml-auto flex gap-2">
            <button disabled={busy} onClick={() => resolve('declined')}
              className="font-hand text-sm px-3 py-1 rounded-lg transition-all disabled:opacity-50"
              style={{ background: '#deded2', border: '1.5px solid #93af8b', boxShadow: '2px 2px 0 #93af8b', color: '#4a4a3a' }}>
              拒绝
            </button>
            <button disabled={busy} onClick={() => resolve('accepted')}
              className="font-hand text-sm px-3 py-1 rounded-lg transition-all disabled:opacity-50"
              style={{ background: '#c8e0cc', border: '1.5px solid #5e7a55', boxShadow: '2px 2px 0 #5e7a55', color: '#3a5a40' }}>
              同意恢复
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DeletedItem({ item, onResolved }: { item: DeletedMemory; onResolved: () => void }) {
  return (
    <div className="card p-4 opacity-75">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-hand text-sm px-2.5 py-0.5 rounded-full"
          style={{ background: '#deded2', border: '1px solid #93af8b', color: '#75756a' }}>
          已删除
        </span>
        <span className="text-xs" style={{ color: '#93af8b' }}>
          {new Date(item.deleted_at).toLocaleDateString('zh-CN')} ·
          由{item.deleted_by === 'user' ? '你' : '伴侣'}删除
        </span>
      </div>
      <p className="text-sm leading-relaxed line-through" style={{ color: '#93af8b', textDecorationColor: '#b5c9af' }}>
        {item.memory.content}
      </p>
      {item.restore_request && <RestoreRequestPanel item={item} onResolved={onResolved} />}
    </div>
  )
}

export default function DeletedTab() {
  const [items, setItems]   = useState<DeletedMemory[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => api.getDeleted().then(setItems).finally(() => setLoading(false))

  useEffect(() => { load() }, [])
  useEffect(() => onWsEvent((e: any) => {
    if (e.type === 'restore_resolved' || e.type === 'memory_deleted') load()
  }), [])

  if (loading) return <div className="px-6 py-12 font-hand text-center" style={{ color: '#c4aea8' }}>加载中…</div>

  const pending = items.filter((d) => d.restore_request?.status === 'pending')
  const others  = items.filter((d) => !d.restore_request || d.restore_request.status !== 'pending')

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      <div className="card p-4 text-sm leading-relaxed" style={{ color: '#4c6244' }}>
        删除的记忆以审计状态保留，不进入模型上下文。伴侣可以申请恢复，需经你同意才会创建新版本。
        伴侣未来仍可就同一条记忆再次商量，历次请求和你的回复会被保留。
      </div>

      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-hand text-xl font-semibold" style={{ color: '#c4983a' }}>待回应的恢复请求</h3>
            <span className="font-hand text-sm px-2.5 py-0.5 rounded-full"
              style={{ background: '#e8dcc8', border: '1.5px solid #c4983a', color: '#5e4a2a' }}>
              {pending.length}
            </span>
          </div>
          <div className="space-y-4">
            {pending.map((item) => <DeletedItem key={item.memory.id} item={item} onResolved={load} />)}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h3 className="font-hand text-xl mb-3" style={{ color: '#75956b' }}>其他已删除记忆</h3>
          <div className="space-y-4">
            {others.map((item) => <DeletedItem key={item.memory.id} item={item} onResolved={load} />)}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <p className="font-hand text-lg text-center py-12" style={{ color: '#93af8b' }}>没有已删除的记忆</p>
      )}
    </div>
  )
}
