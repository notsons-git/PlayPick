import { getDb } from './init'
import type { Settings } from '../../src/types/electron'

const DEFAULTS: Settings = {
  soundEnabled: true,
  animationDuration: 5000,
  animationType: 'sequential',
  launchMode: 'manual',
  launchCountdownSeconds: 5,
  excludeRecentDays: 0,
  favoriteWeightBonus: 0,
  autoScan: false,
  theme: 'dark',
  language: 'ru',
  notificationSoundEnabled: true,
  notificationVolume: 0.4,
  librarySortBy: 'title',
  librarySortOrder: 'asc',
}

export function getSettings(): Settings {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]

  const settings: Partial<Settings> = {}
  for (const row of rows) {
    try {
      (settings as Record<string, unknown>)[row.key] = JSON.parse(row.value)
    } catch {
      (settings as Record<string, unknown>)[row.key] = row.value
    }
  }

  return { ...DEFAULTS, ...settings }
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const db = getDb()

  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const deleteKey = db.prepare('DELETE FROM settings WHERE key = ?')

  const validAnimationTypes = ['sequential', 'random', 'cases', 'horizontal_wheel', 'vertical_wheel']
  const validSortBy = ['title', 'state', 'platform', 'date']
  const validSortOrder = ['asc', 'desc']

  for (const [key, rawValue] of Object.entries(updates)) {
    // 1. If value is explicitly undefined, do NOT modify existing setting
    if (rawValue === undefined) {
      continue
    }

    // 2. If value is null or empty string for optional string settings, remove it from settings table
    if (rawValue === null || rawValue === '') {
      deleteKey.run(key)
      continue
    }

    let valueToStore = rawValue

    // 3. Validation & sanitation
    if (key === 'animationDuration') {
      const num = Number(rawValue)
      valueToStore = isNaN(num) ? 5000 : Math.max(0, Math.min(60000, Math.round(num)))
    } else if (key === 'excludeRecentDays') {
      const num = Number(rawValue)
      valueToStore = isNaN(num) ? 0 : Math.max(0, Math.min(365, Math.round(num)))
    } else if (key === 'favoriteWeightBonus') {
      const num = Number(rawValue)
      valueToStore = isNaN(num) ? 0 : Math.max(-100, Math.min(500, Math.round(num * 10) / 10))
    } else if (key === 'animationType') {
      if (!validAnimationTypes.includes(String(rawValue))) {
        valueToStore = 'sequential'
      }
    } else if (key === 'launchMode') {
      const validLaunchModes = ['manual', 'countdown', 'instant']
      if (!validLaunchModes.includes(String(rawValue))) {
        valueToStore = 'manual'
      }
    } else if (key === 'launchCountdownSeconds') {
      const num = Number(rawValue)
      valueToStore = isNaN(num) ? 5 : Math.max(1, Math.min(30, Math.round(num * 10) / 10))
    } else if (key === 'notificationVolume') {
      const num = Number(rawValue)
      valueToStore = isNaN(num) ? 0.4 : Math.max(0, Math.min(1, num))
    } else if (key === 'librarySortBy') {
      if (!validSortBy.includes(String(rawValue))) {
        valueToStore = 'title'
      }
    } else if (key === 'librarySortOrder') {
      if (!validSortOrder.includes(String(rawValue))) {
        valueToStore = 'asc'
      }
    } else if (key === 'soundEnabled' || key === 'autoScan' || key === 'notificationSoundEnabled') {
      valueToStore = Boolean(rawValue)
    }

    // 4. Safely serialize and insert
    const serialized = JSON.stringify(valueToStore)
    if (serialized !== undefined) {
      upsert.run(key, serialized)
    }
  }

  return getSettings()
}
