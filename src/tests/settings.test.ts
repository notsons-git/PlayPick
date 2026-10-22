import { describe, it, expect, beforeEach } from 'vitest'
import initSqlJs from 'sql.js'
import { SQLiteWrapper } from '../../electron/database/init'
import { getSettings, updateSettings } from '../../electron/database/settings'

describe('Settings Database Service', () => {
  let dbWrapper: SQLiteWrapper

  beforeEach(async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    dbWrapper = new SQLiteWrapper(db, ':memory:')

    dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)

    // Inject our test DB wrapper
    const { setDb } = await import('../../electron/database/init')
    setDb(dbWrapper)
  })

  it('returns default settings when database is empty', () => {
    const settings = getSettings()
    expect(settings.soundEnabled).toBe(true)
    expect(settings.animationDuration).toBe(5000)
    expect(settings.animationType).toBe('sequential')
    expect(settings.notificationSoundEnabled).toBe(true)
    expect(settings.favoriteWeightBonus).toBe(0)
    expect(settings.launchMode).toBe('manual')
    expect(settings.launchCountdownSeconds).toBe(5)
  })

  it('correctly handles undefined fields without crashing with "unknown type (undefined)"', () => {
    expect(() => {
      updateSettings({
        rawgApiKey: undefined,
        steamApiKey: undefined,
        soundEnabled: false,
      })
    }).not.toThrow()

    const settings = getSettings()
    expect(settings.soundEnabled).toBe(false)
    expect(settings.rawgApiKey).toBeUndefined()
  })

  it('preserves existing settings when partial update is applied', () => {
    updateSettings({ rawgApiKey: 'my-secret-key-123' })
    let settings = getSettings()
    expect(settings.rawgApiKey).toBe('my-secret-key-123')

    // Update only soundEnabled, omitting rawgApiKey (undefined)
    updateSettings({ soundEnabled: false })
    settings = getSettings()
    expect(settings.soundEnabled).toBe(false)
    expect(settings.rawgApiKey).toBe('my-secret-key-123')
  })

  it('clears API key when user explicitly passes empty string or null', () => {
    updateSettings({ rawgApiKey: 'initial-key' })
    expect(getSettings().rawgApiKey).toBe('initial-key')

    // User clears the field
    updateSettings({ rawgApiKey: '' })
    expect(getSettings().rawgApiKey).toBeUndefined()

    // Test with null
    updateSettings({ steamApiKey: 'steam-123' })
    expect(getSettings().steamApiKey).toBe('steam-123')
    updateSettings({ steamApiKey: null as unknown as string })
    expect(getSettings().steamApiKey).toBeUndefined()
  })

  it('validates and clamps animation duration and notification volume', () => {
    updateSettings({
      animationDuration: -50, // negative not allowed, clamped to 0
      notificationVolume: 2.5, // too large, clamped to 1
      favoriteWeightBonus: -150, // clamped to -100
      launchMode: 'invalid_mode' as unknown as 'manual',
      launchCountdownSeconds: 99, // clamped to 30
    })
    const settings = getSettings()
    expect(settings.animationDuration).toBe(0)
    expect(settings.notificationVolume).toBe(1)
    expect(settings.favoriteWeightBonus).toBe(-100)
    expect(settings.launchMode).toBe('manual')
    expect(settings.launchCountdownSeconds).toBe(30)
  })
})
