import type { ReactNode } from 'react'
import type { NavSection } from '../../App'

interface Props {
  children: ReactNode
  activeSection: NavSection
  onNavigate: (section: NavSection) => void
}

const navItems: Array<{ id: NavSection; label: string; icon: string }> = [
  { id: 'chat', label: '聊天', icon: '💬' },
  { id: 'memory', label: '记忆库', icon: '🧠' },
  { id: 'work', label: '工作区', icon: '⚡' },
  { id: 'settings', label: '设置', icon: '⚙️' },
]

export default function AppLayout({ children, activeSection, onNavigate }: Props) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0d0f]">
      {/* Sidebar nav */}
      <nav className="flex flex-col items-center gap-1 py-6 px-2 bg-[#111114] border-r border-white/5 w-16 shrink-0">
        <div className="mb-6">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-sm font-medium text-white shadow-lg shadow-rose-900/40">
            ❤
          </div>
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-150 ${
              activeSection === item.id
                ? 'bg-rose-500/20 text-rose-300 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
