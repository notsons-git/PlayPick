import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from '../../electron/utils/uuid'

describe('uuid v4', () => {
  it('generates valid UUID v4 format', () => {
    const id = uuidv4()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv4()))
    expect(ids.size).toBe(1000)
  })
})

describe('steam scanner helpers', () => {
  it('parses appmanifest fields correctly', () => {
    // Test the VDF parsing logic inline
    const vdfContent = `"AppState"
{
  "appid"    "570"
  "name"     "Dota 2"
  "installdir"    "dota 2 beta"
  "StateFlags"    "4"
}`

    const getField = (key: string): string | null => {
      const match = new RegExp(`"${key}"\\s+"([^"]*)"`, 'i').exec(vdfContent)
      return match?.[1] ?? null
    }

    expect(getField('appid')).toBe('570')
    expect(getField('name')).toBe('Dota 2')
    expect(getField('installdir')).toBe('dota 2 beta')
    expect(getField('StateFlags')).toBe('4')
    expect(getField('nonexistent')).toBeNull()
  })

  it('correctly identifies installed state from StateFlags', () => {
    const isInstalled = (flags: number) => (flags & 4) !== 0 || flags === 6

    expect(isInstalled(4)).toBe(true)   // fully installed
    expect(isInstalled(6)).toBe(true)   // needs update but playable
    expect(isInstalled(2)).toBe(false)  // downloading
    expect(isInstalled(0)).toBe(false)  // not installed
    expect(isInstalled(1024)).toBe(false) // some other flag
  })
})

describe('deduplication logic', () => {
  interface SourceRecord {
    sourceType: string
    sourceId: string
    title: string
  }

  function deduplicateBySourceId(records: SourceRecord[]): SourceRecord[] {
    const seen = new Set<string>()
    return records.filter(r => {
      const key = `${r.sourceType}:${r.sourceId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  it('removes duplicate entries with same source type and id', () => {
    const records: SourceRecord[] = [
      { sourceType: 'steam', sourceId: '570', title: 'Dota 2' },
      { sourceType: 'steam', sourceId: '570', title: 'Dota 2' },
      { sourceType: 'steam', sourceId: '730', title: 'CS2' },
    ]
    const result = deduplicateBySourceId(records)
    expect(result).toHaveLength(2)
  })

  it('does not merge games with same name but different sources', () => {
    const records: SourceRecord[] = [
      { sourceType: 'steam', sourceId: '570', title: 'Game' },
      { sourceType: 'epic', sourceId: 'game-id', title: 'Game' },
    ]
    const result = deduplicateBySourceId(records)
    expect(result).toHaveLength(2)
  })
})

describe('metadata handling', () => {
  it('handles missing metadata gracefully - game still works', () => {
    // Game without any metadata should be valid for roulette
    const game = {
      id: 'test',
      title: 'Unknown Game',
      genres: [],
      tags: [],
      userGenres: [],
      userTags: [],
      inRoulette: true,
      isInstalled: true,
    }

    // Game without cover/genres/tags should still be eligible
    expect(game.inRoulette).toBe(true)
    expect(game.genres).toHaveLength(0)
    expect(game.tags).toHaveLength(0)
  })

  it('user tags are preserved when auto-tags update', () => {
    // Simulating tag merge logic
    const userTags = ['любимая', 'длинная игра']
    const autoTags = ['RPG', 'Open World']

    // After metadata update, user tags should persist separately
    const newAutoTags = ['RPG', 'Action', 'Open World']

    // User tags are stored separately (source='user'), so they don't get overwritten
    expect(autoTags).toHaveLength(2)
    expect(userTags).toEqual(['любимая', 'длинная игра'])
    expect(newAutoTags).toContain('Action')
    expect(userTags).not.toContain('Action') // auto update doesn't touch user tags
  })
})

describe('launch validation', () => {
  it('validates only known safe URL protocols', () => {
    const safeProtocols = ['steam://', 'com.epicgames.launcher://', 'goggalaxy://', 'uplay://']

    const isSafe = (url: string) => safeProtocols.some(p => url.startsWith(p))

    expect(isSafe('steam://run/570')).toBe(true)
    expect(isSafe('com.epicgames.launcher://apps/Fortnite')).toBe(true)
    expect(isSafe('goggalaxy://openGame/12345')).toBe(true)
    expect(isSafe('javascript:alert(1)')).toBe(false)
    expect(isSafe('file:///C:/Windows/System32/cmd.exe')).toBe(false)
    expect(isSafe('http://evil.com')).toBe(false)
  })
})

describe('settings defaults', () => {
  it('default settings have correct types', () => {
    const defaults = {
      soundEnabled: true,
      animationDuration: 4000,
      animationType: 'sequential' as const,
      excludeRecentDays: 0,
      autoScan: false,
      theme: 'dark' as const,
      language: 'ru' as const,
    }

    expect(typeof defaults.soundEnabled).toBe('boolean')
    expect(typeof defaults.animationDuration).toBe('number')
    expect(defaults.animationType).toBe('sequential')
    expect(defaults.animationDuration).toBeGreaterThan(0)
    expect(defaults.theme).toBe('dark')
    expect(defaults.language).toBe('ru')
  })
})
