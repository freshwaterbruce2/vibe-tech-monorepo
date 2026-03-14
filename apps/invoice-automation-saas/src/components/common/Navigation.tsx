import type React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Button from './Button'

interface NavigationProps {
  variant?: 'public' | 'app'
}

const Navigation = ({ variant = 'app' }: NavigationProps) => {
  const { user, signOut } = useAuth()

  return (
    <header className="ui-nav">
      <div className="ui-container ui-nav__inner">
        <Link to="/" className="ui-brand">
          InvoiceFlow
        </Link>

        <nav className="ui-nav__links" aria-label="Primary">
          {variant === 'app' ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'is-active' : '')}>
                Dashboard
              </NavLink>
              <NavLink to="/clients" className={({ isActive }) => (isActive ? 'is-active' : '')}>
                Clients
              </NavLink>
              <NavLink
                to="/invoice/new"
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                New Invoice
              </NavLink>
            </>
          ) : (
            <>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
            </>
          )}
        </nav>

        <div className="ui-nav__actions">
          {user ? (
            <>
              <span className="ui-muted" title={user.email ?? undefined}>
                {user.email}
              </span>
              <Button variant="ghost" onClick={() => void signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link className="ui-link" to="/login">
                Log in
              </Link>
              <Link to="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navigation
