interface Props {
  icon: string
  title: string
  subtitle?: string
}

export default function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center select-none">
      <div style={{
        fontSize: 44,
        lineHeight: 1,
        marginBottom: 16,
        opacity: 0.45,
        filter: 'grayscale(30%)',
      }}>
        {icon}
      </div>
      <p className="font-hand text-xl" style={{ color: '#c4aea8', marginBottom: 6 }}>
        {title}
      </p>
      {subtitle && (
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#d4bab6' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
