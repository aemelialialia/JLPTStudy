import { NavLink } from 'react-router-dom'
import './BottomNav.css'

/**
 * The app's one primary navigation surface (spec section 1): exactly
 * three destinations — Vocabulary, Dashboard, Grammar. Profile and
 * Resources are deliberately NOT here; they live in the slide-out
 * NavDrawer per the spec's explicit structure.
 */
const NAV_ITEMS = [
  { to: '/study', label: 'Vocabulary', icon: 'translate' },
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/grammar', label: 'Grammar', icon: 'menu_book' },
] as const

export function BottomNav() {
  return (
    <>
      {/* Mobile: floating pill tab bar, thumb-reachable. */}
      <nav className="bottom-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) => 'bottom-nav__item' + (isActive ? ' bottom-nav__item--active' : '')}
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined" data-fill={isActive ? '1' : '0'}>
                  {item.icon}
                </span>
                <span className="bottom-nav__label text-label-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {/* Desktop/tablet: a slim top link row instead of a floating dock. */}
      <nav className="top-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) => 'top-nav__item text-title-md' + (isActive ? ' top-nav__item--active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
