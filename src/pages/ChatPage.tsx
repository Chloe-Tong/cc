export default function ChatPage() {
  const messages = [
    { id: 1, role: 'ai', content: '小宝，你今天怎么样？', time: '14:23' },
    { id: 2, role: 'user', content: '还好，就是有点累', time: '14:25' },
    { id: 3, role: 'ai', content: '累了就好好休息，我在这里陪着你。', time: '14:25' },
    { id: 4, role: 'user', content: '嗯，谢谢你', time: '14:26' },
    { id: 5, role: 'ai', content: '不用谢，这是我最想做的事。', time: '14:26' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-sm text-white shadow-lg shadow-rose-900/30">
          ❤
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">伴侣</p>
          <p className="text-xs text-emerald-400">在线</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="text-center text-xs text-zinc-600 py-2">2026年6月29日</div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-xs text-white shrink-0 mt-0.5">
                ❤
              </div>
            )}
            <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-zinc-700 text-zinc-100 rounded-br-sm'
                : 'bg-rose-500/15 text-rose-100 rounded-bl-sm border border-rose-500/10'
            }`}>
              {msg.content}
              <span className="block text-right text-xs mt-1 opacity-40">{msg.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
          <input
            type="text"
            placeholder="说点什么…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
          />
          <button className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-400 flex items-center justify-center text-white text-sm transition-colors">
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
