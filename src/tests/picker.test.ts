import { describe, it, expect } from 'vitest'
import { getGameWeight, pickWeightedWinner } from '../utils/picker'
import type { Game } from '../types/electron'

function makeMockGame(id: string, isFavorite = false): Game {
  return {
    id,
    title: `Game ${id}`,
    launchType: 'executable',
    genres: ['Экшен'],
    tags: ['Сюжетная'],
    sources: [],
    inRoulette: true,
    isInstalled: true,
    isFavorite,
    addedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    playCount: 0,
    totalPlayTime: 0,
    userGenres: [],
    userTags: [],
  }
}

describe('Weighted Winner Picker', () => {
  it('calculates weights correctly according to bonus setting', () => {
    const regular = makeMockGame('1', false)
    const favorite = makeMockGame('2', true)

    expect(getGameWeight(regular, 0)).toBe(1.0)
    expect(getGameWeight(regular, 50)).toBe(1.0)
    expect(getGameWeight(regular, -100)).toBe(1.0)

    expect(getGameWeight(favorite, 0)).toBe(1.0)
    expect(getGameWeight(favorite, 50)).toBe(1.5)
    expect(getGameWeight(favorite, -50)).toBe(0.5)
    expect(getGameWeight(favorite, -100)).toBe(0.0)
    expect(getGameWeight(favorite, 100)).toBe(2.0)
  })

  it('handles single candidate without error', () => {
    const single = makeMockGame('single', true)
    const res = pickWeightedWinner([single], 50)
    expect(res.winner.id).toBe('single')
    expect(res.winnerIndex).toBe(0)
  })

  it('throws on empty candidates array', () => {
    expect(() => pickWeightedWinner([], 0)).toThrow()
  })

  it('respects -100% bonus by completely skipping favorite candidates when non-favorites exist', () => {
    const g1 = makeMockGame('g1', false) // weight 1.0
    const g2 = makeMockGame('g2', true)  // weight 0.0 at -100%
    const g3 = makeMockGame('g3', false) // weight 1.0

    // For any random roll in [0, 1), only g1 or g3 must ever be chosen
    const rolls = [0.0, 0.25, 0.5, 0.75, 0.99]
    for (const roll of rolls) {
      const res = pickWeightedWinner([g1, g2, g3], -100, () => roll)
      expect(res.winner.isFavorite).toBe(false)
      expect(['g1', 'g3']).toContain(res.winner.id)
    }
  })

  it('falls back to uniform selection if all candidates are favorites and bonus is -100%', () => {
    const f1 = makeMockGame('f1', true)
    const f2 = makeMockGame('f2', true)

    const res = pickWeightedWinner([f1, f2], -100, () => 0.1)
    expect(res.winner.id).toBe('f1')
  })

  it('provides deterministic distribution with simulated random values', () => {
    const g1 = makeMockGame('reg', false) // weight 1.0
    const g2 = makeMockGame('fav', true)  // weight 2.0 at +100% (total = 3.0)

    // Roll 0.1 -> threshold 0.3 < 1.0 -> g1
    const res1 = pickWeightedWinner([g1, g2], 100, () => 0.1)
    expect(res1.winner.id).toBe('reg')

    // Roll 0.5 -> threshold 1.5 >= 1.0 -> g2
    const res2 = pickWeightedWinner([g1, g2], 100, () => 0.5)
    expect(res2.winner.id).toBe('fav')
  })
})
