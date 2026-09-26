
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

interface NavLink {
  path: string;
  label: string;
}

const navLinks: NavLink[] = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
];

const utilityLinks: NavLink[] = [];

const NavBar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="fixed w-full z-50 bg-aura-background/80 backdrop-blur-lg border-b border-aura-accent/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center" onClick={closeMobile}>
            <span className="text-xl font-bold font-heading bg-gradient-to-r from-aura-accent to-aura-accentSecondary bg-clip-text text-transparent">
              Vibe Tech
            </span>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden xl:flex items-center space-x-5">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm text-white hover:text-aura-accent transition-colors"
                onClick={closeMobile}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          {/* Theme toggle and mobile menu button */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <button
              className="xl:hidden text-white hover:text-aura-accent"
              data-testid="mobile-menu-button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label="Toggle mobile menu"
              onClick={() => setMobileOpen((value) => !value)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>
          </div>
        </div>
        <nav
          id="mobile-nav"
          data-testid="mobile-nav"
          className={`${mobileOpen ? 'block' : 'hidden'} xl:hidden pb-4`}
        >
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={`mobile-${link.path}`}
                to={link.path}
                className="text-white hover:text-aura-accent transition-colors py-1"
                onClick={closeMobile}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-aura-accent/10 pt-2">
              {utilityLinks.map((link) => (
                <Link
                  key={`mobile-utility-${link.path}`}
                  to={link.path}
                  className="block text-white/75 hover:text-aura-accent transition-colors py-1 text-sm"
                  onClick={closeMobile}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
