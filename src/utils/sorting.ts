import type { Game, FilterState } from '../types/electron'

export type SortField = 'title' | 'state' | 'platform' | 'date'
export type SortOrder = 'asc' | 'desc'

export interface SortOptions {
  field: SortField
  order: SortOrder
  favoritesFirst?: boolean
}

/**
 * Checks whether a game satisfies the active filter conditions.
 */
export function checkGameMatchesFilter(game: Game, filterState: FilterState): boolean {
  if (filterState.onlyInstalled && !game.isInstalled) return false

  if (filterState.genres.length > 0) {
    const allGameGenres = [...game.genres, ...game.userGenres].map((g) => g.toLowerCase())
    const hasGenre = filterState.genres.some((fg) => allGameGenres.includes(fg.toLowerCase()))
    if (!hasGenre) return false
  }

  if (filterState.tags.length > 0) {
    const allGameTags = [...game.tags, ...game.userTags].map((t) => t.toLowerCase())
    if (filterState.tagMode === 'all') {
      const hasAll = filterState.tags.every((ft) => allGameTags.includes(ft.toLowerCase()))
      if (!hasAll) return false
    } else {
      const hasAny = filterState.tags.some((ft) => allGameTags.includes(ft.toLowerCase()))
      if (!hasAny) return false
    }
  }

  if (filterState.excludeRecent && filterState.recentDays > 0 && game.lastPlayedAt) {
    const lastPlayed = new Date(game.lastPlayedAt)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - filterState.recentDays)
    if (lastPlayed > cutoff) return false
  }

  return true
}

/**
 * Filters and sorts games uniformly for both Home Page and Library Page.
 */
export function filterAndSortGames(
  games: Game[],
  searchQuery: string,
  filterState: FilterState,
  sortOptions: SortOptions
): Game[] {
  const q = searchQuery.trim().toLowerCase()
  let list = games

  // 1. Text Search across title, genres, and tags
  if (q) {
    list = list.filter((g) => {
      const matchTitle = g.title.toLowerCase().includes(q)
      const matchGenre = [...g.genres, ...g.userGenres].some((genre) =>
        genre.toLowerCase().includes(q)
      )
      const matchTag = [...g.tags, ...g.userTags].some((tag) =>
        tag.toLowerCase().includes(q)
      )
      return matchTitle || matchGenre || matchTag
    })
  }

  const { field, order, favoritesFirst } = sortOptions

  // 2. Sorting
  return [...list].sort((a, b) => {
    // 2a. Favorites first prioritization
    if (favoritesFirst) {
      const favA = Boolean(a.isFavorite)
      const favB = Boolean(b.isFavorite)
      if (favA !== favB) {
        return favA ? -1 : 1
      }
    }

    // 2b. Primary sort criterion
    if (field === 'title') {
      const comp = a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' })
      return order === 'asc' ? comp : -comp
    }

    if (field === 'state') {
      // 0: inRoulette && matchesFilter (Active candidate)
      // 1: inRoulette && !matchesFilter (Filter mismatch)
      // 2: !inRoulette (Manually excluded)
      const matchA = checkGameMatchesFilter(a, filterState)
      const matchB = checkGameMatchesFilter(b, filterState)

      const scoreA = !a.inRoulette ? 2 : !matchA ? 1 : 0
      const scoreB = !b.inRoulette ? 2 : !matchB ? 1 : 0

      if (scoreA !== scoreB) {
        return order === 'asc' ? scoreA - scoreB : scoreB - scoreA
      }
      return a.title.localeCompare(b.title, 'ru')
    }

    if (field === 'platform') {
      const pA = a.sources[0]?.sourceType || a.launchType || ''
      const pB = b.sources[0]?.sourceType || b.launchType || ''
      const comp = pA.localeCompare(pB, 'ru')
      if (comp !== 0) {
        return order === 'asc' ? comp : -comp
      }
      return a.title.localeCompare(b.title, 'ru')
    }

    if (field === 'date') {
      const dateA = new Date(a.addedAt).getTime() || 0
      const dateB = new Date(b.addedAt).getTime() || 0
      const comp = dateA - dateB
      if (comp !== 0) {
        return order === 'asc' ? comp : -comp
      }
      return a.title.localeCompare(b.title, 'ru')
    }

    return 0
  })
}

export function loadSavedSortOptions(): SortOptions {
  try {
    const field = (localStorage.getItem('playpick_sort_field') as SortField) || 'state'
    const order = (localStorage.getItem('playpick_sort_order') as SortOrder) || 'asc'
    return {
      field: ['title', 'state', 'platform', 'date'].includes(field) ? field : 'state',
      order: order === 'desc' ? 'desc' : 'asc',
    }
  } catch {
    return { field: 'state', order: 'asc' }
  }
}

export function saveSortOptions(options: { field: SortField; order: SortOrder }): void {
  try {
    localStorage.setItem('playpick_sort_field', options.field)
    localStorage.setItem('playpick_sort_order', options.order)
  } catch {}
}
