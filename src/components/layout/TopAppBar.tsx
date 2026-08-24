import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import './TopAppBar.css'

export function TopAppBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="top-app-bar">
      <div className="top-app-bar__inner">
        <button
          type="button"
          className="top-app-bar__icon-btn squish-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
          aria-haspopup="true"
        >
          <span className="material-symbols-outlined" data-fill="1">
            menu
          </span>
        </button>
        <Link to="/" className="top-app-bar__title text-headline-lg-mobile">
          Michi
        </Link>
        <Link to="/profile" className="top-app-bar__avatar squish-btn" aria-label="Your profile">
          <Avatar size={40} />
        </Link>
      </div>
    </header>
  )
}
