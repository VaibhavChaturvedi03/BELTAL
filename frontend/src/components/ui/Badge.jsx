/**
 * Badge — colour-coded labels for roles, classification tiers and clearance levels
 *
 * Exports: RoleBadge, TierBadge, ClearanceBadge
 *
 * Roles use categorical hues (each role is its own colour, plus an icon).
 * Tiers and clearance levels share one green → yellow → orange → red scale, so a
 * higher number always reads as "more sensitive". The tier badge also draws
 * 1–4 signal bars, so it never relies on colour alone.
 *
 * Class names are written out in full (never concatenated) so Tailwind can see them.
 */

const BASE =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none whitespace-nowrap'

const ROLE_META = {
  ADMIN: {
    label: 'Admin',
    icon: 'admin_panel_settings',
    tone: 'bg-violet-100 text-violet-800 border-violet-300',
  },
  MANAGER: {
    label: 'Manager',
    icon: 'supervisor_account',
    tone: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  AUDITOR: {
    label: 'Auditor',
    icon: 'fact_check',
    tone: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  USER: {
    label: 'User',
    icon: 'person',
    tone: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  },
  SYSTEM_CONNECTOR: {
    label: 'System connector',
    icon: 'hub',
    tone: 'bg-slate-200 text-slate-800 border-slate-400',
  },
}

const LEVEL_TONE = {
  1: 'bg-green-100 text-green-800 border-green-300',
  2: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  3: 'bg-orange-100 text-orange-800 border-orange-300',
  4: 'bg-red-100 text-red-800 border-red-300',
}
const NEUTRAL_TONE = 'bg-slate-100 text-slate-600 border-slate-300'

const toLevel = (value) => {
  const level = Number(value)
  return Number.isInteger(level) && level >= 1 && level <= 4 ? level : null
}

export function RoleBadge({ role, className = '' }) {
  if (!role) return <span className={`${BASE} ${NEUTRAL_TONE} ${className}`}>—</span>
  const meta = ROLE_META[role]
  return (
    <span className={`${BASE} ${meta?.tone ?? NEUTRAL_TONE} ${className}`} title={`Role: ${role}`}>
      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
        {meta?.icon ?? 'badge'}
      </span>
      {meta?.label ?? role}
    </span>
  )
}

const BAR_HEIGHTS = ['h-1', 'h-1.5', 'h-2', 'h-2.5']

function SignalBars({ level }) {
  return (
    <span className="flex h-2.5 items-end gap-px" aria-hidden="true">
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={height}
          className={`w-[3px] rounded-[1px] bg-current ${height} ${index < level ? '' : 'opacity-25'}`}
        />
      ))}
    </span>
  )
}

export function TierBadge({ tier, className = '' }) {
  const level = toLevel(tier)
  if (!level) return <span className={`${BASE} ${NEUTRAL_TONE} ${className}`}>—</span>
  return (
    <span className={`${BASE} ${LEVEL_TONE[level]} ${className}`} title={`Classification tier ${level} of 4`}>
      <SignalBars level={level} />
      Tier {level}
    </span>
  )
}

export function ClearanceBadge({ level: value, className = '' }) {
  const level = toLevel(value)
  if (!level) return <span className={`${BASE} ${NEUTRAL_TONE} ${className}`}>—</span>
  return (
    <span className={`${BASE} ${LEVEL_TONE[level]} ${className}`} title={`Clearance level ${level} of 4`}>
      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
        verified_user
      </span>
      Level {level}
    </span>
  )
}
