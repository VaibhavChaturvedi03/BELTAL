/**
 * SiteHeader — shared navbar used by every page.
 *
 * On the Home page  → nav links scroll to anchor sections (#platform, etc.)
 * On other pages    → nav links navigate to / and scroll once the landing
 *                     page's sections exist (handled by ScrollToHashSection
 *                     in App.jsx) — this is a real SPA transition, never a
 *                     full page reload.
 *
 * Props
 * ─────
 * mode : 'home' | 'page'
 *   'home'  – links are in-page anchors; IntersectionObserver drives the active
 *             tab and the animated sliding underline is shown.
 *   'page'  – links navigate to the home route (client-side) then scroll;
 *             no IntersectionObserver or sliding indicator (there are no
 *             matching sections on the page itself).
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

/* ── Brand lockup ────────────────────────────────────────── */
function BELNavBrand() {
  return (
    <div className="flex items-center gap-3.5 py-1">
      <img
        src="/bel-shield.svg"
        alt="BEL Emblem"
        className="h-10 sm:h-14 md:h-16 w-auto object-contain flex-shrink-0 drop-shadow-sm"
      />
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="bg-[#0B1E36] text-white text-[10px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">
            BEL
          </span>
          <span className="hidden sm:inline text-[10.5px] font-bold tracking-[0.14em] text-[#A37E2C] uppercase whitespace-nowrap">
            Govt. of India • Sovereign Ledger
          </span>
        </div>

        <div className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider leading-none">
          <span className="text-[#0B2545]">BEL</span>
          <span className="text-[#1565C0]">TAL</span>
        </div>

        {/* Full descriptive tagline only where there's room for it (tablet+) */}
        <div className="hidden md:block pt-0.5 border-b-2 border-[#C59B27] w-fit">
          <span className="text-[8.5px] font-bold tracking-wider text-slate-500 uppercase block">
            Blockchain-Enabled Trusted Access &amp; Digital Asset Ledger &amp; ASSET PROVENANCE
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────── */
export default function SiteHeader({ mode = 'home' }) {
  const isHome = mode === 'home'

  const navLinks = [
    { label: 'Platform',    id: 'platform' },
    { label: 'Features',    id: 'features' },
    { label: 'Technology',  id: 'technology' },
    { label: 'Use Cases',   id: 'use-cases' },
    { label: 'About BEL',   id: 'about-bel' },
  ]

  const [activeTab,  setActiveTab]  = useState('platform')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  // While true, the IntersectionObserver ignores what's scrolling past —
  // set the instant a nav link is clicked, cleared once the resulting
  // scroll has actually settled (debounced on the 'scroll' event itself,
  // so it adapts to however long the scroll really takes instead of a
  // guessed timeout). This is what stopped the sliding indicator from
  // being yanked to whatever section flew past mid-scroll.
  const suppressObserverRef = useRef(false)
  const settleTimerRef = useRef(null)

  const releaseObserverWhenSettled = () => {
    const SETTLE_MS = 150
    const onScroll = () => {
      clearTimeout(settleTimerRef.current)
      settleTimerRef.current = setTimeout(() => {
        suppressObserverRef.current = false
        window.removeEventListener('scroll', onScroll)
      }, SETTLE_MS)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // arm the timer immediately in case the scroll distance is ~0
  }

  useEffect(() => () => clearTimeout(settleTimerRef.current), [])

  /* IntersectionObserver — auto-update active tab from visible section */
  useEffect(() => {
    if (!isHome) return
    const sectionIds = navLinks.map(l => l.id)
    const observers  = []
    const ratioMap   = {}

    sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      ratioMap[id] = 0

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (suppressObserverRef.current) return
          ratioMap[id] = entry.intersectionRatio
          const best = Object.entries(ratioMap).reduce(
            (a, b) => (b[1] > a[1] ? b : a),
            ['', 0]
          )
          if (best[1] > 0) setActiveTab(best[0])
        },
        { threshold: Array.from({ length: 21 }, (_, i) => i * 0.05) }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome])

  /* Close the mobile menu on Escape, or if the viewport grows past the md breakpoint */
  useEffect(() => {
    if (!isMenuOpen) return
    const handleKeyDown = e => { if (e.key === 'Escape') setIsMenuOpen(false) }
    const handleResize = () => { if (window.innerWidth >= 768) setIsMenuOpen(false) }
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMenuOpen])

  const handleClick = (e, id) => {
    e.preventDefault()
    setIsMenuOpen(false)

    if (!isHome) {
      // SPA navigation, never a full reload — ScrollToHashSection (mounted
      // once in App.jsx) picks up the hash once the landing page's
      // sections actually exist and scrolls to it.
      navigate(`/#${id}`)
      return
    }

    suppressObserverRef.current = true
    setActiveTab(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    releaseObserverWhenSettled()
  }

  const renderLink = (label, id, extraClass) => {
    const isActive = isHome && activeTab === id
    return (
      <a
        key={id}
        href={isHome ? `#${id}` : `/#${id}`}
        onClick={e => handleClick(e, id)}
        className={`relative ${extraClass} ${
          isActive
            ? 'text-secondary font-bold'
            : 'text-on-surface-variant hover:text-secondary'
        }`}
      >
        {label}
        {isActive && (
          <motion.span
            layoutId="nav-underline"
            className="absolute left-0 right-0 -bottom-[3px] h-[2.5px] rounded-full bg-secondary"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        )}
      </a>
    )
  }

  return (
    <header className="sticky top-0 w-full z-40 border-b border-surface-container-highest shadow-[0_1px_8px_rgba(13,43,78,0.06)] bg-[#FFFDF5]">
      <div className="min-h-16 md:h-20 py-2 md:py-0 max-w-7xl mx-auto px-margin flex items-center justify-between">

        {/* Brand — always links home */}
        <Link to="/" className="flex items-center">
          <BELNavBrand />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-space-xl h-full relative">
          {navLinks.map(({ label, id }) =>
            renderLink(label, id, 'transition-colors duration-200 py-space-sm font-title-md text-title-md')
          )}
        </nav>

        {/* CTA + avatar */}
        <div className="flex items-center gap-space-md">
          <button
            onClick={() => navigate('/contact')}
            className="hidden md:inline-flex bg-secondary text-on-secondary hover:bg-primary-container font-label-md text-label-md px-space-lg py-space-sm rounded-lg transition-colors items-center shadow-sm cursor-pointer"
          >
            Contact Us
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-primary-container hover:bg-surface-container-low transition-colors cursor-pointer"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setIsMenuOpen(open => !open)}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

      </div>

      {/* Mobile nav panel */}
      {isMenuOpen && (
        <nav
          id="mobile-nav-panel"
          aria-label="Mobile navigation"
          className="md:hidden border-t border-surface-container-highest bg-[#FFFDF5] px-margin py-space-md flex flex-col gap-1"
        >
          {navLinks.map(({ label, id }) => {
            const isActive = isHome && activeTab === id
            return (
              <a
                key={id}
                href={isHome ? `#${id}` : `/#${id}`}
                onClick={e => handleClick(e, id)}
                className={
                  isActive
                    ? 'font-title-md text-title-md font-bold text-secondary py-space-sm px-space-sm rounded-lg bg-surface-container-low'
                    : 'font-title-md text-title-md text-on-surface-variant hover:text-secondary hover:bg-surface-container-low transition-colors py-space-sm px-space-sm rounded-lg'
                }
              >
                {label}
              </a>
            )
          })}
          <button
            onClick={() => { setIsMenuOpen(false); navigate('/contact') }}
            className="mt-space-sm bg-secondary text-on-secondary hover:bg-primary-container font-label-md text-label-md px-space-lg py-space-sm rounded-lg transition-colors flex items-center justify-center shadow-sm cursor-pointer"
          >
            Contact Us
          </button>
        </nav>
      )}
    </header>
  )
}
