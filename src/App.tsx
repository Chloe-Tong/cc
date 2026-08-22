import { useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import MemoryLibrary from './components/memory/MemoryLibrary'
import ChatPage from './pages/ChatPage'

export type NavSection = 'chat' | 'memory' | 'work' | 'settings'

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('memory')

  return (
    <AppLayout activeSection={activeSection} onNavigate={setActiveSection}>
      {activeSection === 'chat' && <ChatPage />}
      {activeSection === 'memory' && <MemoryLibrary />}
      {activeSection === 'work' && (
        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
          工作区 · 即将上线
        </div>
      )}
      {activeSection === 'settings' && (
        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
          设置 · 即将上线
        </div>
      )}
    </AppLayout>
  )
}
