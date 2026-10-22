import { useState, useEffect } from 'react'
import styles from './App.module.css'
import Sidebar from './components/Sidebar/Sidebar'
import HomePage from './pages/HomePage/HomePage'
import LibraryPage from './pages/LibraryPage/LibraryPage'
import HistoryPage from './pages/HistoryPage/HistoryPage'
import ScanPage from './pages/ScanPage/ScanPage'
import SettingsPage from './pages/SettingsPage/SettingsPage'
import SetupWizard from './components/SetupWizard/SetupWizard'
import { GamesProvider } from './context/GamesContext'
import { SettingsProvider } from './context/SettingsContext'
import { NotificationProvider } from './context/NotificationContext'
import { NotificationToastContainer } from './components/NotificationToast/NotificationToast'

export type Page = 'home' | 'library' | 'history' | 'scan' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [showWizard, setShowWizard] = useState<boolean | null>(null)

  useEffect(() => {
    window.electronAPI.isFirstRun().then(isFirst => {
      setShowWizard(isFirst)
    })
  }, [])

  if (showWizard === null) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
      </div>
    )
  }

  if (showWizard) {
    return (
      <SettingsProvider>
        <NotificationProvider onNavigate={setPage}>
          <GamesProvider>
            <SetupWizard onComplete={() => setShowWizard(false)} />
            <NotificationToastContainer />
          </GamesProvider>
        </NotificationProvider>
      </SettingsProvider>
    )
  }

  return (
    <SettingsProvider>
      <NotificationProvider onNavigate={setPage}>
        <GamesProvider>
          <div className={styles.appShell}>
            <Sidebar currentPage={page} onNavigate={setPage} />
            <main className={styles.main}>
              {page === 'home' && <HomePage onNavigate={setPage} />}
              {page === 'library' && <LibraryPage />}
              {page === 'history' && <HistoryPage />}
              {page === 'scan' && <ScanPage />}
              {page === 'settings' && <SettingsPage />}
            </main>
            <NotificationToastContainer />
          </div>
        </GamesProvider>
      </NotificationProvider>
    </SettingsProvider>
  )
}
