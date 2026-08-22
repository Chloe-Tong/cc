import { useState } from 'react'
import LongTermMemoryTab from './tabs/LongTermMemoryTab'
import EpisodicTab from './tabs/EpisodicTab'
import PromisesTab from './tabs/PromisesTab'
import PrivatePsychTab from './tabs/PrivatePsychTab'
import FactsClaimsTab from './tabs/FactsClaimsTab'
import DeletedTab from './tabs/DeletedTab'
import IdentityTab from './tabs/IdentityTab'

type Tab = {
  id: string
  label: string
  icon: string
  badge?: number
}

const tabs: Tab[] = [
  { id: 'longterm', label: '长期记忆', icon: '📚' },
  { id: 'episodic', label: '情景记忆', icon: '🎞' },
  { id: 'promises', label: '承诺', icon: '🤝', badge: 3 },
  { id: 'private', label: '私人心理', icon: '🔒' },
  { id: 'facts', label: '事实与冲突', icon: '⚖️', badge: 1 },
  { id: 'deleted', label: '删除与恢复', icon: '🗑', badge: 1 },
  { id: 'identity', label: '身份锚点', icon: '🪞' },
]

export default function MemoryLibrary() {
  const [activeTab, setActiveTab] = useState('longterm')
  const [search, setSearch] = useState('')

  return (
    <div className="flex h-full">
      {/* Left tab bar */}
      <aside className="w-44 shrink-0 bg-[#111114] border-r border-white/5 flex flex-col py-4">
        <div className="px-4 mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">记忆库</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100 text-left ${
                activeTab === tab.id
                  ? 'bg-rose-500/15 text-rose-200'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <span className="text-sm leading-none shrink-0">{tab.icon}</span>
              <span className="flex-1 leading-snug">{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activeTab === tab.id
                    ? 'bg-rose-500/30 text-rose-300'
                    : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-4 pb-2">
          <div className="text-xs text-zinc-600 leading-relaxed">
            <div className="flex justify-between mb-1">
              <span>记忆总数</span>
              <span className="text-zinc-500">14</span>
            </div>
            <div className="flex justify-between">
              <span>最近更新</span>
              <span className="text-zinc-500">2026-06-29</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="px-6 py-4 border-b border-white/5 shrink-0">
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="搜索记忆…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-rose-500/40 focus:bg-white/7 transition-colors"
            />
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'longterm' && <LongTermMemoryTab search={search} />}
          {activeTab === 'episodic' && <EpisodicTab search={search} />}
          {activeTab === 'promises' && <PromisesTab search={search} />}
          {activeTab === 'private' && <PrivatePsychTab />}
          {activeTab === 'facts' && <FactsClaimsTab search={search} />}
          {activeTab === 'deleted' && <DeletedTab />}
          {activeTab === 'identity' && <IdentityTab />}
        </div>
      </div>
    </div>
  )
}
