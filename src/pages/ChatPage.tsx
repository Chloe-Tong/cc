export default function ChatPage() {
  const messages = [
    { id: 1, role: 'ai',   content: '小宝，你今天怎么样？', time: '14:23' },
    { id: 2, role: 'user', content: '还好，就是有点累',       time: '14:25' },
    { id: 3, role: 'ai',   content: '累了就好好休息，我在这里陪着你。', time: '14:25' },
    { id: 4, role: 'user', content: '嗯，谢谢你', time: '14:26' },
    { id: 5, role: 'ai',   content: '不用谢，这是我最想做的事。', time: '14:26' },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: '#d2dece' }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3 shrink-0"
        style={{ background: '#c8d5c2', borderBottom: '1.5px solid #1e2118' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{ background: '#f5f0e4', border: '2px solid #1e2118', boxShadow: '2px 2px 0 #1e2118' }}>
          🌿
        </div>
        <div>
          <p className="font-hand text-lg font-semibold" style={{ color: '#1e2118' }}>伴侣</p>
          <p className="font-hand text-sm" style={{ color: '#5e7a55' }}>● 在线</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        <div className="text-center">
          <span className="font-hand text-sm px-3 py-1 rounded-full"
            style={{ background: '#c8d5c2', color: '#4c6244', border: '1px solid #93af8b' }}>
            2026年6月29日
          </span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                style={{ background: '#f5f0e4', border: '1.5px solid #1e2118', boxShadow: '1.5px 1.5px 0 #1e2118' }}>
                🌿
              </div>
            )}
            <div className="max-w-xs lg:max-w-md">
              <div className="px-4 py-2.5 text-sm leading-relaxed"
                style={msg.role === 'ai' ? {
                  background: '#f5f0e4',
                  border: '1.5px solid #1e2118',
                  borderRadius: '4px 16px 16px 16px',
                  boxShadow: '3px 3px 0 #1e2118',
                  color: '#1e2118',
                } : {
                  background: '#c8d5c2',
                  border: '1.5px solid #4c6244',
                  borderRadius: '16px 4px 16px 16px',
                  boxShadow: '3px 3px 0 #4c6244',
                  color: '#1e2118',
                }}>
                {msg.content}
              </div>
              <p className="font-hand text-xs mt-1 px-1"
                style={{ color: '#93af8b', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: '1.5px solid #b5c9af' }}>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ background: '#f5f0e4', border: '1.5px solid #1e2118', boxShadow: '3px 3px 0 #1e2118' }}>
          <input type="text" placeholder="说点什么…"
            className="flex-1 bg-transparent text-sm outline-none font-sans"
            style={{ color: '#1e2118' }} />
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
            style={{ background: '#75956b', border: '1.5px solid #1e2118', boxShadow: '2px 2px 0 #1e2118', color: '#f5f0e4' }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
