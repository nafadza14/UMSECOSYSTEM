import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ListChecks,
  PieChart,
  Users,
  Truck,
  ArrowLeft,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import ThemeToggle from '../ThemeToggle'
import { useAuth } from '../../contexts/AuthContext'

export type ViewKey = 'overview' | 'feed' | 'product' | 'customer' | 'supplier'

export const NAV: { key: ViewKey; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { key: 'feed', label: 'Live Feed', icon: ListChecks },
  { key: 'product', label: 'Per Produk', icon: PieChart },
  { key: 'customer', label: 'Customer', icon: Users },
  { key: 'supplier', label: 'Supplier', icon: Truck },
]

export default function Sidebar({
  active,
  onSelect,
}: {
  active: ViewKey
  onSelect: (v: ViewKey) => void
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = NAV.filter((nav) => {
    if (user?.role === 'admin') {
      return nav.key === 'feed';
    }
    if (user?.role === 'klien') {
      return nav.key === 'overview' || nav.key === 'feed';
    }
    return true; // owner, manager
  });

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-[var(--border)] min-h-screen sticky top-0 p-4">
      <Link to="/" className="flex items-baseline gap-2 px-2 py-2 mb-4">
        <span className="text-lg font-semibold tracking-tight">UMS</span>
        <span className="text-[11px] text-[var(--muted)]">Truck Scale</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {filteredNav.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              active === key
                ? 'bg-[var(--chip)] text-[var(--text)] font-medium'
                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t border-[var(--border)] mt-4">
        <div className="px-2 mb-4">
          <div className="text-sm font-medium">{user?.name}</div>
          <div className="text-xs text-[var(--muted)] capitalize flex justify-between items-center">
            <span>{user?.role}</span>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700" title="Logout">
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft className="w-4 h-4" /> Beranda
          </Link>
          <ThemeToggle className="text-[var(--text)] hover:bg-[var(--chip)]" />
        </div>
      </div>

    </aside>
  )
}
