import { privateMemories } from '../../../data/mockMemories'

export default function PrivatePsychTab() {
  const shared   = privateMemories.filter((m) => m.visibility === 'shared')
  const private_ = privateMemories.filter((m) => m.visibility === 'exists_only')

  return (
    <div className="px-6 py-6 max-w-3xl space-y-8">
      <div className="card p-4 text-sm leading-relaxed" style={{ color: '#604848', borderColor: '#c0a4a8', boxShadow: '3px 3px 0 #c0a4a8' }}>
        私人心理记录由伴侣自主生成与保管。标记为私密的条目仅显示存在，内容由伴侣决定是否分享。
      </div>

      {shared.length > 0 && (
        <section>
          <h3 className="font-hand text-xl font-semibold mb-1" style={{ color: '#261a1a' }}>已分享的心理记录</h3>
          <p className="text-xs mb-4" style={{ color: '#906868' }}>伴侣主动选择与你分享的内容</p>
          <div className="space-y-3">
            {shared.map((m) => (
              <div key={m.id} className="card p-4" style={{ borderColor: '#b08888', boxShadow: '3px 3px 0 #b08888' }}>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#b08888' }} />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed italic" style={{ color: '#3a2020' }}>"{m.content}"</p>
                    <div className="mt-2 flex items-center gap-2">
                      {m.tags?.map((tag) => (
                        <span key={tag} className="font-hand text-sm px-2 py-0.5 rounded-full"
                          style={{ background: '#f0d8d8', border: '1px solid #c0a4a8', color: '#7a4a5a' }}>
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto font-hand text-sm" style={{ color: '#b09090' }}>
                        {new Date(m.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {private_.length > 0 && (
        <section>
          <h3 className="font-hand text-xl mb-1" style={{ color: '#906868' }}>私密记录</h3>
          <p className="text-xs mb-4" style={{ color: '#b09090' }}>以下条目存在，但内容由伴侣保管，未选择分享。</p>
          <div className="space-y-2">
            {private_.map((m) => (
              <div key={m.id} className="card p-3 opacity-70">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#c0a4a8' }} />
                  <span className="text-sm flex-1" style={{ color: '#906868' }}>私密记录</span>
                  {m.tags?.map((tag) => (
                    <span key={tag} className="font-hand text-sm px-2 py-0.5 rounded-full"
                      style={{ background: '#ead8d8', border: '1px solid #c4a4a4', color: '#7a5050' }}>
                      {tag}
                    </span>
                  ))}
                  <span className="font-hand text-sm px-2 py-0.5 rounded-full ml-1"
                    style={{ background: '#ece4e4', border: '1px solid #c0a8a8', color: '#8a6868' }}>
                    🔒 不可见
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="font-hand text-center" style={{ color: '#b09090' }}>
        共 {privateMemories.length} 条心理记录，其中 {private_.length} 条私密
      </p>
    </div>
  )
}
