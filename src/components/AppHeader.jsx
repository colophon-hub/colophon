import { Link } from 'react-router-dom'
import mastheadLogo from '../assets/colophon-masthead.svg'

export function AppHeader() {
  return (
    <header className="app-header">
      <Link className="brand" to="/">
        <img src={mastheadLogo} alt="Colophon" className="brand-image" />
      </Link>
      <nav className="header-nav" aria-label="Primary">
        <Link to="/archive">Archive</Link>
        <Link to="/about">About</Link>
      </nav>
    </header>
  )
}
