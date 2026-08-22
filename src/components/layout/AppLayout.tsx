import type { ReactNode } from 'react'
import type { NavSection } from '../../App'
import { IconBlossom, IconChat, IconBrain, IconLightning, IconSettings } from '../icons/Icons'

interface Props {
  children: ReactNode
  activeSection: NavSection
  onNavigate: (section: NavSection) => void
}

type NavItem = { id: NavSection; label: string; Icon: (p: { size: number }) => JSX.Element }

const navItems: NavItem[] = [
  { id: 'chat',     label: '聊天',  Icon: IconChat },
  { id: 'memory',   label: '记忆库', Icon: IconBrain },
  { id: 'work',     label: '工作区', Icon: IconLightning },
  { id: 'settings', label: '设置',  Icon: IconSettings },
]

export default function AppLayout({ children, activeSection, onNavigate }: Props) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <nav className="flex flex-col items-center gap-2 py-6 px-2 w-16 shrink-0"
        style={{
          background: 'rgba(235, 224, 216, 0.55)',
          borderRight: '1px solid rgba(196,168,158,0.35)',
          backdropFilter: 'blur(12px)',
        }}>
        <div className="mb-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(245,237,230,0.80)', border: '1px solid #d4bab6' }}>
          <IconBlossom size={22} style={{ color: '#c4aea8' }} />
        </div>

        {navItems.map((item) => {
          const active = activeSection === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} title={item.label}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150"
              style={active ? {
                background: 'rgba(245,237,230,0.85)',
                border: '1px solid #c4aea8',
                boxShadow: '0 2px 8px rgba(180,148,140,0.22)',
                color: '#2e2020',
              } : {
                background: 'transparent',
                border: '1px solid transparent',
                color: '#7a5a54',
              }}>
              <item.Icon size={20} />
            </button>
          )
        })}
      </nav>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
