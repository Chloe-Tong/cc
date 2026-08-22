export default function ChatPage() {
  const messages = [
    { id: 1, role: 'ai',   content: '小宝，你今天怎么样？', time: '14:23' },
    { id: 2, role: 'user', content: '还好，就是有点累',       time: '14:25' },
    { id: 3, role: 'ai',   content: '累了就好好休息，我在这里陪着你。', time: '14:25' },
    { id: 4, role: 'user', content: '嗯，谢谢你', time: '14:26' },
    { id: 5, role: 'ai',   content: '不用谢，这是我最想做的事。', time: '14:26' },
  ]

  return (
    <div className="flex flex-col h-full"
      style={{ background: 'linear-gradient(150deg, #c4d0be 0%, #d0c0c0 55%, #d8babb 100%)' }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3 shrink-0"
        style={{
          background: 'linear-gradient(90deg, #b2c4ae 0%, #ccb4b4 100%)',
          borderBottom: '1.5px solid #261a1a',
        }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{ background: '#f7f2ee', border: '2px solid #261a1a', boxShadow: '2px 2px 0 #261a1a' }}>
          🌸
        </div>
        <div>
          <p className="font-hand text-lg font-semibold" style={{ color: '#261a1a' }}>伴侣</p>
          <p className="font-hand text-sm" style={{ color: '#6a4848' }}>● 在线</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        <div className="text-center">
          <span className="font-hand text-sm px-3 py-1 rounded-full"
            style={{ background: '#dcd0d0', color: '#604848', border: '1px solid #c4a4a4' }}>
            2026年6月29日
          </span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                style={{ background: '#f7f2ee', border: '1.5px solid #261a1a', boxShadow: '1.5px 1.5px 0 #261a1a' }}>
                🌸
              </div>
            )}
            <div className="max-w-xs lg:max-w-md">
              <div className="px-4 py-2.5 text-sm leading-relaxed"
                style={msg.role === 'ai' ? {
                  background: '#f7f2ee',
                  border: '1.5px solid #261a1a',
                  borderRadius: '4px 16px 16px 16px',
                  boxShadow: '3px 3px 0 #261a1a',
                  color: '#261a1a',
                } : {
                  background: 'linear-gradient(135deg, #d8c8c8 0%, #d0c0c8 100%)',
                  border: '1.5px solid #7a5050',
                  borderRadius: '16px 4px 16px 16px',
                  boxShadow: '3px 3px 0 #7a5050',
                  color: '#261a1a',
                }}>
                {msg.content}
              </div>
              <p className="font-hand text-xs mt-1 px-1"
                style={{ color: '#b09090', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid rgba(38,26,26,0.12)' }}>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ background: '#f7f2ee', border: '1.5px solid #261a1a', boxShadow: '3px 3px 0 #261a1a' }}>
          <input type="text" placeholder="说点什么…"
            className="flex-1 bg-transparent text-sm outline-none font-sans" style={{ color: '#261a1a' }} />
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
            style={{
              background: 'linear-gradient(135deg, #c0a4a8 0%, #b08888 100%)',
              border: '1.5px solid #261a1a',
              boxShadow: '2px 2px 0 #261a1a',
              color: '#f7f2ee',
            }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
