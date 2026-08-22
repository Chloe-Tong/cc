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
      style={{ background: 'linear-gradient(150deg, #c4d0be 0%, #d0c0c0 55%, #d8babb 100%)' }}>

      {/* Sidebar — sage→rose vertical gradient */}
      <nav className="flex flex-col items-center gap-2 py-5 px-2 w-16 shrink-0"
        style={{
          background: 'linear-gradient(180deg, #a4b8a0 0%, #c0aaaa 100%)',
          borderRight: '1.5px solid #261a1a',
        }}>
        {/* Logo */}
        <div className="mb-4 w-9 h-9 rounded-full flex items-center justify-center text-lg"
          style={{ background: '#f7f2ee', border: '2px solid #261a1a', boxShadow: '2px 2px 0 #261a1a' }}>
          🌸
        </div>

        {navItems.map((item) => {
          const active = activeSection === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} title={item.label}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all duration-100"
              style={active ? {
                background: '#f7f2ee',
                border: '1.5px solid #261a1a',
                boxShadow: '2px 2px 0 #261a1a',
                transform: 'translate(-0.5px, -0.5px)',
              } : {
                background: 'transparent',
                border: '1.5px solid transparent',
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
