import React, { useState, useEffect } from 'react'
import { ImageOff, Pencil, Heart } from 'lucide-react'
import type { Game } from '../../types/electron'
import { Chip } from '../ui/Chip'
import { Toggle } from '../ui/Toggle'
import { resolveCoverUrl } from '../../utils/cover'
import styles from './GameRow.module.css'

interface GameRowProps {
  game: Game
  highlighted?: boolean
  showToggle?: boolean
  onToggle?: (id: string, value: boolean) => void
  onToggleFavorite?: (id: string, value: boolean) => void
  onEdit?: (game: Game) => void
  compact?: boolean
  matchesFilter?: boolean
}

function sourceLabel(game: Game): string {
  if (game.sources.length === 0) {
    return game.launchType === 'executable' ? 'Executable' : game.launchType
  }
  const primary = game.sources[0]
  const map: Record<string, string> = {
    steam: 'Steam',
    epic: 'Epic',
    gog: 'GOG',
    ea: 'EA',
    ubisoft: 'Ubisoft',
    executable: 'Executable',
    manual: 'Executable',
    shortcut: 'Ярлык',
  }
  return map[primary.sourceType] ?? primary.sourceType
}

export const GameRow: React.FC<GameRowProps> = ({
  game,
  highlighted = false,
  showToggle = false,
  onToggle,
  onToggleFavorite,
  onEdit,
  compact = false,
  matchesFilter = true,
}) => {
  const [imgError, setImgError] = useState(false)
  const [currentCover, setCurrentCover] = useState<string | undefined>(game.coverPath)
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => resolveCoverUrl(game.coverPath))

  useEffect(() => {
    setCurrentCover(game.coverPath)
    setImgError(false)

    if (game.coverPath) {
      setResolvedSrc(resolveCoverUrl(game.coverPath))
    } else {
      setResolvedSrc(null)
      window.electronAPI?.ensureGameCover?.(game.id)
        .then((path) => {
          if (path) {
            setCurrentCover(path)
            setResolvedSrc(resolveCoverUrl(path))
            setImgError(false)
          }
        })
        .catch(() => {})
    }
  }, [game.id, game.coverPath])

  const handleImgError = (): void => {
    if (currentCover && window.electronAPI?.getCoverDataUrl && !resolvedSrc?.startsWith('data:')) {
      window.electronAPI.getCoverDataUrl(currentCover)
        .then((dataUrl) => {
          if (dataUrl) {
            setResolvedSrc(dataUrl)
          } else {
            setImgError(true)
          }
        })
        .catch(() => setImgError(true))
    } else {
      setImgError(true)
    }
  }

  const showImg = resolvedSrc !== null && !imgError

  const allGenres = [...game.genres, ...game.userGenres]
  const allTags = [...game.tags, ...game.userTags]

  const isExcluded = !game.inRoulette
  const isFilterMismatch = game.inRoulette && matchesFilter === false
  const isFavorite = Boolean(game.isFavorite)

  const rowClass = [
    styles.row,
    isFavorite ? styles.isFavoriteGame : '',
    highlighted ? styles.highlighted : '',
    highlighted && isFavorite ? styles.favoriteHighlight : '',
    compact ? styles.compact : '',
    isExcluded ? styles.excluded : '',
    isFilterMismatch ? styles.filterMismatch : '',
  ].filter(Boolean).join(' ')

  const initialLetter = game.title.trim().charAt(0).toUpperCase()

  const handleCoverClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(game.id, !isFavorite)
  }

  const handleCoverKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onToggleFavorite?.(game.id, !isFavorite)
    }
  }

  const handleFavBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(game.id, !isFavorite)
  }

  return (
    <div className={rowClass}>
      {/* Interactive Cover area */}
      <div
        className={[
          styles.cover,
          isFavorite ? styles.coverFavorite : '',
        ].filter(Boolean).join(' ')}
        role="button"
        tabIndex={0}
        onClick={handleCoverClick}
        onKeyDown={handleCoverKeyDown}
        title={isFavorite ? 'Удалить из избранного (кликните по обложке)' : 'Добавить в избранное (кликните по обложке)'}
        aria-label={isFavorite ? `Удалить «${game.title}» из избранного` : `Добавить «${game.title}» в избранное`}
      >
        {showImg ? (
          <img
            className={styles.coverImg}
            src={resolvedSrc}
            alt={game.title}
            onError={handleImgError}
            loading="lazy"
          />
        ) : (
          <span className={styles.coverPlaceholder} title={game.title}>
            {initialLetter ? (
              <span style={{ fontSize: compact ? 12 : 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                {initialLetter}
              </span>
            ) : (
              <ImageOff size={compact ? 14 : 18} />
            )}
          </span>
        )}

        {/* Hover overlay: dims image and displays centered heart (completely hidden until hover) */}
        <div className={styles.coverHoverOverlay} aria-hidden="true">
          <Heart
            size={compact ? 16 : 22}
            className={styles.hoverHeart}
            fill={isFavorite ? '#ff4d4f' : 'transparent'}
            stroke={isFavorite ? '#ff4d4f' : '#ffffff'}
          />
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.titleRow}>
          <span className={styles.title}>{game.title}</span>
          <button
            type="button"
            className={`${styles.titleFavBtn} ${isFavorite ? styles.titleFavActive : ''}`}
            onClick={handleFavBtnClick}
            title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            aria-label={isFavorite ? `Удалить «${game.title}» из избранного` : `Добавить «${game.title}» в избранное`}
          >
            <Heart
              size={compact ? 13 : 15}
              fill={isFavorite ? '#ff4d4f' : 'transparent'}
              stroke={isFavorite ? '#ff4d4f' : 'currentColor'}
              className={styles.titleFavIcon}
            />
          </button>
          {isExcluded && (
            <span className={styles.statusBadgeExcluded} title="Исключена из рулетки пользователем вручную">
              Исключена из выбора
            </span>
          )}
          {isFilterMismatch && (
            <span className={styles.statusBadgeMismatch} title="Временно не подходит под условия фильтров справа">
              Не подходит под фильтры
            </span>
          )}
        </div>

        {!compact && allGenres.length > 0 && (
          <div className={styles.pills}>
            {allGenres.slice(0, 4).map((g) => (
              <Chip key={g} label={g} />
            ))}
          </div>
        )}

        {!compact && allTags.length > 0 && (
          <div className={styles.pills}>
            {allTags.slice(0, 5).map((t) => (
              <Chip key={t} label={t} color="default" />
            ))}
          </div>
        )}
      </div>

      <span className={styles.sourceBadge}>{sourceLabel(game)}</span>

      <div className={styles.actions}>
        {showToggle && (
          <Toggle
            checked={game.inRoulette}
            onChange={(v) => onToggle?.(game.id, v)}
          />
        )}
        {onEdit && (
          <button
            className={styles.editBtn}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(game)
            }}
            type="button"
            aria-label="Редактировать"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
