import React, { useState, useMemo, useRef } from 'react'
import { Search, X, RotateCcw } from 'lucide-react'
import type { FilterState } from '../../types/electron'
import { Chip } from '../ui/Chip'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  genres: string[]
  tags: string[]
  filterState: FilterState
  onChange: (f: FilterState) => void
  candidateCount: number
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  genres,
  tags,
  filterState,
  onChange,
  candidateCount,
}) => {
  const [genreSearch, setGenreSearch] = useState('')
  const [isGenreSearchOpen, setIsGenreSearchOpen] = useState(false)
  const genreInputRef = useRef<HTMLInputElement>(null)

  const [tagSearch, setTagSearch] = useState('')
  const [isTagSearchOpen, setIsTagSearchOpen] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const toggleGenre = (genre: string) => {
    const updated = filterState.genres.includes(genre)
      ? filterState.genres.filter((g) => g !== genre)
      : [...filterState.genres, genre]
    onChange({ ...filterState, genres: updated })
  }

  const toggleTag = (tag: string) => {
    const updated = filterState.tags.includes(tag)
      ? filterState.tags.filter((t) => t !== tag)
      : [...filterState.tags, tag]
    onChange({ ...filterState, tags: updated })
  }

  const reset = () => {
    setGenreSearch('')
    setTagSearch('')
    onChange({
      genres: [],
      tags: [],
      tagMode: 'any',
      onlyInstalled: false,
      excludeRecent: false,
      recentDays: 7,
      favoritesFirst: false,
    })
  }

  const filteredGenres = useMemo(() => {
    const q = genreSearch.trim().toLowerCase()
    if (!q) return genres
    return genres.filter((g) => g.toLowerCase().includes(q))
  }, [genres, genreSearch])

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((t) => t.toLowerCase().includes(q))
  }, [tags, tagSearch])

  return (
    <div className={styles.panel}>
      <div className={styles.scrollBody}>
        {/* Секция ЖАНРЫ */}
        {genres.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Жанры</span>
              <div className={styles.headerRight}>
                {filterState.genres.length > 0 && (
                  <span className={styles.selectedCount}>
                    ({filterState.genres.length})
                  </span>
                )}
                <button
                  type="button"
                  className={`${styles.searchToggleBtn} ${isGenreSearchOpen ? styles.activeSearchBtn : ''}`}
                  onClick={() => {
                    setIsGenreSearchOpen((prev) => {
                      if (!prev) {
                        setTimeout(() => genreInputRef.current?.focus(), 50)
                      } else {
                        setGenreSearch('')
                      }
                      return !prev
                    })
                  }}
                  title={isGenreSearchOpen ? 'Скрыть поиск' : 'Поиск по жанрам'}
                  aria-label="Поиск по жанрам"
                >
                  <Search size={13} />
                </button>
              </div>
            </div>

            {isGenreSearchOpen && (
              <div className={styles.searchRow}>
                <Search size={12} className={styles.searchIcon} />
                <input
                  ref={genreInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Найти жанр..."
                  value={genreSearch}
                  onChange={(e) => setGenreSearch(e.target.value)}
                />
                {genreSearch && (
                  <button
                    type="button"
                    className={styles.clearSearchBtn}
                    onClick={() => setGenreSearch('')}
                    title="Очистить поиск"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className={styles.chipsScroll}>
              <div className={styles.chips}>
                {filteredGenres.map((g) => (
                  <Chip
                    key={g}
                    label={g}
                    active={filterState.genres.includes(g)}
                    onClick={() => toggleGenre(g)}
                  />
                ))}
                {filteredGenres.length === 0 && (
                  <span className={styles.noResultsHint}>Ничего не найдено</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Секция ТЕГИ */}
        {tags.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Теги</span>
              <div className={styles.headerRight}>
                {filterState.tags.length > 0 && (
                  <span className={styles.selectedCount}>
                    ({filterState.tags.length})
                  </span>
                )}
                <button
                  type="button"
                  className={`${styles.searchToggleBtn} ${isTagSearchOpen ? styles.activeSearchBtn : ''}`}
                  onClick={() => {
                    setIsTagSearchOpen((prev) => {
                      if (!prev) {
                        setTimeout(() => tagInputRef.current?.focus(), 50)
                      } else {
                        setTagSearch('')
                      }
                      return !prev
                    })
                  }}
                  title={isTagSearchOpen ? 'Скрыть поиск' : 'Поиск по тегам'}
                  aria-label="Поиск по тегам"
                >
                  <Search size={13} />
                </button>
              </div>
            </div>

            {isTagSearchOpen && (
              <div className={styles.searchRow}>
                <Search size={12} className={styles.searchIcon} />
                <input
                  ref={tagInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Найти тег..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                />
                {tagSearch && (
                  <button
                    type="button"
                    className={styles.clearSearchBtn}
                    onClick={() => setTagSearch('')}
                    title="Очистить поиск"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className={styles.chipsScroll}>
              <div className={styles.chips}>
                {filteredTags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    active={filterState.tags.length > 0 && filterState.tags.includes(t)}
                    onClick={() => toggleTag(t)}
                  />
                ))}
                {filteredTags.length === 0 && (
                  <span className={styles.noResultsHint}>Ничего не найдено</span>
                )}
              </div>
            </div>

            {/* Логика режима отбора тегов с подсказками */}
            <div className={styles.tagModeBox}>
              {filterState.tags.length === 0 && (
                <div className={styles.tagModeNotice}>
                  Выберите 2+ тега для настройки режима (хотя бы один / все теги)
                </div>
              )}

              {filterState.tags.length === 1 && (
                <div className={styles.tagModeNotice}>
                  Выбран 1 тег — режимы «Хотя бы один» и «Все теги» работают одинаково
                </div>
              )}

              {filterState.tags.length >= 2 && (
                <>
                  <div className={styles.tagModeRow}>
                    <button
                      className={`${styles.tagModeBtn}${filterState.tagMode === 'any' ? ` ${styles.tagModeActive}` : ''}`}
                      onClick={() => onChange({ ...filterState, tagMode: 'any' })}
                      type="button"
                    >
                      Хотя бы один
                    </button>
                    <button
                      className={`${styles.tagModeBtn}${filterState.tagMode === 'all' ? ` ${styles.tagModeActive}` : ''}`}
                      onClick={() => onChange({ ...filterState, tagMode: 'all' })}
                      type="button"
                    >
                      Все теги
                    </button>
                  </div>
                  <div className={styles.tagModeCaption}>
                    {filterState.tagMode === 'any'
                      ? 'Подходит игра с хотя бы одним из выбранных тегов'
                      : 'Должны совпасть все выбранные теги одновременно'}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Закреплённая нижняя секция параметров прямо над футером */}
      <div className={styles.paramsSection}>
        <span className={styles.sectionLabel}>Параметры</span>

        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={Boolean(filterState.favoritesFirst)}
            onChange={(e) => onChange({ ...filterState, favoritesFirst: e.target.checked })}
          />
          <span className={styles.checkLabel}>Избранные сначала</span>
        </label>

        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={filterState.onlyInstalled}
            onChange={(e) => onChange({ ...filterState, onlyInstalled: e.target.checked })}
          />
          <span className={styles.checkLabel}>Только установленные</span>
        </label>

        <label className={`${styles.checkRow} ${styles.recentRow}`}>
          <input
            type="checkbox"
            checked={filterState.excludeRecent}
            onChange={(e) => onChange({ ...filterState, excludeRecent: e.target.checked })}
          />
          <span className={styles.checkLabel}>Исключить недавние</span>
          {filterState.excludeRecent && (
            <>
              <input
                className={styles.daysInput}
                type="number"
                min={1}
                max={365}
                value={filterState.recentDays}
                onChange={(e) => onChange({ ...filterState, recentDays: Math.max(1, Number(e.target.value)) })}
                onClick={(e) => e.stopPropagation()}
              />
              <span className={styles.daysLabel}>дн.</span>
            </>
          )}
        </label>
      </div>

      {/* Фиксированный футер, синхронизированный по высоте с нижней панелью выбора */}
      <div className={styles.footer}>
        <span className={styles.count}>Подходит: {candidateCount} игр</span>
        <button className={styles.resetBtn} onClick={reset} type="button">
          <RotateCcw size={13} />
          <span>Сбросить фильтры</span>
        </button>
      </div>
    </div>
  )
}
