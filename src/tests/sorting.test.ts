import { describe, it, expect } from 'vitest'
import { filterAndSortGames, checkGameMatchesFilter } from '../utils/sorting'
import type { Game, FilterState } from '../types/electron'

function makeMock(id: string, title: string, inRoulette = true, isFavorite = false, sourceType = 'steam', addedAt = '2026-01-01'): Game {
  return {
    id,
    title,
    launchType: 'executable',
    genres: ['Экшен'],
    tags: ['Сюжетная'],
    sources: [{
      id: `s-${id}`,
      gameId: id,
      sourceType: sourceType as any,
      sourceId: id,
      sourceName: sourceType,
      isInstalled: true,
    }],
    inRoulette,
    isInstalled: true,
    isFavorite,
    addedAt,
    updatedAt: addedAt,
    playCount: 0,
    totalPlayTime: 0,
    userGenres: [],
    userTags: [],
  }
}

const emptyFilter: FilterState = {
  genres: [],
  tags: [],
  tagMode: 'any',
  onlyInstalled: false,
  excludeRecent: false,
  recentDays: 7,
}

describe('Sorting and Filtering Helper', () => {
  const gA = makeMock('1', 'Alpha', true, false, 'steam', '2026-01-01')
  const gB = makeMock('2', 'Beta', true, true, 'epic', '2026-02-01')
  const gC = makeMock('3', 'Gamma', false, false, 'gog', '2026-03-01')

  it('sorts by title ASC and DESC', () => {
    const asc = filterAndSortGames([gB, gC, gA], '', emptyFilter, { field: 'title', order: 'asc' })
    expect(asc.map(g => g.title)).toEqual(['Alpha', 'Beta', 'Gamma'])

    const desc = filterAndSortGames([gB, gC, gA], '', emptyFilter, { field: 'title', order: 'desc' })
    expect(desc.map(g => g.title)).toEqual(['Gamma', 'Beta', 'Alpha'])
  })

  it('sorts by state ASC (participating first) and DESC (excluded first)', () => {
    const asc = filterAndSortGames([gC, gA, gB], '', emptyFilter, { field: 'state', order: 'asc' })
    expect(asc[2].id).toBe('3') // gC is excluded, so it comes last

    const desc = filterAndSortGames([gC, gA, gB], '', emptyFilter, { field: 'state', order: 'desc' })
    expect(desc[0].id).toBe('3') // gC is excluded, so it comes first in DESC
  })

  it('sorts by platform ASC and DESC', () => {
    const asc = filterAndSortGames([gA, gB, gC], '', emptyFilter, { field: 'platform', order: 'asc' })
    expect(asc.map(g => g.sources[0].sourceType)).toEqual(['epic', 'gog', 'steam'])

    const desc = filterAndSortGames([gA, gB, gC], '', emptyFilter, { field: 'platform', order: 'desc' })
    expect(desc.map(g => g.sources[0].sourceType)).toEqual(['steam', 'gog', 'epic'])
  })

  it('sorts by date ASC (oldest) and DESC (newest)', () => {
    const desc = filterAndSortGames([gA, gB, gC], '', emptyFilter, { field: 'date', order: 'desc' })
    expect(desc.map(g => g.id)).toEqual(['3', '2', '1'])

    const asc = filterAndSortGames([gA, gB, gC], '', emptyFilter, { field: 'date', order: 'asc' })
    expect(asc.map(g => g.id)).toEqual(['1', '2', '3'])
  })

  it('correctly checks if game matches filters', () => {
    const installedGame = makeMock('inst', 'Installed Game', true, false, 'steam')
    const uninstalledGame = { ...makeMock('uninst', 'Uninstalled Game'), isInstalled: false }

    const onlyInstalledFilter: FilterState = { ...emptyFilter, onlyInstalled: true }
    expect(checkGameMatchesFilter(installedGame, onlyInstalledFilter)).toBe(true)
    expect(checkGameMatchesFilter(uninstalledGame, onlyInstalledFilter)).toBe(false)
  })

  it('prioritizes favorites when favoritesFirst is enabled', () => {
    const res = filterAndSortGames([gA, gB, gC], '', emptyFilter, {
      field: 'title',
      order: 'asc',
      favoritesFirst: true,
    })
    // gB is favorite, so it appears first even though gA is "Alpha"
    expect(res[0].id).toBe('2')
    expect(res[1].id).toBe('1')
    expect(res[2].id).toBe('3')
  })
})
