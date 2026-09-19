/**
 * Card — Defense-grade content container
 *
 * Exports: Card, CardHeader, CardTitle, CardContent, CardFooter
 *
 * Props (Card)
 * ────────────
 * goldAccent : boolean — shows a 3px amber left border strip
 * hoverable  : boolean — lift + glow on hover
 * className  : string
 */

/* ── Sub-components ─────────────────────────────────────── */
export function CardHeader({ children, className = '' }) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-4 border-b border-[#1E2E48] ${className}`}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3
      className={`text-[14px] font-bold tracking-widest uppercase text-slate-300 ${className}`}
    >
      {children}
    </h3>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div
      className={`flex items-center justify-end gap-3 px-5 py-3 border-t border-[#1E2E48] ${className}`}
    >
      {children}
    </div>
  )
}

/* ── Main Card ──────────────────────────────────────────── */
export default function Card({
  children,
  goldAccent = false,
  hoverable = false,
  className = '',
  ...rest
}) {
  return (
    <div
      className={[
        'bg-[#0B1726]/90 border border-[#1E2E48] rounded-xl shadow-xl overflow-hidden',
        goldAccent ? 'border-l-[3px] border-l-[#D4AF37]' : '',
        hoverable
          ? 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(30,95,168,0.18)] hover:border-[#2a4a72]'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
