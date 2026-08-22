import type { CSSProperties } from 'react'

interface P { size?: number; style?: CSSProperties; className?: string }

const C = 'currentColor'
const s = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2 }
const ANGLES = [0, 72, 144, 216, 288]

export function IconBlossom({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      {ANGLES.map(r => (
        <path key={r}
          d="M12 12 C10.2 10 9.8 7 12 6.2 C14.2 7 13.8 10 12 12Z"
          fill={C} opacity={0.9} transform={`rotate(${r} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.5" fill="rgba(245,237,230,0.92)" />
      {ANGLES.map(r => (
        <circle key={r} cx="12" cy="9.2" r="0.55" fill={C} opacity={0.5}
          transform={`rotate(${r} 12 12)`} />
      ))}
    </svg>
  )
}

export function IconChat({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <path d="M5 6.5 Q4 4.5 6.5 4.5 L17.5 4.5 Q20 4.5 20 7 L20 13.5 Q20 15.5 17.5 15.5 L11 15.5 L8.5 18.8 L8.8 15.5 L6.5 15.5 Q4 15.5 4 13 Z"
        stroke={C} {...s} />
      <path d="M12 12.8 C9.5 11.2 8.5 9.8 8.5 9 Q8.5 7.8 9.5 7.8 Q10.5 7.8 12 9.3 Q13.5 7.8 14.5 7.8 Q15.5 7.8 15.5 9 Q15.5 9.8 12 12.8Z"
        fill={C} opacity={0.8} stroke="none" />
    </svg>
  )
}

export function IconBrain({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <path d="M12 18.5 C9.5 18.5 7 17 6 14.5 C5 12 5.5 9.5 7 8 C7.5 7.3 8 6.6 8 5.8 C8 4.3 9 3.5 10.8 3.8 C11.3 3.9 11.7 4.3 12 4.8"
        stroke={C} {...s} />
      <path d="M12 4.8 C12.3 4.3 12.7 3.9 13.2 3.8 C15 3.5 16 4.3 16 5.8 C16 6.6 16.5 7.3 17 8 C18.5 9.5 19 12 18 14.5 C17 17 14.5 18.5 12 18.5"
        stroke={C} {...s} />
      <line x1="12" y1="4.8" x2="12" y2="18.5" stroke={C} {...s} />
      <path d="M9 9.5 C9.8 9 11 9.3 11.5 10.5" stroke={C} {...s} />
      <path d="M8.5 13.5 C9.5 13 10.8 13.3 11.5 14.5" stroke={C} {...s} />
      <path d="M15 9.5 C14.2 9 13 9.3 12.5 10.5" stroke={C} {...s} />
      <path d="M15.5 13.5 C14.5 13 13.2 13.3 12.5 14.5" stroke={C} {...s} />
    </svg>
  )
}

export function IconLightning({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <path d="M14.5 3 L8.5 13.5 L13 13.5 L10 21 L17.5 10.5 L13 10.5 Z"
        fill={C} opacity={0.85} stroke="none" />
      <path d="M18.5 3.5 L18.85 4.65 L20 5 L18.85 5.35 L18.5 6.5 L18.15 5.35 L17 5 L18.15 4.65 Z"
        fill={C} opacity={0.7} stroke="none" />
      <path d="M20 8 L20.15 8.45 L20.6 8.6 L20.15 8.75 L20 9.2 L19.85 8.75 L19.4 8.6 L19.85 8.45 Z"
        fill={C} opacity={0.5} stroke="none" />
    </svg>
  )
}

export function IconSettings({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <line x1="3.5" y1="7" x2="20.5" y2="7" stroke={C} {...s} />
      <circle cx="8.5" cy="7" r="2.7" stroke={C} {...s} />
      <line x1="3.5" y1="13" x2="20.5" y2="13" stroke={C} {...s} />
      <circle cx="15.5" cy="13" r="2.7" stroke={C} {...s} />
      <line x1="3.5" y1="19" x2="20.5" y2="19" stroke={C} {...s} />
      <circle cx="9.5" cy="19" r="2.7" stroke={C} {...s} />
    </svg>
  )
}

export function IconBooks({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <rect x="5" y="17" width="14" height="3.5" rx="1.5" stroke={C} {...s} />
      <line x1="8.5" y1="17" x2="8.5" y2="20.5" stroke={C} {...s} />
      <rect x="5.5" y="12.2" width="13" height="4" rx="1.5" stroke={C} {...s} />
      <line x1="9" y1="12.2" x2="9" y2="16.2" stroke={C} {...s} />
      <rect x="6" y="7.5" width="12" height="4" rx="1.5" stroke={C} {...s} />
      <line x1="9.5" y1="7.5" x2="9.5" y2="11.5" stroke={C} {...s} />
    </svg>
  )
}

export function IconCamera({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <rect x="3" y="8.5" width="18" height="11" rx="2.5" stroke={C} {...s} />
      <circle cx="12" cy="14" r="4" stroke={C} {...s} />
      <circle cx="12" cy="14" r="2.2" stroke={C} {...s} />
      <path d="M8.5 8.5 L8.5 6.5 Q8.5 5.5 9.5 5.5 L14 5.5 Q15 5.5 15 6.5 L15 8.5" stroke={C} {...s} />
      <circle cx="17.5" cy="11" r="1.1" fill={C} stroke="none" />
    </svg>
  )
}

export function IconInfinity({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <path d="M12 12 C14.5 7.5 21 7.5 21 12 C21 16.5 14.5 16.5 12 12 C9.5 7.5 3 7.5 3 12 C3 16.5 9.5 16.5 12 12"
        stroke={C} {...s} />
      <path d="M12 14 C12 14 10.2 12.6 10.2 11.5 Q10.2 10.5 11 10.5 Q11.6 10.5 12 11.1 Q12.4 10.5 13 10.5 Q13.8 10.5 13.8 11.5 Q13.8 12.6 12 14Z"
        fill={C} stroke="none" />
    </svg>
  )
}

export function IconHeart({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <path d="M12 20.5 C12 20.5 3.5 14.5 3.5 8.5 Q3.5 4 8 4 Q10.5 4 12 7 Q13.5 4 16 4 Q20.5 4 20.5 8.5 Q20.5 14.5 12 20.5Z"
        stroke={C} {...s} />
      <path d="M18.5 3 L18.9 4.3 L20.2 4.7 L18.9 5.1 L18.5 6.4 L18.1 5.1 L16.8 4.7 L18.1 4.3 Z"
        fill={C} stroke="none" />
      <path d="M20.3 7.5 L20.48 8.08 L21.08 8.26 L20.48 8.44 L20.3 9.02 L20.12 8.44 L19.52 8.26 L20.12 8.08 Z"
        fill={C} stroke="none" />
      <path d="M5.5 3 L5.9 4.3 L7.2 4.7 L5.9 5.1 L5.5 6.4 L5.1 5.1 L3.8 4.7 L5.1 4.3 Z"
        fill={C} stroke="none" />
    </svg>
  )
}

export function IconScale({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <line x1="12" y1="4" x2="12" y2="20.5" stroke={C} {...s} />
      <circle cx="12" cy="5.2" r="1.6" stroke={C} {...s} />
      <line x1="5" y1="8.5" x2="19" y2="8.5" stroke={C} {...s} />
      <line x1="7" y1="8.5" x2="7" y2="14.5" stroke={C} {...s} />
      <path d="M4 14.5 Q7 17.5 10 14.5" stroke={C} {...s} />
      <line x1="17" y1="8.5" x2="17" y2="14.5" stroke={C} {...s} />
      <path d="M14 14.5 Q17 17.5 20 14.5" stroke={C} {...s} />
      <line x1="9.5" y1="20.5" x2="14.5" y2="20.5" stroke={C} {...s} />
    </svg>
  )
}

export function IconTrash({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <path d="M6.5 9 L7.5 20 L16.5 20 L17.5 9" stroke={C} {...s} />
      <line x1="4.5" y1="9" x2="19.5" y2="9" stroke={C} {...s} />
      <path d="M9.5 9 L9.5 7 Q9.5 6 10.5 6 L13.5 6 Q14.5 6 14.5 7 L14.5 9" stroke={C} {...s} />
      <line x1="10.5" y1="11.5" x2="10.8" y2="17.5" stroke={C} {...s} />
      <line x1="12" y1="11.5" x2="12" y2="17.5" stroke={C} {...s} />
      <line x1="13.5" y1="11.5" x2="13.2" y2="17.5" stroke={C} {...s} />
    </svg>
  )
}

export function IconAnchor({ size = 24, style, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
      <circle cx="12" cy="6" r="3" stroke={C} {...s} />
      <line x1="12" y1="9" x2="12" y2="20.5" stroke={C} {...s} />
      <line x1="6.5" y1="13" x2="17.5" y2="13" stroke={C} {...s} />
      <path d="M7 20.5 Q12 23 17 20.5" stroke={C} {...s} />
      <line x1="7" y1="17.5" x2="7" y2="20.5" stroke={C} {...s} />
      <line x1="17" y1="17.5" x2="17" y2="20.5" stroke={C} {...s} />
    </svg>
  )
}
