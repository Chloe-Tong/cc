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
    <div className="flex h-screen w-screen overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #fef5f5 0%, #fde8f2 55%, #f9dcea 100%)' }}>

      {/* Sidebar — soft blush */}
      <nav className="flex flex-col items-center gap-2 py-6 px-2 w-16 shrink-0"
        style={{
          background: 'rgba(255,251,252,0.7)',
          borderRight: '1px solid #f2ccd8',
          backdropFilter: 'blur(8px)',
        }}>
        {/* Logo */}
        <div className="mb-4 w-9 h-9 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'linear-gradient(135deg, #fde8f2 0%, #f9dcea 100%)', border: '1px solid #f0c4d4' }}>
          🌸
        </div>

        {navItems.map((item) => {
          const active = activeSection === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} title={item.label}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all duration-150"
              style={active ? {
                background: 'linear-gradient(135deg, #fde8f2 0%, #f9dcea 100%)',
                border: '1px solid #e8b0c8',
                boxShadow: '0 2px 8px rgba(216,120,154,0.18)',
              } : {
                background: 'transparent',
                border: '1px solid transparent',
              }}>
              {item.emoji}
            </button>
          )
        })}
      </nav>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
