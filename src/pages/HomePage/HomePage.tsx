import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search as SearchIcon, X as XIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useGames } from '../../context/GamesContext'
import { useSettings } from '../../context/SettingsContext'
import { useNotifications } from '../../context/NotificationContext'
import { GameRow } from '../../components/GameRow/GameRow'
import { FilterPanel } from '../../components/FilterPanel/FilterPanel'
import { ResultCard } from '../../components/ResultCard/ResultCard'
import { GameEditModal } from '../../components/GameEditModal/GameEditModal'
import { CaseOpeningModal } from '../../components/RouletteOverlays/CaseOpeningModal'
import { HorizontalRouletteModal } from '../../components/RouletteOverlays/HorizontalRouletteModal'
import { VerticalRouletteModal } from '../../components/RouletteOverlays/VerticalRouletteModal'
import { Button } from '../../components/ui/Button'
import { soundService } from '../../services/sound/soundService'
import { getAnimationStrategy } from '../../services/animation'
import { pickWeightedWinner } from '../../utils/picker'
import {
  filterAndSortGames,
  checkGameMatchesFilter,
  loadSavedSortOptions,
  saveSortOptions,
  type SortField,
  type SortOrder,
} from '../../utils/sorting'
import type { Game } from '../../types/electron'
import styles from './HomePage.module.css'

type RouletteState = 'idle' | 'spinning' | 'result'

interface HomePageProps {
  onNavigate?: (page: 'home' | 'library' | 'history' | 'scan' | 'settings') => void
}

export default function HomePage({ onNavigate }: HomePageProps = {}) {
  const {
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
  } = useGames()

  const { settings } = useSettings()
  const { notifyError } = useNotifications()

  const [rouletteState, setRouletteState] = useState<RouletteState>('idle')
  const [highlightedGameId, setHighlightedGameId] = useState<string | null>(null)
  const [winner, setWinner] = useState<Game | null>(null)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [launching, setLaunching] = useState(false)
  const [excludedId, setExcludedId] = useState<string | null>(null)

  // Search & Sorting state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>(() => loadSavedSortOptions().field)
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => loadSavedSortOptions().order)

  const listRef = useRef<HTMLDivElement>(null)
  const scrollPosRef = useRef<number>(0)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Keep soundService enabled state in sync with settings
  useEffect(() => {
    soundService.setEnabled(settings?.soundEnabled ?? true)
  }, [settings?.soundEnabled])

  const allGenres = useMemo(() => {
    return [...new Set(games.flatMap((g) => [...g.genres, ...g.userGenres]))]
  }, [games])

  const allTags = useMemo(() => {
    return [...new Set(games.flatMap((g) => [...g.tags, ...g.userTags]))]
  }, [games])

  const activeCandidates = excludedId
    ? candidates.filter((c) => c.id !== excludedId)
    : candidates

  const displayCandidates = activeCandidates.length > 0
    ? activeCandidates
    : candidates

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  const preserveScroll = useCallback(() => {
    if (listRef.current) {
      scrollPosRef.current = listRef.current.scrollTop
    }
  }, [])

  const restoreScroll = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = scrollPosRef.current
    }
  }, [])

  const handleFinishRoulette = useCallback((winningGame: Game) => {
    setRouletteState('result')
    setHighlightedGameId(null)

    // Record history selection entry
    void window.electronAPI.addHistoryEntry({
      gameId: winningGame.id,
      gameTitle: winningGame.title,
      gameCoverPath: winningGame.coverPath,
      selectedAt: new Date().toISOString(),
      filters: filterState,
      launched: false,
      launchAttempted: false,
    })
  }, [filterState])

  const handleCancelRoulette = useCallback(() => {
    clearTimeouts()
    setRouletteState('idle')
    setWinner(null)
    setHighlightedGameId(null)
  }, [clearTimeouts])

  const startRoulette = useCallback(() => {
    if (displayCandidates.length === 0) return
    if (rouletteState === 'spinning') return

    clearTimeouts()

    // 1. Predetermine the winner using weighted random selection (accounting for favorites bonus)
    // BEFORE starting any animation
    const { winner: winnerGame, winnerIndex } = pickWeightedWinner(
      displayCandidates,
      settings?.favoriteWeightBonus ?? 0
    )

    setWinner(winnerGame)
    setRouletteState('spinning')
    setHighlightedGameId(null)

    const animType = settings?.animationType || 'sequential'

    // If overlay modal mode (cases, horizontal tape, or vertical tape),
    // the dedicated modal component runs the visual presentation and handles synchronized sound & completion
    if (animType === 'cases' || animType === 'horizontal_wheel' || animType === 'vertical_wheel') {
      return
    }

    // Otherwise run in-list step schedule (Sequential or Random)
    const strategy = getAnimationStrategy(animType)
    const duration = settings?.animationDuration ?? 5000

    if (duration <= 0) {
      soundService.playWin()
      handleFinishRoulette(winnerGame)
      return
    }

    const plan = strategy.generatePlan(displayCandidates.length, winnerIndex, duration)

    if (plan.steps.length === 0) {
      handleFinishRoulette(winnerGame)
      return
    }

    // Schedule the in-list animation steps
    plan.steps.forEach((step, stepIndex) => {
      const isLast = stepIndex === plan.steps.length - 1
      const progress = stepIndex / Math.max(1, plan.steps.length - 1)

      const t = setTimeout(() => {
        const gameAtStep = displayCandidates[step.candidateIndex]
        if (gameAtStep) {
          setHighlightedGameId(gameAtStep.id)
        }

        // Play authentic mechanical click with pitch curve decelerating naturally
        soundService.playTick(0.9 + progress * 0.4)

        if (isLast) {
          // Strictly anchor highlight on the predetermined winner
          setHighlightedGameId(winnerGame.id)

          const finishTimeout = setTimeout(() => {
            soundService.playWin()
            handleFinishRoulette(winnerGame)
          }, 450)
          timeoutsRef.current.push(finishTimeout)
        }
      }, step.timeMs)

      timeoutsRef.current.push(t)
    })
  }, [displayCandidates, rouletteState, settings?.animationDuration, settings?.animationType, settings?.favoriteWeightBonus, handleFinishRoulette, clearTimeouts])

  useEffect(() => {
    if (rouletteState === 'idle' && excludedId) {
      startRoulette()
      setExcludedId(null)
    }
  }, [excludedId, rouletteState, startRoulette])

  const handlePickAnotherFlow = useCallback(() => {
    clearTimeouts()
    setHighlightedGameId(null)
    if (winner && candidates.length > 1) {
      setWinner(null)
      setRouletteState('idle')
      setExcludedId(winner.id)
    } else {
      setWinner(null)
      setRouletteState('idle')
      setExcludedId(null)
      const t = setTimeout(() => {
        startRoulette()
      }, 60)
      timeoutsRef.current.push(t)
    }
  }, [winner, candidates.length, clearTimeouts, startRoulette])

  const launchingRef = useRef(false)

  const handleLaunch = async () => {
    if (!winner || launchingRef.current) return { success: false, error: 'Запуск уже выполняется' }
    launchingRef.current = true
    setLaunching(true)
    try {
      const result = await window.electronAPI.launchGame(winner.id)
      await window.electronAPI.addHistoryEntry({
        gameId: winner.id,
        gameTitle: winner.title,
        gameCoverPath: winner.coverPath,
        selectedAt: new Date().toISOString(),
        filters: filterState,
        launched: result.success,
        launchAttempted: true,
      })
      if (!result.success) {
        notifyError('Ошибка запуска', result.error || 'Не удалось запустить исполняемый файл игры')
      }
      return result
    } finally {
      setLaunching(false)
      launchingRef.current = false
    }
  }

  // Optimistic toggle without full-screen reload flicker
  const handleToggle = async (id: string, value: boolean) => {
    preserveScroll()
    try {
      await toggleGameInRoulette(id, value)
    } catch {
      notifyError('Ошибка сохранения', 'Не удалось обновить статус участия игры в рулетке')
    }
    requestAnimationFrame(restoreScroll)
  }

  // Optimistic favorite toggle
  const handleToggleFavorite = async (id: string, value: boolean) => {
    preserveScroll()
    try {
      await toggleGameFavorite(id, value)
    } catch {
      notifyError('Ошибка сохранения', 'Не удалось обновить статус избранного')
    }
    requestAnimationFrame(restoreScroll)
  }

  const handleSaveEdit = async (updates: Partial<Game>) => {
    if (!editingGame) return
    preserveScroll()
    try {
      await updateGameLocally(editingGame.id, updates)
      setEditingGame(null)
    } catch {
      notifyError('Ошибка сохранения', 'Не удалось сохранить изменения игры')
    }
    requestAnimationFrame(restoreScroll)
  }

  const handleDeleteGame = async (id: string) => {
    preserveScroll()
    try {
      await window.electronAPI.deleteGame(id)
      await reload(true)
      setEditingGame(null)
    } catch {
      notifyError('Ошибка удаления', 'Не удалось удалить игру из библиотеки')
    }
    requestAnimationFrame(restoreScroll)
  }

  const handleSortFieldChange = (newField: SortField) => {
    setSortField(newField)
    saveSortOptions({ field: newField, order: sortOrder })
  }

  const handleToggleSortOrder = () => {
    const nextOrder: SortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    setSortOrder(nextOrder)
    saveSortOptions({ field: sortField, order: nextOrder })
  }

  useEffect(() => {
    return () => clearTimeouts()
  }, [clearTimeouts])

  // Filter & sort games using shared logic
  const processedGames = useMemo(() => {
    return filterAndSortGames(games, searchQuery, filterState, {
      field: sortField,
      order: sortOrder,
      favoritesFirst: filterState.favoritesFirst,
    })
  }, [games, searchQuery, filterState, sortField, sortOrder])

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Загрузка библиотеки...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <p className={styles.errorText}>{error}</p>
        <Button variant="secondary" onClick={() => reload(false)}>Повторить</Button>
      </div>
    )
  }

  const noGamesInRoulette = games.filter((g) => g.inRoulette).length === 0
  const noMatchingCandidates = candidates.length === 0 && games.some((g) => g.inRoulette)
  const canSpin = displayCandidates.length > 0 && rouletteState !== 'spinning'
  const animType = settings?.animationType || 'sequential'

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Game list Column */}
        <div className={styles.gameListColumn}>
          {/* Header */}
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>Список игр</span>
            <span className={styles.candidateCount}>
              {candidates.length} подходит из {games.length}
            </span>
          </div>

          {/* Search and Sort Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <SearchIcon size={14} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Поиск по названию, жанрам или тегам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchQuery('')}
                  aria-label="Очистить поиск"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            <div className={styles.sortControls}>
              <div className={styles.sortBox}>
                <ArrowUpDown size={13} className={styles.sortIcon} />
                <select
                  className={styles.sortSelect}
                  value={sortField}
                  onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
                >
                  <option value="state">По статусу</option>
                  <option value="title">По алфавиту</option>
                  <option value="platform">По платформе</option>
                  <option value="date">По дате добавления</option>
                </select>
              </div>

              <button
                type="button"
                className={styles.orderToggleBtn}
                onClick={handleToggleSortOrder}
                title={sortOrder === 'asc' ? 'Сортировка: по возрастанию (кликните для убывания)' : 'Сортировка: по убыванию (кликните для возрастания)'}
                aria-label={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
              >
                {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              </button>
            </div>
          </div>

          {games.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Библиотека пуста</p>
              <p className={styles.emptyDesc}>
                {onNavigate ? (
                  <>
                    Перейдите в{' '}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => onNavigate('scan')}
                    >
                      «Поиск игр»
                    </button>{' '}
                    для сканирования или добавьте игры вручную в{' '}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => onNavigate('library')}
                    >
                      «Мою библиотеку»
                    </button>
                  </>
                ) : (
                  'Перейдите в «Поиск игр» для сканирования или добавьте игры вручную в «Мою библиотеку»'
                )}
              </p>
            </div>
          ) : processedGames.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Ничего не найдено</p>
              <p className={styles.emptyDesc}>
                По запросу «{searchQuery}» совпадений не обнаружено
              </p>
            </div>
          ) : (
            <div
              className={styles.gameList}
              ref={listRef}
              onScroll={(e) => {
                scrollPosRef.current = e.currentTarget.scrollTop
              }}
            >
              {processedGames.map((game) => {
                const isHighlighted = rouletteState === 'spinning' && game.id === highlightedGameId
                const matchesFilter = checkGameMatchesFilter(game, filterState)

                return (
                  <GameRow
                    key={game.id}
                    game={game}
                    highlighted={isHighlighted}
                    matchesFilter={matchesFilter}
                    showToggle
                    onToggle={handleToggle}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={setEditingGame}
                  />
                )
              })}
            </div>
          )}

          {/* Bottom action bar - synchronized height with filterPanel footer */}
          <div className={styles.bottomBar}>
            {noGamesInRoulette && (
              <p className={styles.hintText}>Включите хотя бы одну игру для рулетки</p>
            )}
            {noMatchingCandidates && !noGamesInRoulette && (
              <p className={styles.hintText}>Нет игр, подходящих под фильтры — ослабьте условия</p>
            )}
            <Button
              variant="primary"
              size="lg"
              disabled={!canSpin}
              loading={rouletteState === 'spinning'}
              onClick={startRoulette}
            >
              {rouletteState === 'spinning' ? 'Выбираю...' : 'Выбрать игру'}
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        <div className={styles.filterColumn}>
          <FilterPanel
            genres={allGenres}
            tags={allTags}
            filterState={filterState}
            onChange={setFilterState}
            candidateCount={candidates.length}
          />
        </div>
      </div>

      {/* Case Opening Overlay Mode */}
      {rouletteState === 'spinning' && animType === 'cases' && winner && (
        <CaseOpeningModal
          winner={winner}
          durationMs={settings?.animationDuration ?? 4000}
          onComplete={() => handleFinishRoulette(winner)}
          onCancel={handleCancelRoulette}
        />
      )}

      {/* Horizontal Roulette Overlay Mode */}
      {rouletteState === 'spinning' && animType === 'horizontal_wheel' && winner && (
        <HorizontalRouletteModal
          candidates={displayCandidates}
          winner={winner}
          durationMs={settings?.animationDuration ?? 4000}
          onComplete={() => handleFinishRoulette(winner)}
          onCancel={handleCancelRoulette}
        />
      )}

      {/* Vertical Roulette Overlay Mode */}
      {rouletteState === 'spinning' && animType === 'vertical_wheel' && winner && (
        <VerticalRouletteModal
          candidates={displayCandidates}
          winner={winner}
          durationMs={settings?.animationDuration ?? 4000}
          onComplete={() => handleFinishRoulette(winner)}
          onCancel={handleCancelRoulette}
        />
      )}

      {/* Result Card Modal */}
      {rouletteState === 'result' && winner && (
        <ResultCard
          game={winner}
          launchMode={settings?.launchMode || 'manual'}
          countdownDurationSec={settings?.launchCountdownSeconds ?? 5}
          onLaunch={handleLaunch}
          onPickAnother={handlePickAnotherFlow}
          onClose={() => {
            setWinner(null)
            setRouletteState('idle')
          }}
          onToggleFavorite={handleToggleFavorite}
          launching={launching}
        />
      )}

      {/* Edit modal */}
      {editingGame && (
        <GameEditModal
          game={editingGame}
          onSave={handleSaveEdit}
          onDelete={handleDeleteGame}
          onClose={() => setEditingGame(null)}
        />
      )}
    </div>
  )
}
