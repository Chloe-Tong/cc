import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api/client'
import { toast } from '../../toast'

const TYPES = [
  { value: 'fact',                            label: '事实' },
  { value: 'episodic',                        label: '情景记忆' },
  { value: 'relationship',                    label: '关系' },
  { value: 'promise',                         label: '承诺' },
  { value: 'private_psychology',              label: '私人心理' },
  { value: 'relationship_self_understanding', label: '关系理解' },
  { value: 'historical_psychology',           label: '历史心理' },
]

const VISIBILITIES = [
  { value: 'shared',      label: '共享' },
  { value: 'private',     label: '私有' },
  { value: 'exists_only', label: '仅存在' },
]

const PROMISE_STATUSES = [
  { value: 'pending',   label: '待跟进' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 10,
  background: 'rgba(245,237,230,0.80)',
  border: '1px solid #c4aea8',
  color: '#2e2020',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  resize: 'vertical' as const,
}

const labelStyle = {
  display: 'block',
  fontFamily: 'inherit',
  fontSize: 12,
  color: '#b09088',
  marginBottom: 4,
}

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewMemoryModal({ onClose, onCreated }: Props) {
  const [type, setType]         = useState('fact')
  const [content, setContent]   = useState('')
  const [meaning, setMeaning]   = useState('')
  const [relEffect, setRelEffect] = useState('')
  const [tagsRaw, setTagsRaw]   = useState('')
  const [visibility, setVis]    = useState('shared')
  const [promiseStatus, setPS]  = useState('pending')
  const [dueHint, setDueHint]   = useState('')
  const [busy, setBusy]         = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setBusy(true)
    try {
      const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      await api.createMemory({
        type, content: content.trim(),
        meaning:            meaning.trim()   || undefined,
        relationship_effect: relEffect.trim() || undefined,
        tags:               tags.length ? tags : undefined,
        visibility,
        promise_status:     type === 'promise' ? promiseStatus : undefined,
        due_hint:           type === 'promise' && dueHint.trim() ? dueHint.trim() : undefined,
      })
      toast.success('记忆已创建')
      onCreated()
      onClose()
    } catch {
      toast.error('创建失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(46,32,32,0.35)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#f5ede6',
          border: '1.5px solid #c4aea8',
          boxShadow: '0 8px 40px rgba(46,32,32,0.18)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(196,168,158,0.40)' }}>
          <span className="font-hand text-xl font-semibold" style={{ color: '#2e2020' }}>
            新增记忆
          </span>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(196,168,158,0.30)', color: '#7a5a54' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Type selector */}
          <div>
            <label style={labelStyle}>类型</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button key={t.value} type="button"
                  onClick={() => setType(t.value)}
                  className="font-hand text-xs px-3 py-1.5 rounded-full transition-all"
                  style={type === t.value ? {
                    background: '#b09088', border: '1px solid #7a5a54',
                    color: '#f5ede6', fontWeight: 500,
                  } : {
                    background: 'rgba(232,220,212,0.55)',
                    border: '1px solid #c4aea8', color: '#7a5a54',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label style={labelStyle}>内容 *</label>
            <textarea
              rows={3} required
              placeholder="记录这条记忆的具体内容…"
              value={content} onChange={(e) => setContent(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Meaning */}
          <div>
            <label style={labelStyle}>意义（可选）</label>
            <textarea
              rows={2}
              placeholder="这条记忆对关系或伴侣意味着什么…"
              value={meaning} onChange={(e) => setMeaning(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Relationship effect */}
          <div>
            <label style={labelStyle}>对关系的影响（可选）</label>
            <input type="text"
              placeholder="简短描述…"
              value={relEffect} onChange={(e) => setRelEffect(e.target.value)}
              style={{ ...inputStyle, resize: undefined }}
            />
          </div>

          {/* Promise-specific */}
          {type === 'promise' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label style={labelStyle}>承诺状态</label>
                <select value={promiseStatus} onChange={(e) => setPS(e.target.value)}
                  style={{ ...inputStyle, resize: undefined }}>
                  {PROMISE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label style={labelStyle}>截止提示（可选）</label>
                <input type="text" placeholder="如：下周、月底…"
                  value={dueHint} onChange={(e) => setDueHint(e.target.value)}
                  style={{ ...inputStyle, resize: undefined }}
                />
              </div>
            </div>
          )}

          {/* Tags + Visibility */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label style={labelStyle}>标签（逗号分隔）</label>
              <input type="text" placeholder="重要, 里程碑…"
                value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)}
                style={{ ...inputStyle, resize: undefined }}
              />
            </div>
            <div style={{ width: 100 }}>
              <label style={labelStyle}>可见性</label>
              <select value={visibility} onChange={(e) => setVis(e.target.value)}
                style={{ ...inputStyle, resize: undefined }}>
                {VISIBILITIES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid rgba(196,168,158,0.30)' }}>
          <button type="button" onClick={onClose}
            className="font-hand text-sm px-4 py-1.5 rounded-xl transition-all"
            style={{ background: 'rgba(232,220,212,0.60)', border: '1px solid #c4aea8', color: '#7a5a54' }}>
            取消
          </button>
          <button type="submit" disabled={busy || !content.trim()}
            className="font-hand text-sm px-5 py-1.5 rounded-xl transition-all disabled:opacity-50"
            style={{
              background: busy ? '#c4aea8' : '#b09088',
              border: '1px solid #7a5a54',
              color: '#f5ede6',
              fontWeight: 500,
            }}>
            {busy ? '保存中…' : '保存记忆'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(modal, document.body)
}
