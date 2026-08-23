import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import { useUserSettings } from '../../hooks/useUserSettings'
import './NavDrawer.css'

const DRAWER_LINKS = [
  { to: '/levels', label: 'JLPT Levels', icon: 'grade' },
  { to: '/profile', label: 'Profile', icon: 'account_circle' },
  { to: '/resources', label: 'Resources', icon: 'library_books' },
] as const

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useUserSettings()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Keyboard users have no pointer-based way to dismiss the drawer (the
  // overlay is click-only) — Escape is the standard way to close a modal
  // panel like this one. Also move focus onto the drawer's close button
  // when it opens, so keyboard/screen-reader users land somewhere inside
  // it rather than on a now-hidden trigger.
  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      <div
        className={'nav-drawer-overlay' + (open ? ' nav-drawer-overlay--open' : '')}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={'nav-drawer' + (open ? ' nav-drawer--open' : '')}
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <button type="button" className="nav-drawer__close squish-btn" onClick={onClose} aria-label="Close menu" ref={closeButtonRef}>
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="nav-drawer__header">
          <Avatar size={48} />
          <div>
            <h2 className="text-title-md nav-drawer__name">Nihongo Learner</h2>
            <p className="text-label-sm nav-drawer__level">
              {settings?.targetLevel ? `Target: Level ${settings.targetLevel}` : 'No target level set'}
            </p>
          </div>
        </div>
        <nav className="nav-drawer__nav">
          {DRAWER_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="nav-drawer__link" onClick={onClose}>
              <span className="material-symbols-outlined">{link.icon}</span>
              <span className="text-title-md">{link.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
