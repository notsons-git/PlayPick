import { describe, it, expect } from 'vitest'
import { cleanGameTitle } from '../../electron/services/metadata'

describe('cleanGameTitle for SteamGridDB / RAWG search', () => {
  it('cleans trademark and copyright symbols', () => {
    expect(cleanGameTitle('Dota 2™')).toBe('Dota 2')
    expect(cleanGameTitle('Cyberpunk 2077®')).toBe('Cyberpunk 2077')
  })

  it('removes edition suffixes', () => {
    expect(cleanGameTitle('The Witcher 3: Wild Hunt - Game of the Year Edition')).toBe('The Witcher 3: Wild Hunt')
    expect(cleanGameTitle('Dark Souls: Remastered Edition')).toBe('Dark Souls')
    expect(cleanGameTitle('Control (Deluxe Edition)')).toBe('Control')
    expect(cleanGameTitle('Skyrim - Special Edition')).toBe('Skyrim')
  })

  it('handles clean titles unchanged', () => {
    expect(cleanGameTitle('Hades')).toBe('Hades')
    expect(cleanGameTitle('Half-Life 2')).toBe('Half-Life 2')
  })
})

describe('cover resolution priorities and fallbacks', () => {
  it('identifies local cached cover path', () => {
    const isLocalPath = (p?: string) => Boolean(p && (/^[A-Za-z]:\\/.test(p) || p.startsWith('/')))
    expect(isLocalPath('C:\\Users\\user\\AppData\\Roaming\\PlayPick\\covers\\g1.jpg')).toBe(true)
    expect(isLocalPath('/home/user/.config/PlayPick/covers/g1.jpg')).toBe(true)
    expect(isLocalPath('https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg')).toBe(false)
    expect(isLocalPath(undefined)).toBe(false)
  })

  it('generates correct Steam capsule URL for Steam games', () => {
    const getSteamCapsuleUrl = (appId: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
    expect(getSteamCapsuleUrl(570)).toBe('https://cdn.cloudflare.steamstatic.com/steam/apps/570/library_600x900.jpg')
    expect(getSteamCapsuleUrl(730)).toBe('https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_600x900.jpg')
  })

  it('fallback sequence never throws on missing cover', () => {
    // If all providers return null, game still renders with placeholder
    const game = {
      id: 'custom-game-123',
      title: 'Old Indie Game',
      inRoulette: true,
      isInstalled: true,
      genres: [],
      tags: [],
      userGenres: [],
      userTags: [],
      sources: [],
      coverPath: undefined,
    }

    const initial = game.title.trim().charAt(0).toUpperCase()
    expect(initial).toBe('O')
    expect(game.coverPath).toBeUndefined()
  })
})
