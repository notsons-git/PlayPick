import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Settings } from '../types/electron'

interface SettingsContextValue {
  settings: Settings | null
  updateSettings: (updates: Partial<Settings>) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings)
  }, [])

  const updateSettings = async (updates: Partial<Settings>): Promise<void> => {
    const updated = await window.electronAPI.updateSettings(updates)
    setSettings(updated)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
