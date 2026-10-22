import { useState, useMemo, useRef, useCallback } from 'react'
import { Plus, Search as SearchIcon, X as XIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useGames } from '../../context/GamesContext'
import { useNotifications } from '../../context/NotificationContext'
import { GameRow } from '../../components/GameRow/GameRow'
import { GameEditModal } from '../../components/GameEditModal/GameEditModal'
import { AddGameModal } from '../../components/AddGameModal/AddGameModal'
import { Button } from '../../components/ui/Button'
import {
  filterAndSortGames,
  checkGameMatchesFilter,
  loadSavedSortOptions,
  saveSortOptions,
  type SortField,
  type SortOrder,
} from '../../utils/sorting'
import type { Game } from '../../types/electron'
import styles from './LibraryPage.module.css'

export default function LibraryPage() {
  const {
    games,
    loading,
    reload,
    filterState,
    toggleGameInRoulette,
    toggleGameFavorite,
    updateGameLocally,
  } = useGames()

  const { notifyError } = useNotifications()

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>(() => loadSavedSortOptions().field)
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => loadSavedSortOptions().order)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const listContainerRef = useRef<HTMLDivElement>(null)
  const scrollPosRef = useRef<number>(0)

  const preserveScroll = useCallback(() => {
    if (listContainerRef.current) {
      scrollPosRef.current = listContainerRef.current.scrollTop
    }
  }, [])

  const restoreScroll = useCallback(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = scrollPosRef.current
    }
  }, [])

  // Optimistic toggle without screen flicker
  const handleToggle = async (id: string, inRoulette: boolean) => {
    preserveScroll()
    try {
      await toggleGameInRoulette(id, inRoulette)
    } catch {
      notifyError('Ошибка сохранения', 'Не удалось обновить статус участия игры в рулетке')
    }
    requestAnimationFrame(restoreScroll)
  }

  // Optimistic favorite toggle
  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    preserveScroll()
    try {
      await toggleGameFavorite(id, isFavorite)
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

  const filteredGames = useMemo(() => {
    return filterAndSortGames(games, search, filterState, {
      field: sortField,
      order: sortOrder,
      favoritesFirst: filterState.favoritesFirst,
    })
  }, [games, search, filterState, sortField, sortOrder])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Моя библиотека</h1>
          <span className={styles.countBadge}>{games.length} игр</span>
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} />
            <span>Добавить игру</span>
          </Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <SearchIcon size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск по названию, жанрам или тегам..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearch('')}
              aria-label="Очистить поиск"
            >
              <XIcon size={13} />
            </button>
          )}
        </div>

        <div className={styles.sortControls}>
          <div className={styles.sortBox}>
            <ArrowUpDown size={14} className={styles.sortIcon} />
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
            {sortOrder === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          </button>
        </div>
      </div>

      <div
        className={styles.content}
        ref={listContainerRef}
        onScroll={(e) => {
          scrollPosRef.current = e.currentTarget.scrollTop
        }}
      >
        {loading ? (
          <div className={styles.centerMessage}>Загрузка библиотеки...</div>
        ) : filteredGames.length === 0 ? (
          <div className={styles.emptyState}>
            {search ? (
              <>
                <p className={styles.emptyTitle}>Ничего не найдено</p>
                <p className={styles.emptySubtitle}>Попробуйте изменить запрос «{search}»</p>
              </>
            ) : (
              <>
                <p className={styles.emptyTitle}>В библиотеке пока нет игр</p>
                <p className={styles.emptySubtitle}>
                  Используйте автоматический поиск игр или добавьте игру вручную
                </p>
              </>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {filteredGames.map((game) => {
              const matchesFilter = checkGameMatchesFilter(game, filterState)

              return (
                <GameRow
                  key={game.id}
                  game={game}
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
      </div>

      {editingGame && (
        <GameEditModal
          game={editingGame}
          onSave={handleSaveEdit}
          onDelete={handleDeleteGame}
          onClose={() => setEditingGame(null)}
        />
      )}

      {isAddOpen && (
        <AddGameModal
          onClose={() => setIsAddOpen(false)}
        />
      )}
    </div>
  )
}
