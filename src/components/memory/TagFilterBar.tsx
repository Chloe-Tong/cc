interface Props {
  allTags: string[]
  selected: string[]
  onToggle: (tag: string) => void
  onClear: () => void
}

export default function TagFilterBar({ allTags, selected, onToggle, onClear }: Props) {
  if (allTags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-5">
      {allTags.map((tag) => {
        const active = selected.includes(tag)
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className="font-hand text-xs px-2.5 py-1 rounded-full transition-all"
            style={active ? {
              background: '#b09088',
              border: '1px solid #7a5a54',
              color: '#f5ede6',
              fontWeight: 500,
            } : {
              background: 'rgba(232,220,212,0.55)',
              border: '1px solid #c4aea8',
              color: '#7a5a54',
            }}
          >
            {tag}
          </button>
        )
      })}
      {selected.length > 0 && (
        <button
          onClick={onClear}
          className="font-hand text-xs px-2 py-1 transition-colors"
          style={{ color: '#b09088' }}
        >
          清除
        </button>
      )}
    </div>
  )
}

// Helper: derive sorted unique tags from a list of memories
export function extractTags(memories: Array<{ tags?: string[] }>): string[] {
  const set = new Set<string>()
  for (const m of memories) {
    for (const t of m.tags ?? []) set.add(t)
  }
  return [...set].sort()
}

// Helper: filter memories by selected tags (AND logic — must have all selected tags)
export function filterByTags<T extends { tags?: string[] }>(
  memories: T[],
  selected: string[],
): T[] {
  if (selected.length === 0) return memories
  return memories.filter((m) => selected.every((t) => m.tags?.includes(t)))
}
