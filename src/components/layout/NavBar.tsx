import { NavLink } from 'react-router-dom'
import './NavBar.css'

/**
 * Placeholder navigation only — exists to verify routing works, not to
 * preview the Stitch design. Static structure, no business logic: it
 * doesn't read vocabulary/grammar/quiz data, it only links to routes.
 */
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/level/N5', label: 'N5' },
  { to: '/level/N4', label: 'N4' },
  { to: '/level/N3', label: 'N3' },
  { to: '/level/N2', label: 'N2' },
  { to: '/mistakes', label: 'Mistake Book' },
  { to: '/settings', label: 'Settings' },
] as const

export function NavBar() {
  return (
    <nav className="nav-bar" aria-label="Primary">
      <ul className="nav-bar__list">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) => 'nav-bar__link' + (isActive ? ' nav-bar__link--active' : '')}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
