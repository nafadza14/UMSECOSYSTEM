import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

const links = ['Ecosystem', 'Solutions', 'Dashboard', 'About']

export default function Navbar() {
  return (
    <div className="px-6 md:px-12 lg:px-16 pt-6">
      <nav className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between text-white">
        {/* Left: Logo */}
        <Link to="/" className="text-2xl font-semibold tracking-tight">
          UMS
        </Link>

        {/* Center: Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((label) =>
            label === 'Dashboard' ? (
              <Link
                key={label}
                to="/dashboard"
                className="text-sm text-white/90 hover:text-gray-300 transition-colors"
              >
                {label}
              </Link>
            ) : (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="text-sm text-white/90 hover:text-gray-300 transition-colors"
              >
                {label}
              </a>
            ),
          )}
        </div>

        {/* Right: theme toggle + CTA */}
        <div className="flex items-center gap-2">
          <ThemeToggle className="text-white/90 hover:bg-white/10" />
          <Link
            to="/dashboard"
            className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </nav>
    </div>
  )
}
