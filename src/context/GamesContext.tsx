import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Game, FilterState } from '../types/electron'

interface GamesContextValue {
  games: Game[]
  loading: boolean
  error: string | null
  reload: (silent?: boolean) => Promise<void>
  toggleGameInRoulette: (id: string, inRoulette: boolean) => Promise<void>
  toggleGameFavorite: (id: string, isFavorite: boolean) => Promise<void>
  updateGameLocally: (id: string, updates: Partial<Game>) => Promise<void>
  filterState: FilterState
  setFilterState: (f: FilterState) => void
  candidates: Game[]
}

const defaultFilter: FilterState = {
  genres: [],
  tags: [],
  tagMode: 'any',
  onlyInstalled: true,
  excludeRecent: false,
  recentDays: 7,
  favoritesFirst: false,
}

const GamesContext = createContext<GamesContextValue | null>(null)

export function GamesProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterState, setFilterState] = useState<FilterState>(defaultFilter)

  const reload = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    try {
      const g = await window.electronAPI.getGames()
      setGames(g)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки игр')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void reload(false)
  }, [reload])

  // Optimistic local update for inRoulette toggle to prevent any screen flicker or component unmounting
  const toggleGameInRoulette = useCallback(async (id: string, inRoulette: boolean) => {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, inRoulette } : g))
    )
    try {
      await window.electronAPI.setGameInRoulette(id, inRoulette)
    } catch (err) {
      // Revert optimistic update on failure
      setGames((prev) =>
        prev.map((g) => (g.id === id ? { ...g, inRoulette: !inRoulette } : g))
      )
      throw err
    }
  }, [])

  // Optimistic local update for favorite toggle
  const toggleGameFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isFavorite } : g))
    )
    try {
      await window.electronAPI.setGameFavorite(id, isFavorite)
    } catch (err) {
      // Revert optimistic update on failure
      setGames((prev) =>
        prev.map((g) => (g.id === id ? { ...g, isFavorite: !isFavorite } : g))
      )
      throw err
    }
  }, [])

  // Optimistic local update for general game updates
  const updateGameLocally = useCallback(async (id: string, updates: Partial<Game>) => {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    )
    try {
      await window.electronAPI.updateGame(id, updates)
      // Perform silent background reload to ensure junction tables (genres/tags) are synced
      void reload(true)
    } catch (err) {
      void reload(true)
      throw err
    }
  }, [reload])

  const candidates = games.filter((game) => {
    if (!game.inRoulette) return false
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
  })

  return (
    <GamesContext.Provider
      value={{
        games,
        loading,
        error,
        reload,
        toggleGameInRoulette,
        toggleGameFavorite,
        updateGameLocally,
        filterState,
        setFilterState,
        candidates,
      }}
    >
      {children}
    </GamesContext.Provider>
  )
}

export function useGames(): GamesContextValue {
  const ctx = useContext(GamesContext)
  if (!ctx) throw new Error('useGames must be used within GamesProvider')
  return ctx
}
