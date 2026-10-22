import { describe, it, expect } from 'vitest'
import { filterGames } from '../utils/filter'
import type { Game, FilterState } from '../types/electron'

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: `game-${Math.random()}`,
    title: 'Test Game',
    launchType: 'executable',
    genres: [],
    tags: [],
    userGenres: [],
    userTags: [],
    sources: [],
    inRoulette: true,
    isInstalled: true,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    playCount: 0,
    totalPlayTime: 0,
    ...overrides,
  }
}

const defaultFilter: FilterState = {
  genres: [],
  tags: [],
  tagMode: 'any',
  onlyInstalled: true,
  excludeRecent: false,
  recentDays: 7,
}

describe('filterGames', () => {
  it('включает только игры с inRoulette=true', () => {
    const games = [
      makeGame({ inRoulette: true }),
      makeGame({ inRoulette: false }),
      makeGame({ inRoulette: true }),
    ]
    const result = filterGames(games, defaultFilter)
    expect(result).toHaveLength(2)
    expect(result.every(g => g.inRoulette)).toBe(true)
  })

  it('фильтр по жанрам: ИЛИ', () => {
    const games = [
      makeGame({ genres: ['RPG'] }),
      makeGame({ genres: ['Шутер', 'Экшен'] }),
      makeGame({ genres: ['Стратегия'] }),
    ]
    const filter: FilterState = { ...defaultFilter, genres: ['RPG', 'Шутер'] }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(2)
  })

  it('фильтр по тегам режим "any"', () => {
    const games = [
      makeGame({ tags: ['выживание', 'крафт'] }),
      makeGame({ tags: ['RPG', 'открытый мир'] }),
      makeGame({ tags: ['шутер'] }),
    ]
    const filter: FilterState = { ...defaultFilter, tags: ['выживание', 'RPG'], tagMode: 'any' }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(2)
  })

  it('фильтр по тегам режим "all"', () => {
    const games = [
      makeGame({ tags: ['выживание', 'крафт', 'открытый мир'] }),
      makeGame({ tags: ['выживание', 'RPG'] }),
      makeGame({ tags: ['крафт'] }),
    ]
    const filter: FilterState = { ...defaultFilter, tags: ['выживание', 'крафт'], tagMode: 'all' }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(1)
    expect(result[0].tags).toContain('выживание')
    expect(result[0].tags).toContain('крафт')
  })

  it('исключает неустановленные игры при onlyInstalled=true', () => {
    const games = [
      makeGame({ isInstalled: true }),
      makeGame({ isInstalled: false }),
    ]
    const filter: FilterState = { ...defaultFilter, onlyInstalled: true }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(1)
    expect(result[0].isInstalled).toBe(true)
  })

  it('включает неустановленные игры при onlyInstalled=false', () => {
    const games = [
      makeGame({ isInstalled: true }),
      makeGame({ isInstalled: false }),
    ]
    const filter: FilterState = { ...defaultFilter, onlyInstalled: false }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(2)
  })

  it('возвращает пустой массив если нет подходящих кандидатов', () => {
    const games = [
      makeGame({ genres: ['RPG'], inRoulette: true }),
    ]
    const filter: FilterState = { ...defaultFilter, genres: ['Шутер'] }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(0)
  })

  it('корректно работает с единственной игрой', () => {
    const games = [makeGame({ inRoulette: true })]
    const result = filterGames(games, defaultFilter)
    expect(result).toHaveLength(1)
  })

  it('пустой список игр', () => {
    const result = filterGames([], defaultFilter)
    expect(result).toHaveLength(0)
  })

  it('пользовательские теги также участвуют в фильтрации', () => {
    const games = [
      makeGame({ tags: [], userTags: ['моё избранное'] }),
      makeGame({ tags: ['RPG'], userTags: [] }),
    ]
    const filter: FilterState = { ...defaultFilter, tags: ['моё избранное'], tagMode: 'any' }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(1)
    expect(result[0].userTags).toContain('моё избранное')
  })

  it('пользовательские жанры также участвуют в фильтрации', () => {
    const games = [
      makeGame({ genres: [], userGenres: ['Инди'] }),
      makeGame({ genres: ['RPG'], userGenres: [] }),
    ]
    const filter: FilterState = { ...defaultFilter, genres: ['Инди'] }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(1)
  })

  it('исключает недавно сыгранные игры', () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 1) // 1 day ago

    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 10) // 10 days ago

    const games = [
      makeGame({ lastPlayedAt: recentDate.toISOString() }),
      makeGame({ lastPlayedAt: oldDate.toISOString() }),
      makeGame({ lastPlayedAt: undefined }),
    ]
    const filter: FilterState = { ...defaultFilter, excludeRecent: true, recentDays: 7 }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(2) // old + undefined
  })

  it('нечувствительность к регистру при фильтрации по жанрам', () => {
    const games = [
      makeGame({ genres: ['rpg'] }),
      makeGame({ genres: ['RPG'] }),
    ]
    const filter: FilterState = { ...defaultFilter, genres: ['RPG'] }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(2)
  })

  it('нечувствительность к регистру при фильтрации по тегам', () => {
    const games = [
      makeGame({ tags: ['Открытый мир'] }),
      makeGame({ tags: ['открытый мир'] }),
    ]
    const filter: FilterState = { ...defaultFilter, tags: ['открытый мир'], tagMode: 'any' }
    const result = filterGames(games, filter)
    expect(result).toHaveLength(2)
  })
})

describe('random selection logic', () => {
  it('случайный выбор должен возвращать элемент из списка кандидатов', () => {
    const candidates = [
      makeGame({ title: 'Game A' }),
      makeGame({ title: 'Game B' }),
      makeGame({ title: 'Game C' }),
    ]

    for (let i = 0; i < 100; i++) {
      const winner = candidates[Math.floor(Math.random() * candidates.length)]
      expect(candidates).toContain(winner)
    }
  })

  it('при единственном кандидате возвращает его', () => {
    const candidates = [makeGame({ title: 'Only Game' })]
    const winner = candidates[Math.floor(Math.random() * candidates.length)]
    expect(winner.title).toBe('Only Game')
  })

  it('не должен систематически выбирать одну позицию', () => {
    const candidates = [
      makeGame({ title: 'A' }),
      makeGame({ title: 'B' }),
      makeGame({ title: 'C' }),
      makeGame({ title: 'D' }),
    ]

    const counts = new Map<string, number>()
    const runs = 1000

    for (let i = 0; i < runs; i++) {
      const winner = candidates[Math.floor(Math.random() * candidates.length)]
      counts.set(winner.title, (counts.get(winner.title) || 0) + 1)
    }

    // Each game should be picked roughly 25% of the time
    // With 1000 runs, allow ±10% variance (150-350 each)
    for (const [, count] of counts) {
      expect(count).toBeGreaterThan(150)
      expect(count).toBeLessThan(350)
    }
  })
})
