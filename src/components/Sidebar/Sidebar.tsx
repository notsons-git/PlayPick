import type { Page } from '../../App'
import { LucideIcon, Home, Library, Clock, Search, Settings } from 'lucide-react'
import styles from './Sidebar.module.css'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

interface NavItem {
  page: Page
  label: string
  Icon: LucideIcon
}

const navItems: NavItem[] = [
  { page: 'home', label: 'Главная', Icon: Home },
  { page: 'library', label: 'Моя библиотека', Icon: Library },
  { page: 'history', label: 'История', Icon: Clock },
  { page: 'scan', label: 'Поиск игр', Icon: Search },
  { page: 'settings', label: 'Настройки', Icon: Settings },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>▲</span>
        <span className={styles.logoText}>PlayPick</span>
      </div>
      <nav className={styles.nav}>
        {navItems.map(({ page, label, Icon }) => (
          <button
            key={page}
            className={`${styles.navItem} ${currentPage === page ? styles.active : ''}`}
            onClick={() => onNavigate(page)}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
