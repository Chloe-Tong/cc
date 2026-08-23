import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToasts } from '../toast'
import type { ToastItem } from '../toast'

const cfg = {
  success: { bg: '#d8edd4', border: '#5e7a55', icon: '✓', color: '#2a5a30' },
  error:   { bg: '#edd4d0', border: '#9a4a3a', icon: '✕', color: '#6a2a20' },
  info:    { bg: '#e8e0d4', border: '#c4aea8', icon: 'ℹ', color: '#4c3a38' },
}

function Toast({ item }: { item: ToastItem }) {
  const { bg, border, icon, color } = cfg[item.type]
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 14,
        background: bg,
        border: `1.5px solid ${border}`,
        boxShadow: `0 4px 16px rgba(46,32,32,0.14), 2px 2px 0 ${border}`,
        color,
        fontSize: 14,
        fontFamily: 'inherit',
        maxWidth: 360,
        animation: 'toast-in 0.22s ease',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1 }}>{icon}</span>
      <span>{item.message}</span>
    </div>
  )
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setItems), [])

  if (items.length === 0) return null

  return createPortal(
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        {items.map((item) => <Toast key={item.id} item={item} />)}
      </div>
    </>,
    document.body
  )
}
