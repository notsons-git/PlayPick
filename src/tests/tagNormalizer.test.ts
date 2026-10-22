import { describe, it, expect } from 'vitest'
import {
  isTechnicalTag,
  normalizeTag,
  normalizeGenre,
  cleanAndNormalizeMetadata,
} from '../utils/tagNormalizer'

describe('Metadata & Tag Normalizer', () => {
  it('detects technical and anti-cheat tags', () => {
    expect(isTechnicalTag('Valve Anti-Cheat')).toBe(true)
    expect(isTechnicalTag('Steam Cloud')).toBe(true)
    expect(isTechnicalTag('Easy Anti-Cheat')).toBe(true)
    expect(isTechnicalTag('Includes level editor')).toBe(true)
    expect(isTechnicalTag('Открытый мир')).toBe(false)
    expect(isTechnicalTag('Выживание')).toBe(false)
  })

  it('normalizes controller inputs into "Геймпад" and ignores unsupported hardware', () => {
    expect(normalizeTag('Full controller support')).toBe('Геймпад')
    expect(normalizeTag('DualShock 4')).toBe('Геймпад')
    expect(normalizeTag('DualSense')).toBe('Геймпад')
    expect(normalizeTag('Keyboard & Mouse')).toBe('Клавиатура и мышь')
  })

  it('standardizes genre names', () => {
    expect(normalizeGenre('Action')).toBe('Экшен')
    expect(normalizeGenre('RPG')).toBe('RPG')
    expect(normalizeGenre('Strategy')).toBe('Стратегия')
    expect(normalizeGenre('Simulation')).toBe('Симулятор')
  })

  it('filters out technical tags and standardizes gameplay tags', () => {
    const raw = ['Valve Anti-Cheat', 'co-op', 'Steam Cloud', 'open world', 'Survival']
    const cleaned = raw.map(normalizeTag).filter(Boolean)
    expect(cleaned).toContain('Кооператив')
    expect(cleaned).toContain('Открытый мир')
    expect(cleaned).toContain('Выживание')
    expect(cleaned).not.toContain('Valve Anti-Cheat')
    expect(cleaned).not.toContain('Steam Cloud')
  })

  it('cleans and deduplicates across genres and tags simultaneously', () => {
    const rawGenres = ['Экшены', 'Action', 'Приключенческие игры']
    const rawTags = ['Экшен', 'Valve Anti-Cheat', 'Single-player', 'DualShock 4']

    const res = cleanAndNormalizeMetadata(rawGenres, rawTags)

    expect(res.genres).toContain('Экшен')
    expect(res.genres).toContain('Приключения')
    // "Экшен" is in genres, so it should not be duplicated in tags
    expect(res.tags).not.toContain('Экшен')
    expect(res.tags).toContain('Одиночная игра')
    expect(res.tags).toContain('Геймпад')
    expect(res.tags).not.toContain('Valve Anti-Cheat')
  })
})
