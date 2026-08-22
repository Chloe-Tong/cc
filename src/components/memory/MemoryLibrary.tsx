import { useState } from 'react'
import LongTermMemoryTab from './tabs/LongTermMemoryTab'
import EpisodicTab from './tabs/EpisodicTab'
import PromisesTab from './tabs/PromisesTab'
import PrivatePsychTab from './tabs/PrivatePsychTab'
import FactsClaimsTab from './tabs/FactsClaimsTab'
import DeletedTab from './tabs/DeletedTab'
import IdentityTab from './tabs/IdentityTab'

type Tab = { id: string; label: string; emoji: string; badge?: number }

const tabs: Tab[] = [
  { id: 'longterm',  label: '长期记忆',   emoji: '📚' },
  { id: 'episodic',  label: '情景记忆',   emoji: '🎞' },
  { id: 'promises',  label: '承诺',       emoji: '🤝', badge: 3 },
  { id: 'private',   label: '私人心理',   emoji: '🔒' },
  { id: 'facts',     label: '事实与冲突', emoji: '⚖️', badge: 1 },
  { id: 'deleted',   label: '删除与恢复', emoji: '🗑', badge: 1 },
  { id: 'identity',  label: '身份锚点',   emoji: '🪞' },
]

export default function MemoryLibrary() {
  const [activeTab, setActiveTab] = useState('longterm')
  const [search, setSearch]       = useState('')

  return (
    <div className="flex h-full">
      {/* Tab sidebar — sage→dusty-rose gradient */}
      <aside className="w-44 shrink-0 flex flex-col py-5"
        style={{
          background: 'linear-gradient(180deg, #b2c4ae 0%, #ccb4b4 100%)',
          borderRight: '1.5px solid #261a1a',
        }}>
        <div className="px-4 mb-3">
          <span className="font-hand text-xl font-semibold" style={{ color: '#261a1a' }}>记忆库</span>
        </div>

        <nav className="flex flex-col gap-1 px-2 flex-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all duration-100"
                style={active ? {
                  background: '#f7f2ee',
                  border: '1.5px solid #261a1a',
                  boxShadow: '2px 2px 0 #261a1a',
                  color: '#261a1a',
                  fontWeight: 500,
                } : {
                  color: '#4a3030',
                  border: '1.5px solid transparent',
                }}>
                <span className="text-sm shrink-0">{tab.emoji}</span>
                <span className="flex-1">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="font-hand text-xs px-1.5 rounded-full"
                    style={{
                      background: active ? '#c0a4a8' : '#d4b8b4',
                      color: '#f7f2ee',
                      minWidth: 18, textAlign: 'center',
                    }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="px-4 pt-3" style={{ borderTop: '1px solid rgba(38,26,26,0.15)' }}>
          <p className="font-hand text-sm" style={{ color: '#604040' }}>共 14 条记忆</p>
          <p className="font-hand text-xs mt-0.5" style={{ color: '#906868' }}>2026-06-29</p>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #c4d0be 0%, #d0c0c0 55%, #d8babb 100%)' }}>
        {/* Search */}
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(38,26,26,0.12)' }}>
          <div className="relative max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#906868' }}>🔍</span>
            <input type="text" placeholder="搜索记忆…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-all font-sans"
              style={{
                background: '#f7f2ee',
                border: '1.5px solid #261a1a',
                boxShadow: '2px 2px 0 #261a1a',
                color: '#261a1a',
              }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'longterm'  && <LongTermMemoryTab search={search} />}
          {activeTab === 'episodic'  && <EpisodicTab search={search} />}
          {activeTab === 'promises'  && <PromisesTab search={search} />}
          {activeTab === 'private'   && <PrivatePsychTab />}
          {activeTab === 'facts'     && <FactsClaimsTab search={search} />}
          {activeTab === 'deleted'   && <DeletedTab />}
          {activeTab === 'identity'  && <IdentityTab />}
        </div>
      </div>
    </div>
  )
}
