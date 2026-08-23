import { useState, useEffect, useRef } from 'react'
import { api, onWsEvent } from '../../api/client'
import type { LogEvent } from '../../types/memory'

// ── Event type display config ─────────────────────────────────────────────
const EVENT_CFG: Record<string, { label: string; dot: string; text: string }> = {
  memory_create:          { label: '新建记忆', dot: '#75956b', text: '#3a5a40' },
  memory_update:          { label: '更新记忆', dot: '#5e6a9a', text: '#2a3a6e' },
  memory_delete:          { label: '删除记忆', dot: '#c47a5a', text: '#7a3a2a' },
  memory_restore_request: { label: '申请恢复', dot: '#c4983a', text: '#5e4a1a' },
  claim_create:           { label: '新建断言', dot: '#8a6a9a', text: '#4a2a6e' },
  claim_update:           { label: '更新断言', dot: '#7a6a9a', text: '#3a2a5e' },
  identity_anchor_update: { label: '身份锚点', dot: '#5e9a8a', text: '#1a4a3a' },
  import_complete:        { label: '导入完成', dot: '#75956b', text: '#3a5a40' },
}

function cfgFor(type: string) {
  return EVENT_CFG[type] ?? { label: type, dot: '#9a7a74', text: '#4a2a24' }
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

function contentPreview(evt: LogEvent): string {
  const c = evt.content
  if (typeof c.content === 'string') return c.content.slice(0, 80)
  if (typeof c.value === 'string') return `${c.subject ?? ''} · ${c.value}`.slice(0, 80)
  if (typeof c.anchor === 'string') return `${c.anchor}: ${c.current_value ?? ''}`.slice(0, 80)
  if (typeof c.memories_imported === 'number') return `导入 ${c.memories_imported} 条记忆`
  return ''
}

function EventRow({ evt }: { evt: LogEvent }) {
  const cfg = cfgFor(evt.event_type)
  const preview = contentPreview(evt)

  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5"
      style={{ borderBottom: '1px solid rgba(196,168,158,0.18)' }}>
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
        style={{ background: cfg.dot }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-hand text-xs font-semibold" style={{ color: cfg.text }}>
            {cfg.label}
          </span>
          <span className="text-xs" style={{ color: '#b09088' }}>
            {evt.actor !== 'unknown' ? evt.actor : ''}
          </span>
          <span className="ml-auto text-xs shrink-0" style={{ color: '#c4aea8' }}>
            {timeAgo(evt.timestamp)}
          </span>
        </div>
        {preview && (
          <p className="text-xs leading-relaxed truncate" style={{ color: '#4c3a38' }}>
            {preview}
          </p>
        )}
      </div>
    </div>
  )
}

interface Props {
  open: boolean
  onToggle: () => void
}

export default function EventFeedPanel({ open, onToggle }: Props) {
  const [events, setEvents] = useState<LogEvent[]>([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const isAtTopRef = useRef(true)

  const load = async () => {
    setLoading(true)
    try {
      const evts = await api.getEvents(60)
      setEvents(evts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  // prepend new event on WS push
  useEffect(() => onWsEvent((e: any) => {
    if (!open) return
    load()  // simple: just reload; events list is short
  }), [open])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isAtTopRef.current = e.currentTarget.scrollTop < 10
  }

  return (
    <div style={{
      borderTop: '1px solid rgba(196,168,158,0.35)',
      background: 'rgba(245,237,230,0.70)',
      backdropFilter: 'blur(8px)',
      flexShrink: 0,
    }}>
      {/* Toggle handle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
        style={{ color: '#7a5a54' }}
      >
        <span style={{ fontSize: 10 }}>{open ? '▾' : '▸'}</span>
        <span className="font-hand text-sm">实时事件流</span>
        {events.length > 0 && open && (
          <span className="ml-auto font-hand text-xs" style={{ color: '#b09088' }}>
            最近 {events.length} 条
          </span>
        )}
        {!open && events.length > 0 && (
          <span className="ml-auto">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#75956b' }} />
          </span>
        )}
      </button>

      {open && (
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{ height: 220, overflowY: 'auto' }}
        >
          {loading && events.length === 0 && (
            <p className="font-hand text-sm text-center py-8" style={{ color: '#c4aea8' }}>
              加载中…
            </p>
          )}
          {!loading && events.length === 0 && (
            <p className="font-hand text-sm text-center py-8" style={{ color: '#c4aea8' }}>
              暂无事件 — 等待 Claude 写入日志…
            </p>
          )}
          {events.map((evt) => <EventRow key={evt.id ?? evt.event_id} evt={evt} />)}
        </div>
      )}
    </div>
  )
}
