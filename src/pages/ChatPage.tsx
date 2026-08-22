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
          background: 'rgba(255,251,252,0.75)',
          borderBottom: '1px solid #f2ccd8',
          backdropFilter: 'blur(8px)',
        }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{ background: 'linear-gradient(135deg, #fde8f2 0%, #f9dcea 100%)', border: '1px solid #f0c4d4' }}>
          🌸
        </div>
        <div>
          <p className="font-hand text-lg font-semibold" style={{ color: '#2e1a24' }}>伴侣</p>
          <p className="font-hand text-sm" style={{ color: '#e8a0b8' }}>● 在线</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        <div className="text-center">
          <span className="font-hand text-sm px-3 py-1 rounded-full"
            style={{ background: 'rgba(255,251,252,0.7)', color: '#c090a8', border: '1px solid #f0c4d4' }}>
            2026年6月29日
          </span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #fde8f2 0%, #f9dcea 100%)', border: '1px solid #f0c4d4' }}>
                🌸
              </div>
            )}
            <div className="max-w-xs lg:max-w-md">
              <div className="px-4 py-2.5 text-sm leading-relaxed"
                style={msg.role === 'ai' ? {
                  background: 'rgba(255,251,252,0.85)',
                  border: '1px solid #f0c4d4',
                  borderRadius: '4px 16px 16px 16px',
                  color: '#2e1a24',
                } : {
                  background: 'linear-gradient(135deg, #fde0ea 0%, #f8d0e2 100%)',
                  border: '1px solid #e8b0c8',
                  borderRadius: '16px 4px 16px 16px',
                  color: '#2e1a24',
                }}>
                {msg.content}
              </div>
              <p className="font-hand text-xs mt-1 px-1"
                style={{ color: '#d0a8b8', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid rgba(242,204,216,0.5)' }}>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ background: 'rgba(255,251,252,0.85)', border: '1px solid #f0c4d4' }}>
          <input type="text" placeholder="说点什么…"
            className="flex-1 bg-transparent text-sm outline-none font-sans" style={{ color: '#2e1a24' }} />
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
            style={{
              background: 'linear-gradient(135deg, #e8a0b8 0%, #d4789a 100%)',
              border: 'none',
              color: '#fff',
            }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
