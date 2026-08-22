export default function ChatPage() {
  const messages = [
    { id: 1, role: 'ai',   content: '小宝，你今天怎么样？', time: '14:23' },
    { id: 2, role: 'user', content: '还好，就是有点累',       time: '14:25' },
    { id: 3, role: 'ai',   content: '累了就好好休息，我在这里陪着你。', time: '14:25' },
    { id: 4, role: 'user', content: '嗯，谢谢你', time: '14:26' },
    { id: 5, role: 'ai',   content: '不用谢，这是我最想做的事。', time: '14:26' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3 shrink-0"
        style={{
          background: 'rgba(232,220,212,0.55)',
          borderBottom: '1px solid rgba(196,168,158,0.30)',
          backdropFilter: 'blur(12px)',
        }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{ background: 'rgba(245,237,230,0.85)', border: '1px solid #d4bab6' }}>
          🌸
        </div>
        <div>
          <p className="font-hand text-lg font-semibold" style={{ color: '#2e2020' }}>伴侣</p>
          <p className="font-hand text-sm" style={{ color: '#c4aea8' }}>● 在线</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        <div className="text-center">
          <span className="font-hand text-sm px-3 py-1 rounded-full"
            style={{ background: 'rgba(232,216,208,0.60)', color: '#9a7a74', border: '1px solid rgba(196,168,158,0.40)' }}>
            2026年6月29日
          </span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                style={{ background: 'rgba(245,237,230,0.85)', border: '1px solid #d4bab6' }}>
                🌸
              </div>
            )}
            <div className="max-w-xs lg:max-w-md">
              <div className="px-4 py-2.5 text-sm leading-relaxed"
                style={msg.role === 'ai' ? {
                  background: 'rgba(245,237,230,0.80)',
                  border: '1px solid #d4bab6',
                  borderRadius: '4px 16px 16px 16px',
                  color: '#2e2020',
                  backdropFilter: 'blur(4px)',
                } : {
                  background: 'rgba(220,204,196,0.75)',
                  border: '1px solid #c4aea8',
                  borderRadius: '16px 4px 16px 16px',
                  color: '#2e2020',
                  backdropFilter: 'blur(4px)',
                }}>
                {msg.content}
              </div>
              <p className="font-hand text-xs mt-1 px-1"
                style={{ color: '#b09088', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid rgba(196,168,158,0.25)' }}>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{
            background: 'rgba(245,237,230,0.80)',
            border: '1px solid #d4bab6',
            backdropFilter: 'blur(4px)',
          }}>
          <input type="text" placeholder="说点什么…"
            className="flex-1 bg-transparent text-sm outline-none font-sans" style={{ color: '#2e2020' }} />
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{
              background: '#c4aea8',
              border: 'none',
              color: '#f5ede6',
            }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
