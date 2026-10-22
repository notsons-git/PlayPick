import type { Game, FilterState } from '../types/electron'

export function normalizeLabel(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function filterGames(games: Game[], filter: FilterState): Game[] {
  return games.filter((game) => {
    if (!game.inRoulette) return false
    if (filter.onlyInstalled && !game.isInstalled) return false

    if (filter.genres.length > 0) {
      const allGameGenres = [...game.genres, ...game.userGenres]
      const hasGenre = filter.genres.some((fg) =>
        allGameGenres.some((gg) => normalizeLabel(gg) === normalizeLabel(fg))
      )
      if (!hasGenre) return false
    }

    if (filter.tags.length > 0) {
      const allGameTags = [...game.tags, ...game.userTags]
      if (filter.tagMode === 'all') {
        const hasAll = filter.tags.every((ft) =>
          allGameTags.some((gt) => normalizeLabel(gt) === normalizeLabel(ft))
        )
        if (!hasAll) return false
      } else {
        const hasAny = filter.tags.some((ft) =>
          allGameTags.some((gt) => normalizeLabel(gt) === normalizeLabel(ft))
        )
        if (!hasAny) return false
      }
    }

    if (filter.excludeRecent && filter.recentDays > 0) {
      if (game.lastPlayedAt) {
        const lastPlayed = new Date(game.lastPlayedAt)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - filter.recentDays)
        if (lastPlayed > cutoff) return false
      }
    }

    return true
  })
}
