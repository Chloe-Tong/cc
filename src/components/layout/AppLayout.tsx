import type { ReactNode } from 'react'
import type { NavSection } from '../../App'

interface Props {
  children: ReactNode
  activeSection: NavSection
  onNavigate: (section: NavSection) => void
}

const navItems: Array<{ id: NavSection; label: string; emoji: string }> = [
  { id: 'chat',     label: '聊天',  emoji: '💬' },
  { id: 'memory',   label: '记忆库', emoji: '🧠' },
  { id: 'work',     label: '工作区', emoji: '⚡' },
  { id: 'settings', label: '设置',  emoji: '⚙️' },
]

export default function AppLayout({ children, activeSection, onNavigate }: Props) {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#d2dece' }}>
      {/* Sidebar */}
      <nav
        className="flex flex-col items-center gap-2 py-5 px-2 w-16 shrink-0"
        style={{ background: '#b5c9af', borderRight: '1.5px solid #1e2118' }}
      >
        {/* Logo */}
        <div className="mb-4 w-9 h-9 rounded-full flex items-center justify-center text-lg"
          style={{ background: '#f5f0e4', border: '2px solid #1e2118', boxShadow: '2px 2px 0 #1e2118' }}>
          🌿
        </div>

        {navItems.map((item) => {
          const active = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all duration-100"
              style={active ? {
                background: '#f5f0e4',
                border: '1.5px solid #1e2118',
                boxShadow: '2px 2px 0 #1e2118',
                transform: 'translate(-0.5px, -0.5px)',
              } : {
                background: 'transparent',
                border: '1.5px solid transparent',
              }}
            >
              {item.emoji}
            </button>
          )
        })}
      </nav>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
